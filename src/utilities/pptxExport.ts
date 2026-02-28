import { TFile, App, FileSystemAdapter, Notice } from 'obsidian';
import { MarpSlidesSettings } from './settings';
import PptxGenJS from 'pptxgenjs';
import matter from 'gray-matter';

interface SlideElement {
    type: 'heading' | 'text' | 'bullet' | 'numbered' | 'image';
    content: string;
    level?: number; // heading level (1-3) or list indent
    src?: string;   // image source path
}

interface SlideData {
    elements: SlideElement[];
    directives: Record<string, string>;
}

interface FrontMatterData {
    theme?: string;
    paginate?: boolean | string;
    header?: string;
    footer?: string;
    backgroundColor?: string;
    backgroundImage?: string;
    color?: string;
}

export async function exportEditablePptx(file: TFile, app: App, settings: MarpSlidesSettings): Promise<void> {
    const markdown = await app.vault.read(file);
    const { data: frontMatter, content } = matter(markdown);
    const fm = frontMatter as FrontMatterData;
    const slides = parseSlides(content);

    const pptx = new PptxGenJS();
    pptx.layout = 'LAYOUT_WIDE'; // 16:9

    // Apply global settings from frontmatter
    const globalBgColor = fm.backgroundColor || undefined;
    const globalColor = fm.color || undefined;

    for (const slideData of slides) {
        const slide = pptx.addSlide();

        // Merge global + per-slide directives
        const bgColor = slideData.directives.backgroundColor || globalBgColor;
        const bgImage = slideData.directives.backgroundImage || fm.backgroundImage;
        const textColor = slideData.directives.color || globalColor;

        if (bgColor) {
            slide.background = { color: normalizeColor(bgColor) };
        }
        if (bgImage) {
            const urlMatch = bgImage.match(/url\(['"]?(.+?)['"]?\)/);
            if (urlMatch) {
                const imgPath = urlMatch[1];
                if (imgPath.startsWith('http')) {
                    slide.background = { path: imgPath };
                } else {
                    const imgData = await readLocalImageAsBase64(imgPath, file, app);
                    if (imgData) {
                        slide.background = { data: imgData };
                    }
                }
            }
        }

        // Add header/footer from frontmatter
        if (fm.header) {
            slide.addText(fm.header, {
                x: 0.5, y: 0.2, w: '90%', h: 0.4,
                fontSize: 10, color: textColor ? normalizeColor(textColor) : '666666',
                align: 'left',
            });
        }
        if (fm.footer) {
            slide.addText(fm.footer, {
                x: 0.5, y: 7.0, w: '90%', h: 0.4,
                fontSize: 10, color: textColor ? normalizeColor(textColor) : '666666',
                align: 'left',
            });
        }

        // Layout elements on the slide
        let yPos = fm.header ? 0.8 : 0.5;
        const maxY = fm.footer ? 6.8 : 7.2;

        for (const el of slideData.elements) {
            if (yPos >= maxY) break;

            switch (el.type) {
                case 'heading': {
                    const fontSize = el.level === 1 ? 36 : el.level === 2 ? 28 : 22;
                    const height = el.level === 1 ? 1.2 : 0.9;
                    slide.addText(el.content, {
                        x: 0.5, y: yPos, w: '90%', h: height,
                        fontSize,
                        bold: true,
                        color: textColor ? normalizeColor(textColor) : '333333',
                        align: 'left',
                        valign: 'middle',
                    });
                    yPos += height + 0.2;
                    break;
                }
                case 'text': {
                    slide.addText(el.content, {
                        x: 0.5, y: yPos, w: '90%', h: 0.6,
                        fontSize: 18,
                        color: textColor ? normalizeColor(textColor) : '333333',
                        align: 'left',
                    });
                    yPos += 0.7;
                    break;
                }
                case 'bullet':
                case 'numbered': {
                    slide.addText(el.content, {
                        x: 0.8, y: yPos, w: '85%', h: 0.5,
                        fontSize: 16,
                        color: textColor ? normalizeColor(textColor) : '333333',
                        align: 'left',
                        bullet: el.type === 'bullet' ? true : { type: 'number' },
                        indentLevel: (el.level || 1) - 1,
                    });
                    yPos += 0.5;
                    break;
                }
                case 'image': {
                    if (el.src) {
                        const remainingH = Math.min(3.5, maxY - yPos);
                        if (el.src.startsWith('http')) {
                            slide.addImage({
                                path: el.src,
                                x: 0.5, y: yPos, w: 5, h: remainingH,
                                sizing: { type: 'contain', w: 5, h: remainingH },
                            });
                        } else {
                            const imgData = await readLocalImageAsBase64(el.src, file, app);
                            if (imgData) {
                                slide.addImage({
                                    data: imgData,
                                    x: 0.5, y: yPos, w: 5, h: remainingH,
                                    sizing: { type: 'contain', w: 5, h: remainingH },
                                });
                            }
                        }
                        yPos += remainingH + 0.2;
                    }
                    break;
                }
            }
        }
    }

    // Generate and save
    const blob = await pptx.write({ outputType: 'blob' }) as Blob;
    const arrayBuffer = await blob.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);

    // Determine output path
    let outputPath: string;
    if (settings.EXPORT_PATH) {
        const fs = require('fs');
        const fullPath = `${settings.EXPORT_PATH}${file.basename}.pptx`;
        fs.writeFileSync(fullPath, Buffer.from(uint8));
        new Notice(`Editable PPTX exported to: ${fullPath}`);
        return;
    }

    // Save in vault next to the source file
    const dir = file.parent ? file.parent.path : '';
    outputPath = dir ? `${dir}/${file.basename}.pptx` : `${file.basename}.pptx`;

    const existing = app.vault.getAbstractFileByPath(outputPath);
    if (existing instanceof TFile) {
        await app.vault.modifyBinary(existing, uint8);
    } else {
        await app.vault.createBinary(outputPath, uint8);
    }
    new Notice(`Editable PPTX exported: ${outputPath}`);
}

/**
 * Split markdown into slides, respecting code blocks
 */
function parseSlides(content: string): SlideData[] {
    const lines = content.split('\n');
    const slides: SlideData[] = [];
    let currentLines: string[] = [];
    let inCodeBlock = false;

    for (const line of lines) {
        const trimmed = line.trim();

        if (trimmed.startsWith('```') || trimmed.startsWith('~~~')) {
            inCodeBlock = !inCodeBlock;
            currentLines.push(line);
            continue;
        }

        if (!inCodeBlock && trimmed === '---') {
            // Slide separator
            if (currentLines.length > 0 || slides.length === 0) {
                slides.push(parseSlideContent(currentLines));
            }
            currentLines = [];
            continue;
        }

        currentLines.push(line);
    }

    // Last slide
    if (currentLines.length > 0) {
        slides.push(parseSlideContent(currentLines));
    }

    // Ensure at least one slide
    if (slides.length === 0) {
        slides.push({ elements: [], directives: {} });
    }

    return slides;
}

/**
 * Parse a single slide's content into elements
 */
function parseSlideContent(lines: string[]): SlideData {
    const elements: SlideElement[] = [];
    const directives: Record<string, string> = {};
    let inCodeBlock = false;
    let codeLines: string[] = [];

    for (const line of lines) {
        const trimmed = line.trim();

        // Code block tracking
        if (trimmed.startsWith('```') || trimmed.startsWith('~~~')) {
            if (inCodeBlock) {
                // End code block - add as text
                if (codeLines.length > 0) {
                    elements.push({ type: 'text', content: codeLines.join('\n') });
                    codeLines = [];
                }
            }
            inCodeBlock = !inCodeBlock;
            continue;
        }
        if (inCodeBlock) {
            codeLines.push(line);
            continue;
        }

        // Skip empty lines
        if (!trimmed) continue;

        // Marp directives in HTML comments
        const directiveMatch = trimmed.match(/^<!--\s*(backgroundColor|backgroundImage|color)\s*:\s*(.+?)\s*-->$/);
        if (directiveMatch) {
            directives[directiveMatch[1]] = directiveMatch[2];
            continue;
        }

        // Skip other HTML comments
        if (trimmed.startsWith('<!--') && trimmed.endsWith('-->')) continue;

        // Headings
        const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)$/);
        if (headingMatch) {
            elements.push({
                type: 'heading',
                content: stripInlineMarkdown(headingMatch[2]),
                level: headingMatch[1].length,
            });
            continue;
        }

        // Images
        const imageMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
        if (imageMatch) {
            elements.push({
                type: 'image',
                content: imageMatch[1] || '',
                src: imageMatch[2],
            });
            continue;
        }

        // Bullet list
        const bulletMatch = trimmed.match(/^([\s]*)[-*]\s+(.+)$/);
        if (bulletMatch) {
            const indent = Math.floor(line.search(/\S/) / 2) + 1;
            elements.push({
                type: 'bullet',
                content: stripInlineMarkdown(bulletMatch[2]),
                level: indent,
            });
            continue;
        }

        // Numbered list
        const numberedMatch = trimmed.match(/^([\s]*)\d+\.\s+(.+)$/);
        if (numberedMatch) {
            const indent = Math.floor(line.search(/\S/) / 2) + 1;
            elements.push({
                type: 'numbered',
                content: stripInlineMarkdown(numberedMatch[2]),
                level: indent,
            });
            continue;
        }

        // Regular text (skip Marp directives in non-comment form like _class, etc.)
        if (!trimmed.startsWith('_') || !trimmed.includes(':')) {
            elements.push({
                type: 'text',
                content: stripInlineMarkdown(trimmed),
            });
        }
    }

    return { elements, directives };
}

/**
 * Strip basic inline markdown formatting
 */
function stripInlineMarkdown(text: string): string {
    return text
        .replace(/\*\*(.+?)\*\*/g, '$1')   // bold
        .replace(/__(.+?)__/g, '$1')        // bold
        .replace(/\*(.+?)\*/g, '$1')        // italic
        .replace(/_(.+?)_/g, '$1')          // italic
        .replace(/~~(.+?)~~/g, '$1')        // strikethrough
        .replace(/`(.+?)`/g, '$1')          // inline code
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1'); // links
}

/**
 * Normalize CSS color to hex without '#'
 */
function normalizeColor(color: string): string {
    color = color.trim();
    if (color.startsWith('#')) {
        return color.substring(1);
    }
    // Named colors mapping (common ones)
    const colors: Record<string, string> = {
        white: 'FFFFFF', black: '000000', red: 'FF0000',
        green: '008000', blue: '0000FF', yellow: 'FFFF00',
        gray: '808080', grey: '808080', orange: 'FFA500',
        purple: '800080', navy: '000080', teal: '008080',
        maroon: '800000',
    };
    return colors[color.toLowerCase()] || color;
}

/**
 * Read a local image file as base64 data URI
 */
async function readLocalImageAsBase64(src: string, contextFile: TFile, app: App): Promise<string | null> {
    try {
        // Resolve relative to the file's directory
        let imagePath = src;
        if (!src.startsWith('/') && contextFile.parent) {
            imagePath = `${contextFile.parent.path}/${src}`;
        } else if (src.startsWith('/')) {
            imagePath = src.substring(1);
        }

        const imageFile = app.vault.getAbstractFileByPath(imagePath);
        if (imageFile instanceof TFile) {
            const data = await app.vault.readBinary(imageFile);
            const uint8 = new Uint8Array(data);
            const base64 = arrayBufferToBase64(uint8);
            const ext = imageFile.extension.toLowerCase();
            const mime = ext === 'png' ? 'image/png'
                : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg'
                : ext === 'gif' ? 'image/gif'
                : ext === 'svg' ? 'image/svg+xml'
                : 'image/png';
            return `data:${mime};base64,${base64}`;
        }
        return null;
    } catch {
        return null;
    }
}

function arrayBufferToBase64(buffer: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < buffer.byteLength; i++) {
        binary += String.fromCharCode(buffer[i]);
    }
    return btoa(binary);
}

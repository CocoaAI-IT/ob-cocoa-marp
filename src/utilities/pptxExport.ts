import { TFile, App, Notice, requestUrl } from 'obsidian';
import { MarpSlidesSettings } from './settings';
import PptxGenJS from 'pptxgenjs';
import matter from 'gray-matter';

// ---- Types ----

interface SlideData {
    content: string;
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

interface ThemeColors {
    background: string;
    text: string;
    heading1: string;
    heading2: string;
    muted: string;
    codeBg: string;
    codeText: string;
}

type MarkdownElement =
    | { type: 'h1' | 'h2' | 'h3'; text: string }
    | { type: 'bullet' | 'ordered'; items: string[] }
    | { type: 'paragraph'; text: string }
    | { type: 'code'; text: string }
    | { type: 'image'; alt: string; src: string };

// ---- Font Settings (constants, no UI) ----

const FONT_HEADING = 'Meiryo UI';
const FONT_BODY = 'Meiryo UI';
const FONT_CODE = 'Courier New';
const FONT_NUMBER = 'Arial';

// ---- Theme Colors ----

function getThemeColors(theme: string | undefined): ThemeColors {
    const themes: Record<string, ThemeColors> = {
        default: {
            background: '#ffffff', text: '#333333',
            heading1: '#1a1a2e', heading2: '#1a73e8',
            muted: '#aaaaaa', codeBg: '#f5f5f5', codeText: '#c7254e',
        },
        corporate: {
            background: '#f8f9fa', text: '#212121',
            heading1: '#1a237e', heading2: '#3949ab',
            muted: '#757575', codeBg: '#e8eaf6', codeText: '#1a237e',
        },
        dark: {
            background: '#1e1e2e', text: '#cdd6f4',
            heading1: '#b4befe', heading2: '#89b4fa',
            muted: '#6c7086', codeBg: '#313244', codeText: '#a6e3a1',
        },
        enterprise: {
            background: '#fafafa', text: '#2d2d2d',
            heading1: '#0d47a1', heading2: '#1565c0',
            muted: '#9e9e9e', codeBg: '#eceff1', codeText: '#bf360c',
        },
    };
    return themes[theme ?? ''] ?? themes['default'];
}

// ---- Inline Formatting Parser ----

interface InlineToken {
    type: 'text' | 'bold' | 'italic' | 'bolditalic' | 'code' | 'strike';
    content: string;
}

function tokenizeInline(text: string): InlineToken[] {
    const tokens: InlineToken[] = [];
    let remaining = text;

    while (remaining.length > 0) {
        // Bold+Italic: ***text***
        let match = remaining.match(/^\*\*\*(.+?)\*\*\*/);
        if (match) {
            tokens.push({ type: 'bolditalic', content: match[1] });
            remaining = remaining.slice(match[0].length);
            continue;
        }

        // Bold: **text**
        match = remaining.match(/^\*\*(.+?)\*\*/);
        if (match) {
            tokens.push({ type: 'bold', content: match[1] });
            remaining = remaining.slice(match[0].length);
            continue;
        }

        // Italic: *text*
        match = remaining.match(/^\*(.+?)\*/);
        if (match) {
            tokens.push({ type: 'italic', content: match[1] });
            remaining = remaining.slice(match[0].length);
            continue;
        }

        // Strikethrough: ~~text~~
        match = remaining.match(/^~~(.+?)~~/);
        if (match) {
            tokens.push({ type: 'strike', content: match[1] });
            remaining = remaining.slice(match[0].length);
            continue;
        }

        // Inline code: `text`
        match = remaining.match(/^`(.+?)`/);
        if (match) {
            tokens.push({ type: 'code', content: match[1] });
            remaining = remaining.slice(match[0].length);
            continue;
        }

        // Link: [text](url) → extract text only
        match = remaining.match(/^\[([^\]]+)\]\([^)]+\)/);
        if (match) {
            tokens.push({ type: 'text', content: match[1] });
            remaining = remaining.slice(match[0].length);
            continue;
        }

        // Plain text: consume up to next special character
        match = remaining.match(/^([\s\S]+?)(?=\*|~~|`|\[|$)/);
        if (match && match[1]) {
            tokens.push({ type: 'text', content: match[1] });
            remaining = remaining.slice(match[1].length);
            continue;
        }

        // Fallback: consume one character
        tokens.push({ type: 'text', content: remaining[0] });
        remaining = remaining.slice(1);
    }

    return tokens;
}

/**
 * Split text so that digit runs use a separate font (for better readability with Japanese fonts)
 */
function splitNumberFont(text: string, baseProps: PptxGenJS.TextPropsOptions): PptxGenJS.TextProps[] {
    const parts: PptxGenJS.TextProps[] = [];
    const regex = /(\d+[\d,.]*)/g;
    let lastIndex = 0;
    let m: RegExpExecArray | null;

    while ((m = regex.exec(text)) !== null) {
        if (m.index > lastIndex) {
            parts.push({ text: text.slice(lastIndex, m.index), options: { ...baseProps } });
        }
        parts.push({ text: m[0], options: { ...baseProps, fontFace: FONT_NUMBER } });
        lastIndex = regex.lastIndex;
    }
    if (lastIndex < text.length) {
        parts.push({ text: text.slice(lastIndex), options: { ...baseProps } });
    }

    return parts.length > 0 ? parts : [{ text, options: { ...baseProps } }];
}

/**
 * Convert inline-formatted markdown text to PptxGenJS TextProps[]
 */
function parseInlineFormatting(
    text: string,
    baseColor: string,
    baseFontFace: string,
    baseFontSize: number,
    codeTextColor: string,
    codeBgColor?: string,
): PptxGenJS.TextProps[] {
    const tokens = tokenizeInline(text);
    const result: PptxGenJS.TextProps[] = [];

    for (const token of tokens) {
        const baseProps: PptxGenJS.TextPropsOptions = {
            fontSize: baseFontSize,
            fontFace: baseFontFace,
            color: baseColor,
        };

        switch (token.type) {
            case 'bold':
                baseProps.bold = true;
                result.push(...splitNumberFont(token.content, baseProps));
                break;
            case 'italic':
                baseProps.italic = true;
                result.push(...splitNumberFont(token.content, baseProps));
                break;
            case 'bolditalic':
                baseProps.bold = true;
                baseProps.italic = true;
                result.push(...splitNumberFont(token.content, baseProps));
                break;
            case 'strike':
                baseProps.strike = 'sngStrike';
                result.push(...splitNumberFont(token.content, baseProps));
                break;
            case 'code':
                result.push({
                    text: token.content,
                    options: {
                        fontSize: baseFontSize - 1,
                        fontFace: FONT_CODE,
                        color: codeTextColor,
                    },
                });
                break;
            case 'text':
            default:
                result.push(...splitNumberFont(token.content, baseProps));
                break;
        }
    }

    return result;
}

// ---- Markdown Element Parser ----

function parseMarkdownElements(markdown: string): MarkdownElement[] {
    const lines = markdown.split('\n');
    const elements: MarkdownElement[] = [];
    let i = 0;

    while (i < lines.length) {
        const line = lines[i];
        const trimmed = line.trim();

        // Skip empty lines
        if (!trimmed) { i++; continue; }

        // Skip HTML comment directives (handled separately)
        if (trimmed.startsWith('<!--') && trimmed.endsWith('-->')) { i++; continue; }

        // Skip Marp directives in non-comment form
        if (trimmed.startsWith('_') && trimmed.includes(':')) { i++; continue; }

        // Headings
        if (trimmed.startsWith('# ')) { elements.push({ type: 'h1', text: trimmed.slice(2).trim() }); i++; continue; }
        if (trimmed.startsWith('## ')) { elements.push({ type: 'h2', text: trimmed.slice(3).trim() }); i++; continue; }
        if (trimmed.startsWith('### ')) { elements.push({ type: 'h3', text: trimmed.slice(4).trim() }); i++; continue; }

        // Code blocks
        if (trimmed.startsWith('```') || trimmed.startsWith('~~~')) {
            const fence = trimmed.startsWith('```') ? '```' : '~~~';
            const codeLines: string[] = [];
            i++;
            while (i < lines.length && !lines[i].trim().startsWith(fence)) {
                codeLines.push(lines[i]);
                i++;
            }
            elements.push({ type: 'code', text: codeLines.join('\n') });
            i++; // skip closing fence
            continue;
        }

        // Images
        const imageMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
        if (imageMatch) {
            elements.push({ type: 'image', alt: imageMatch[1] || '', src: imageMatch[2] });
            i++;
            continue;
        }

        // Bullet list — group consecutive items
        if (/^[-*+]\s/.test(trimmed)) {
            const items: string[] = [];
            while (i < lines.length && /^[-*+]\s/.test(lines[i].trim())) {
                items.push(lines[i].trim().replace(/^[-*+]\s+/, ''));
                i++;
            }
            elements.push({ type: 'bullet', items });
            continue;
        }

        // Ordered list — group consecutive items
        if (/^\d+\.\s/.test(trimmed)) {
            const items: string[] = [];
            while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
                items.push(lines[i].trim().replace(/^\d+\.\s+/, ''));
                i++;
            }
            elements.push({ type: 'ordered', items });
            continue;
        }

        // Paragraph
        elements.push({ type: 'paragraph', text: trimmed });
        i++;
    }

    return elements;
}

// ---- Slide Content Renderer ----

async function renderContent(
    pptSlide: PptxGenJS.Slide,
    markdown: string,
    startY: number,
    maxY: number,
    W: number,
    theme: ThemeColors,
    textColor: string,
    contextFile: TFile,
    app: App,
): Promise<void> {
    const elements = parseMarkdownElements(markdown);
    let y = startY;
    const MARGIN = 0.5;
    const contentW = W - MARGIN * 2;
    const codeTextColor = theme.codeText.replace('#', '');

    for (const el of elements) {
        if (y >= maxY) break;

        switch (el.type) {
            case 'h1': {
                const runs = parseInlineFormatting(
                    el.text, theme.heading1.replace('#', ''), FONT_HEADING, 32, codeTextColor,
                );
                // Ensure all runs are bold for headings
                for (const r of runs) {
                    if (r.options) r.options.bold = true;
                }
                pptSlide.addText(runs, {
                    x: MARGIN, y, w: contentW, h: 0.8,
                    fontFace: FONT_HEADING,
                });
                y += 0.9;
                break;
            }
            case 'h2': {
                const runs = parseInlineFormatting(
                    el.text, theme.heading2.replace('#', ''), FONT_HEADING, 24, codeTextColor,
                );
                for (const r of runs) {
                    if (r.options) r.options.bold = true;
                }
                pptSlide.addText(runs, {
                    x: MARGIN, y, w: contentW, h: 0.6,
                    fontFace: FONT_HEADING,
                });
                y += 0.7;
                break;
            }
            case 'h3': {
                const runs = parseInlineFormatting(
                    el.text, textColor, FONT_HEADING, 18, codeTextColor,
                );
                for (const r of runs) {
                    if (r.options) r.options.bold = true;
                }
                pptSlide.addText(runs, {
                    x: MARGIN, y, w: contentW, h: 0.45,
                    fontFace: FONT_HEADING,
                });
                y += 0.55;
                break;
            }
            case 'bullet':
            case 'ordered': {
                const rows: PptxGenJS.TextProps[] = [];
                for (let idx = 0; idx < el.items.length; idx++) {
                    const prefix = el.type === 'ordered' ? `${idx + 1}. ` : '\u2022 ';
                    const itemRuns = parseInlineFormatting(
                        el.items[idx], textColor, FONT_BODY, 16, codeTextColor,
                    );
                    // Prepend prefix to first run
                    if (itemRuns.length > 0 && itemRuns[0].text !== undefined) {
                        itemRuns[0].text = prefix + itemRuns[0].text;
                    } else {
                        itemRuns.unshift({ text: prefix, options: { fontSize: 16, fontFace: FONT_BODY, color: textColor } });
                    }
                    // Add breakLine to last run of each item (except the last item)
                    if (idx < el.items.length - 1) {
                        const lastRun = itemRuns[itemRuns.length - 1];
                        if (lastRun.options) {
                            lastRun.options.breakLine = true;
                        }
                    }
                    rows.push(...itemRuns);
                }
                const blockH = Math.min(el.items.length * 0.35, maxY - y);
                pptSlide.addText(rows, {
                    x: MARGIN, y, w: contentW, h: blockH,
                    valign: 'top',
                    fontFace: FONT_BODY,
                });
                y += blockH + 0.1;
                break;
            }
            case 'code': {
                const codeLines = el.text.split('\n').length;
                const blockH = Math.min(codeLines * 0.28 + 0.3, maxY - y);
                pptSlide.addText(el.text, {
                    x: MARGIN, y, w: contentW, h: blockH,
                    fontSize: 12,
                    fontFace: FONT_CODE,
                    fill: { color: theme.codeBg.replace('#', '') },
                    color: codeTextColor,
                    valign: 'top',
                });
                y += blockH + 0.1;
                break;
            }
            case 'image': {
                const remainingH = Math.min(3.5, maxY - y);
                const imgData = await resolveImageAsBase64(el.src, contextFile, app);
                if (imgData) {
                    pptSlide.addImage({
                        data: imgData,
                        x: MARGIN, y, w: 5, h: remainingH,
                        sizing: { type: 'contain', w: 5, h: remainingH },
                    });
                }
                y += remainingH + 0.2;
                break;
            }
            case 'paragraph': {
                const runs = parseInlineFormatting(
                    el.text, textColor, FONT_BODY, 16, codeTextColor,
                );
                pptSlide.addText(runs, {
                    x: MARGIN, y, w: contentW, h: 0.4,
                    fontFace: FONT_BODY,
                    wrap: true,
                });
                y += 0.5;
                break;
            }
        }
    }
}

// ---- Slide Splitter ----

/**
 * Split markdown into slides by `---` separator, respecting code blocks.
 * Extracts per-slide directives from HTML comments.
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
            if (currentLines.length > 0) {
                slides.push(buildSlideData(currentLines));
            }
            currentLines = [];
            continue;
        }

        currentLines.push(line);
    }

    if (currentLines.length > 0) {
        slides.push(buildSlideData(currentLines));
    }

    if (slides.length === 0) {
        slides.push({ content: '', directives: {} });
    }

    // Filter out empty slides (no meaningful content and no directives)
    return slides.filter(slide => hasSlideContent(slide));
}

/**
 * Check if a slide has any meaningful content or directives worth rendering.
 */
function hasSlideContent(slide: SlideData): boolean {
    if (Object.keys(slide.directives).length > 0) {
        return true;
    }
    // Check if content has anything beyond whitespace and HTML comments
    const stripped = slide.content
        .replace(/<!--.*?-->/gs, '')  // remove HTML comments
        .trim();
    return stripped.length > 0;
}

/**
 * Extract directives from lines and return remaining content
 */
function buildSlideData(lines: string[]): SlideData {
    const directives: Record<string, string> = {};
    const contentLines: string[] = [];

    for (const line of lines) {
        const trimmed = line.trim();
        const directiveMatch = trimmed.match(/^<!--\s*(backgroundColor|backgroundImage|color|header|footer|paginate)\s*:\s*(.+?)\s*-->$/);
        if (directiveMatch) {
            directives[directiveMatch[1]] = directiveMatch[2];
        }
        // Keep all lines in content (parseMarkdownElements will skip comments)
        contentLines.push(line);
    }

    return { content: contentLines.join('\n'), directives };
}

// ---- Main Export Function ----

export async function exportEditablePptx(file: TFile, app: App, settings: MarpSlidesSettings): Promise<void> {
    const markdown = await app.vault.read(file);
    const { data: frontMatter, content } = matter(markdown);
    const fm = frontMatter as FrontMatterData;
    const slides = parseSlides(content);

    const theme = getThemeColors(fm.theme);
    const W = 13.33; // 16:9 LAYOUT_WIDE width in inches

    const pptx = new PptxGenJS();
    pptx.layout = 'LAYOUT_WIDE'; // 16:9

    const globalBgColor = fm.backgroundColor || undefined;
    const globalColor = fm.color || undefined;
    const globalHeader = fm.header || undefined;
    const globalFooter = fm.footer || undefined;
    const globalPaginate = fm.paginate === true || fm.paginate === 'true';

    for (let slideIdx = 0; slideIdx < slides.length; slideIdx++) {
        const slideData = slides[slideIdx];
        const slide = pptx.addSlide();

        // Merge global + per-slide directives
        const bgColor = slideData.directives.backgroundColor || globalBgColor || theme.background;
        const bgImage = slideData.directives.backgroundImage || fm.backgroundImage;
        const textColor = normalizeColor(slideData.directives.color || globalColor || theme.text);

        // Background
        slide.background = { color: normalizeColor(bgColor) };
        if (bgImage) {
            const urlMatch = bgImage.match(/url\(['"]?(.+?)['"]?\)/);
            if (urlMatch) {
                const imgData = await resolveImageAsBase64(urlMatch[1], file, app);
                if (imgData) {
                    slide.background = { data: imgData };
                }
            }
        }

        // Header
        const headerText = slideData.directives.header || globalHeader;
        if (headerText) {
            slide.addText(headerText, {
                x: 0.3, y: 0.05, w: W - 0.6, h: 0.25,
                fontSize: 10, fontFace: FONT_BODY,
                color: theme.muted.replace('#', ''), align: 'left',
            });
        }

        // Content area
        const topY = headerText ? 0.4 : 0.3;
        const bottomY = 7.0;
        await renderContent(slide, slideData.content, topY, bottomY, W, theme, textColor, file, app);

        // Footer
        const footerText = slideData.directives.footer || globalFooter;
        if (footerText) {
            slide.addText(footerText, {
                x: 0.3, y: 7.2, w: W - 1.0, h: 0.2,
                fontSize: 10, fontFace: FONT_BODY,
                color: theme.muted.replace('#', ''), align: 'left',
            });
        }

        // Page number
        const paginate = slideData.directives.paginate === 'true' || (!slideData.directives.paginate && globalPaginate);
        if (paginate) {
            slide.addText(String(slideIdx + 1), {
                x: W - 0.6, y: 7.2, w: 0.5, h: 0.2,
                fontSize: 10, fontFace: FONT_BODY,
                color: theme.muted.replace('#', ''), align: 'right',
            });
        }
    }

    // Generate and save
    const blob = await pptx.write({ outputType: 'blob' }) as Blob;
    const arrayBuffer = await blob.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);

    // Determine output path
    if (settings.EXPORT_PATH) {
        const fs = require('fs');
        const fullPath = `${settings.EXPORT_PATH}${file.basename}.pptx`;
        fs.writeFileSync(fullPath, Buffer.from(uint8));
        new Notice(`Editable PPTX exported to: ${fullPath}`);
        return;
    }

    // Save in vault next to the source file
    const dir = file.parent ? file.parent.path : '';
    const outputPath = dir ? `${dir}/${file.basename}.pptx` : `${file.basename}.pptx`;

    const existing = app.vault.getAbstractFileByPath(outputPath);
    if (existing instanceof TFile) {
        await app.vault.modifyBinary(existing, uint8);
    } else {
        await app.vault.createBinary(outputPath, uint8);
    }
    new Notice(`Editable PPTX exported: ${outputPath}`);
}

// ---- Color Utilities ----

function normalizeColor(color: string): string {
    color = color.trim();
    if (color.startsWith('#')) {
        return color.substring(1);
    }
    const colors: Record<string, string> = {
        white: 'FFFFFF', black: '000000', red: 'FF0000',
        green: '008000', blue: '0000FF', yellow: 'FFFF00',
        gray: '808080', grey: '808080', orange: 'FFA500',
        purple: '800080', navy: '000080', teal: '008080',
        maroon: '800000',
    };
    return colors[color.toLowerCase()] || color;
}

// ---- Image Utilities (preserved from original) ----

async function resolveImageAsBase64(src: string, contextFile: TFile, app: App): Promise<string | null> {
    if (src.startsWith('http://') || src.startsWith('https://')) {
        return await fetchRemoteImageAsBase64(src);
    }
    return await readLocalImageAsBase64(src, contextFile, app);
}

async function fetchRemoteImageAsBase64(url: string): Promise<string | null> {
    try {
        const response = await requestUrl({ url });
        const uint8 = new Uint8Array(response.arrayBuffer);
        const base64 = arrayBufferToBase64(uint8);
        const mime = guessMimeFromUrl(url) || response.headers['content-type'] || 'image/png';
        return `data:${mime};base64,${base64}`;
    } catch (e) {
        console.warn(`Failed to fetch remote image: ${url}`, e);
        return null;
    }
}

async function readLocalImageAsBase64(src: string, contextFile: TFile, app: App): Promise<string | null> {
    try {
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
            const mime = extToMime(ext);
            return `data:${mime};base64,${base64}`;
        }
        return null;
    } catch {
        return null;
    }
}

function guessMimeFromUrl(url: string): string | null {
    const ext = url.split('?')[0].split('.').pop()?.toLowerCase();
    return ext ? extToMime(ext) : null;
}

function extToMime(ext: string): string {
    switch (ext) {
        case 'png': return 'image/png';
        case 'jpg': case 'jpeg': return 'image/jpeg';
        case 'gif': return 'image/gif';
        case 'svg': return 'image/svg+xml';
        case 'webp': return 'image/webp';
        default: return 'image/png';
    }
}

function arrayBufferToBase64(buffer: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < buffer.byteLength; i++) {
        binary += String.fromCharCode(buffer[i]);
    }
    return btoa(binary);
}

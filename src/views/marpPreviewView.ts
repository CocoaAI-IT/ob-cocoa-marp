import { ItemView, WorkspaceLeaf, MarkdownView, TFile, setIcon } from 'obsidian';
import { Marp } from '@marp-team/marp-core'
import { browser, type MarpCoreBrowser } from '@marp-team/marp-core/browser'

import { MarpSlidesSettings } from '../utilities/settings'
import { MarpExport } from '../utilities/marpExport';
import { MarpPresentationView } from './marpPresentationView';
import { PresentationController } from './presentationController';
import { PresentationModalResult } from './presentationModal';
import { MarpPresenterNotesView, MARP_PRESENTER_NOTES_VIEW } from './marpPresenterNotesView';
import { FilePath } from '../utilities/filePath'
import { ThemeLoader } from '../utilities/themeLoader'
import { MathOptions } from '@marp-team/marp-core/types/src/math/math';

const markdownItContainer = require('markdown-it-container');
const markdownItMark = require('markdown-it-mark');
const markdownItKroki = require('@kazumatu981/markdown-it-kroki');

export const MARP_PREVIEW_VIEW = 'marp-presenter-preview-view';

export class MarpPreviewView extends ItemView  {
    private marp: Marp;

    private marpBrowser: MarpCoreBrowser | undefined;
    private settings : MarpSlidesSettings;

    private file : TFile;
    private themesLoaded: Promise<void>;
    private slideContentEl: HTMLDivElement;
    private toolbarEl: HTMLDivElement;

    constructor(settings: MarpSlidesSettings, leaf: WorkspaceLeaf) {
        super(leaf);

        this.settings = settings;

        this.marp = new Marp({
            container: { tag: 'div', id: '__marp-vscode' },
            slideContainer: { tag: 'div', 'data-marp-vscode-slide-wrapper': '' },
            html: this.settings.EnableHTML,
            inlineSVG: {
                enabled: true,
                backdropSelector: false
            },
            math: this.settings.MathTypesettings as MathOptions,
            minifyCSS: true,
            script: false
          });

        if (this.settings.EnableMarkdownItPlugins){
          this.marp
            .use(markdownItContainer, "container")
            .use(markdownItMark)
            .use(markdownItKroki,{entrypoint: "https://kroki.io"});
        }
    }

    getViewType() {
        return MARP_PREVIEW_VIEW;
    }

    getDisplayText() {
        return "Deck Preview";
    }

    async onOpen() {
        const container = this.containerEl.children[1] as HTMLElement;
        container.empty();
        container.style.display = 'flex';
        container.style.flexDirection = 'column';

        // Create toolbar
        this.toolbarEl = container.createDiv({ cls: 'marp-preview-toolbar' });
        this.createToolbarButtons();

        // Create content area
        this.slideContentEl = container.createDiv({ cls: 'marp-preview-content' });

        try {
            this.marpBrowser = browser(this.slideContentEl);
        } catch {
            // CustomElementRegistry re-registration; render without browser
        }

        this.themesLoaded = ThemeLoader.loadThemes(this.marp, this.settings, this.app);
        await this.themesLoaded;

        this.addActions();
    }

    async onClose() {
        // Nothing to clean up.
    }

    async onChange(view : MarkdownView) {
        this.displaySlides(view);
    }

    async onLineChanged(line: number) {
        const slides = this.slideContentEl.querySelectorAll('[data-marp-vscode-slide-wrapper]');
        if (line >= 0 && line < slides.length) {
            slides[line].scrollIntoView({ block: 'start' });
        }
    }

    async addActions() {
        const marpCli = new MarpExport(this.settings, this.app);

        this.addAction('image', 'Export as PNG', () => {
            if (this.file) {
                marpCli.export(this.file, 'png');
            }
        });

        this.addAction('code-glyph', 'Export as HTML', () => {
            if (this.file) {
                marpCli.export(this.file, 'html');
            }
        });

        this.addAction('slides-marp-export-pdf', 'Export as PDF', () => {
            if (this.file) {
                marpCli.export(this.file, 'pdf');
            }
        });

        this.addAction('slides-marp-export-pptx', 'Export as PPTX', () => {
            if (this.file) {
                marpCli.export(this.file, 'pptx');
            }
        });

        this.addAction('slides-marp-slide-present', 'Preview Slides', () => {
            if (this.file) {
                marpCli.export(this.file, 'preview');
            }
        });
      }

    private createToolbarButtons() {
        const marpCli = new MarpExport(this.settings, this.app);

        // Present button
        const presentBtn = this.toolbarEl.createEl('button', {
            cls: 'marp-toolbar-btn',
            attr: { 'aria-label': 'Start Presentation' }
        });
        const presentIcon = presentBtn.createSpan({ cls: 'marp-toolbar-btn-icon' });
        setIcon(presentIcon, 'play');
        presentBtn.createSpan({ cls: 'marp-toolbar-btn-label', text: 'Present' });
        presentBtn.addEventListener('click', () => this.startPresentation());

        // PPTX (image) button - marp-cli version
        const pptxBtn = this.toolbarEl.createEl('button', {
            cls: 'marp-toolbar-btn',
            attr: { 'aria-label': 'Export PPTX (image-based, high quality)' }
        });
        const pptxIcon = pptxBtn.createSpan({ cls: 'marp-toolbar-btn-icon' });
        setIcon(pptxIcon, 'download');
        pptxBtn.createSpan({ cls: 'marp-toolbar-btn-label', text: 'PPTX' });
        pptxBtn.addEventListener('click', () => {
            if (this.file) {
                marpCli.export(this.file, 'pptx');
            }
        });

        // PPTX Edit button - pptxgenjs version
        const pptxEditBtn = this.toolbarEl.createEl('button', {
            cls: 'marp-toolbar-btn',
            attr: { 'aria-label': 'Export editable PPTX (text selectable)' }
        });
        const editIcon = pptxEditBtn.createSpan({ cls: 'marp-toolbar-btn-icon' });
        setIcon(editIcon, 'file-edit');
        pptxEditBtn.createSpan({ cls: 'marp-toolbar-btn-label', text: 'PPTX Edit' });
        pptxEditBtn.addEventListener('click', () => {
            if (this.file) {
                marpCli.export(this.file, 'pptx-editable');
            }
        });
    }

    private async startPresentation() {
        if (!this.file) return;

        const result: PresentationModalResult = { mode: 'fullscreen', presenterView: true };

        const markdownText = await this.app.vault.read(this.file);
        const basePath = (new FilePath(this.settings)).getCompleteFileBasePath(this.file);

        let { html, css, comments } = this.marp.render(markdownText);

        html = html.replace(
            /(?!background-image:url\(&quot;http)background-image:url\(&quot;/g,
            `background-image:url(&quot;${basePath}`
        );

        // Count slides to create controller
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        const totalSlides = tempDiv.querySelectorAll('[data-marp-vscode-slide-wrapper]').length;

        const controller = new PresentationController(totalSlides, comments);

        if (result.mode === 'fullscreen') {
            const presenter = new MarpPresentationView();
            await presenter.present(html, css, basePath, { fullscreen: true, controller });
        } else {
            // Popout window mode
            const popoutLeaf = this.app.workspace.openPopoutLeaf();
            const popoutDoc = popoutLeaf.view.containerEl.ownerDocument;
            const presenter = new MarpPresentationView();
            await presenter.present(html, css, basePath, {
                fullscreen: false,
                controller,
                targetDocument: popoutDoc,
            });
        }

        if (result.presenterView) {
            const notesLeaf = this.app.workspace.openPopoutLeaf();
            // Detach any existing presenter notes views
            this.app.workspace.detachLeavesOfType(MARP_PRESENTER_NOTES_VIEW);
            await notesLeaf.setViewState({
                type: MARP_PRESENTER_NOTES_VIEW,
                active: true,
            });
            // Set the controller and data on the view after it's created
            const notesView = notesLeaf.view as MarpPresenterNotesView;
            if (notesView && notesView.initPresenter) {
                notesView.initPresenter(controller, html, css, basePath);
            }
        }
    }

    async displaySlides(view : MarkdownView) {
        // Ensure themes are loaded before rendering
        if (this.themesLoaded) {
            await this.themesLoaded;
        }

        if (view.file != null) {
            this.file = view.file;
            const basePath = (new FilePath(this.settings)).getCompleteFileBasePath(view.file);
            const markdownText = view.data;

            this.slideContentEl.empty();

            let { html, css } = this.marp.render(markdownText);

            // Replace Background Url for images
            html = html.replace(/(?!background-image:url\(&quot;http)background-image:url\(&quot;/g, `background-image:url(&quot;${basePath}`);

            const htmlFile = `
                <!DOCTYPE html>
                <html>
                <head>
                <base href="${basePath}"></base>
                <style id="__marp-vscode-style">${css}</style>
                </head>
                <body>${html}</body>
                </html>
                `;

            this.slideContentEl.innerHTML = htmlFile;
            this.marpBrowser?.update();
        }
        else
        {
            console.log("Errore: view.file is null")
        }
	}
}

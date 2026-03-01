import { ItemView, WorkspaceLeaf } from 'obsidian';
import { PresentationController } from './presentationController';

export const MARP_PRESENTER_NOTES_VIEW = 'marp-presenter-notes-view';

export class MarpPresenterNotesView extends ItemView {
    private controller: PresentationController | null = null;
    private html = '';
    private css = '';
    private basePath = '';

    private unsubscribe: (() => void) | null = null;
    private unsubscribePointer: (() => void) | null = null;
    private timerInterval: ReturnType<typeof setInterval> | null = null;

    private currentSlideEl: HTMLDivElement;
    private nextSlideEl: HTMLDivElement;
    private notesEl: HTMLDivElement;
    private slideInfoEl: HTMLSpanElement;
    private timerEl: HTMLSpanElement;
    private pointerDot: HTMLDivElement | null = null;

    private slideWrappers: HTMLElement[] = [];

    constructor(leaf: WorkspaceLeaf) {
        super(leaf);
    }

    getViewType(): string {
        return MARP_PRESENTER_NOTES_VIEW;
    }

    getDisplayText(): string {
        return 'Presenter Notes';
    }

    /** Called after the view is created via setViewState to provide presentation data */
    initPresenter(controller: PresentationController, html: string, css: string, basePath: string): void {
        this.controller = controller;
        this.html = html;
        this.css = css;
        this.basePath = basePath;
        this.buildUI();
    }

    async onOpen(): Promise<void> {
        // UI will be built when initPresenter is called
    }

    async onClose(): Promise<void> {
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }
        if (this.unsubscribePointer) {
            this.unsubscribePointer();
            this.unsubscribePointer = null;
        }
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    private buildUI(): void {
        if (!this.controller) return;

        const container = this.containerEl.children[1] as HTMLElement;
        container.empty();
        container.addClass('marp-presenter-view');

        // Slide previews row
        const slidesRow = container.createDiv({ cls: 'marp-presenter-slides-row' });

        const currentCol = slidesRow.createDiv({ cls: 'marp-presenter-slide-col' });
        currentCol.createEl('div', { cls: 'marp-presenter-slide-label', text: 'Current Slide' });
        this.currentSlideEl = currentCol.createDiv({ cls: 'marp-presenter-slide-preview marp-presenter-slide-preview-current' });

        const nextCol = slidesRow.createDiv({ cls: 'marp-presenter-slide-col' });
        nextCol.createEl('div', { cls: 'marp-presenter-slide-label', text: 'Next Slide' });
        this.nextSlideEl = nextCol.createDiv({ cls: 'marp-presenter-slide-preview' });

        // Pointer dot overlay on current slide
        this.pointerDot = this.currentSlideEl.createDiv({ cls: 'marp-presenter-pointer-dot' });
        this.pointerDot.style.display = 'none';

        // Speaker notes
        const notesSection = container.createDiv({ cls: 'marp-presenter-notes-section' });
        notesSection.createEl('div', { cls: 'marp-presenter-slide-label', text: 'Speaker Notes' });
        this.notesEl = notesSection.createDiv({ cls: 'marp-presenter-notes-content' });

        // Navigation bar
        const navBar = container.createDiv({ cls: 'marp-presenter-nav' });

        const prevBtn = navBar.createEl('button', { cls: 'marp-presenter-nav-btn', text: '\u25C0' });
        prevBtn.addEventListener('click', () => this.controller?.prev());

        this.slideInfoEl = navBar.createEl('span', { cls: 'marp-presenter-slide-info' });

        const nextBtn = navBar.createEl('button', { cls: 'marp-presenter-nav-btn', text: '\u25B6' });
        nextBtn.addEventListener('click', () => this.controller?.next());

        this.timerEl = navBar.createEl('span', { cls: 'marp-presenter-timer' });

        // Parse slides
        this.parseSlides();

        // Subscribe to controller
        this.unsubscribe = this.controller.subscribe((index) => {
            this.updateView(index);
        });

        // Subscribe to pointer updates
        this.unsubscribePointer = this.controller.subscribePointer((x, y, visible) => {
            this.updatePointerDot(x, y, visible);
        });

        // Start timer
        this.timerInterval = setInterval(() => this.updateTimer(), 1000);

        // Initial render
        this.updateView(this.controller.getIndex());
        this.updateTimer();
    }

    private parseSlides(): void {
        const temp = document.createElement('div');
        temp.innerHTML = `<div id="__marp-vscode">${this.html}</div>`;
        this.slideWrappers = Array.from(
            temp.querySelectorAll('[data-marp-vscode-slide-wrapper]')
        ) as HTMLElement[];
    }

    private updateView(index: number): void {
        if (!this.controller) return;

        // Current slide preview
        this.renderSlidePreview(this.currentSlideEl, index);

        // Next slide preview
        if (index + 1 < this.controller.getTotal()) {
            this.renderSlidePreview(this.nextSlideEl, index + 1);
        } else {
            this.nextSlideEl.empty();
            this.nextSlideEl.createEl('div', {
                cls: 'marp-presenter-no-slide',
                text: 'End of presentation'
            });
        }

        // Re-append pointer dot to current slide (it gets removed by empty())
        if (this.pointerDot) {
            this.currentSlideEl.appendChild(this.pointerDot);
        }

        // Speaker notes
        const comments = this.controller.getComments(index);
        this.notesEl.empty();
        if (comments.length > 0) {
            for (const comment of comments) {
                this.notesEl.createEl('p', { text: comment.trim() });
            }
        } else {
            this.notesEl.createEl('p', {
                cls: 'marp-presenter-no-notes',
                text: 'No speaker notes for this slide'
            });
        }

        // Slide info
        this.slideInfoEl.textContent = `Slide ${index + 1} / ${this.controller.getTotal()}`;
    }

    private renderSlidePreview(container: HTMLElement, index: number): void {
        // Remove all children except the pointer dot
        const children = Array.from(container.childNodes);
        for (const child of children) {
            if (child !== this.pointerDot) {
                child.remove();
            }
        }

        if (index < 0 || index >= this.slideWrappers.length) return;

        const iframe = container.createEl('iframe', { cls: 'marp-presenter-slide-iframe' });

        iframe.onload = () => {
            const iframeDoc = iframe.contentDocument;
            if (!iframeDoc) return;

            const slideHtml = this.slideWrappers[index].outerHTML;
            iframeDoc.open();
            iframeDoc.write(`<!DOCTYPE html>
<html><head>
<base href="${this.basePath}">
<style>${this.css}</style>
<style>
  body { margin: 0; overflow: hidden; background: #000; }
  [data-marp-vscode-slide-wrapper] {
      position: relative !important;
      visibility: visible !important;
      width: 100%; height: 100vh;
  }
  svg[data-marpit-svg] { width: 100%; height: 100%; }
</style>
</head>
<body><div id="__marp-vscode">${slideHtml}</div></body>
</html>`);
            iframeDoc.close();
        };

        // Trigger load event with about:blank
        iframe.src = 'about:blank';
    }

    private updatePointerDot(x: number, y: number, visible: boolean): void {
        if (!this.pointerDot) return;

        if (!visible) {
            this.pointerDot.style.display = 'none';
            return;
        }

        this.pointerDot.style.display = 'block';
        this.pointerDot.style.left = `${x * 100}%`;
        this.pointerDot.style.top = `${y * 100}%`;
    }

    private updateTimer(): void {
        if (!this.controller) return;
        const elapsed = this.controller.getElapsedTime();
        const totalSeconds = Math.floor(elapsed / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        const pad = (n: number) => n.toString().padStart(2, '0');
        this.timerEl.textContent = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }
}

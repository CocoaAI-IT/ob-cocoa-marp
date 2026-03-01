import { browser, type MarpCoreBrowser } from '@marp-team/marp-core/browser';
import { PresentationController } from './presentationController';

export interface PresentOptions {
    fullscreen: boolean;
    controller?: PresentationController;
    targetDocument?: Document;
}

export class MarpPresentationView {
    private overlay: HTMLDivElement | null = null;
    private slideContainer: HTMLDivElement | null = null;
    private counter: HTMLDivElement | null = null;
    private laserPointer: HTMLDivElement | null = null;
    private slideWrappers: HTMLElement[] = [];
    private currentIndex = 0;
    private laserActive = false;
    private controller: PresentationController | null = null;
    private unsubscribe: (() => void) | null = null;
    private targetDoc: Document = document;

    // Auto-hide UI
    private hideTimeout: ReturnType<typeof setTimeout> | null = null;
    private uiVisible = true;
    private readonly HIDE_DELAY = 3000;

    private boundKeyDown: (e: KeyboardEvent) => void;
    private boundClick: (e: MouseEvent) => void;
    private boundMouseMove: (e: MouseEvent) => void;
    private boundFullscreenChange: () => void;

    constructor() {
        this.boundKeyDown = this.handleKeyDown.bind(this);
        this.boundClick = this.handleClick.bind(this);
        this.boundMouseMove = this.handleMouseMove.bind(this);
        this.boundFullscreenChange = this.handleFullscreenChange.bind(this);
    }

    async present(html: string, css: string, basePath: string, options?: PresentOptions): Promise<void> {
        const fullscreen = options?.fullscreen ?? true;
        this.controller = options?.controller ?? null;
        this.targetDoc = options?.targetDocument ?? document;

        this.createOverlay(html, css, basePath);

        this.slideWrappers = Array.from(
            this.slideContainer!.querySelectorAll('[data-marp-vscode-slide-wrapper]')
        ) as HTMLElement[];

        if (this.slideWrappers.length === 0) {
            return;
        }

        // Subscribe to controller for external slide changes
        if (this.controller) {
            this.unsubscribe = this.controller.subscribe((index) => {
                this.showSlideInternal(index);
            });
        }

        this.showSlide(0);

        this.targetDoc.addEventListener('keydown', this.boundKeyDown);

        if (fullscreen) {
            this.targetDoc.addEventListener('fullscreenchange', this.boundFullscreenChange);
            try {
                await this.targetDoc.documentElement.requestFullscreen();
            } catch {
                // Fullscreen may be denied; continue in overlay mode
            }
        }

        this.resetHideTimer();
    }

    private createOverlay(html: string, css: string, basePath: string): void {
        this.overlay = this.targetDoc.createElement('div') as HTMLDivElement;
        this.overlay.className = 'marp-presentation-overlay';

        this.slideContainer = this.targetDoc.createElement('div') as HTMLDivElement;
        this.slideContainer.className = 'marp-presentation-slide-container';

        // Inject the full HTML document just like the preview does
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
        this.slideContainer.innerHTML = htmlFile;

        // Apply marp-core browser for custom element styles
        try {
            browser(this.slideContainer);
        } catch {
            // CustomElementRegistry re-registration; continue without browser
        }

        this.overlay.appendChild(this.slideContainer);

        this.counter = this.targetDoc.createElement('div') as HTMLDivElement;
        this.counter.className = 'marp-presentation-counter';
        this.overlay.appendChild(this.counter);

        this.laserPointer = this.targetDoc.createElement('div') as HTMLDivElement;
        this.laserPointer.className = 'marp-laser-pointer';
        this.laserPointer.style.display = 'none';
        this.overlay.appendChild(this.laserPointer);

        this.overlay.addEventListener('click', this.boundClick);
        this.overlay.addEventListener('mousemove', this.boundMouseMove);

        this.targetDoc.body.appendChild(this.overlay);
    }

    /** Show slide and notify controller */
    private showSlide(index: number): void {
        this.showSlideInternal(index);
        if (this.controller) {
            this.controller.setSlide(index);
        }
    }

    /** Show slide without notifying controller (used when controller triggers us) */
    private showSlideInternal(index: number): void {
        if (index < 0 || index >= this.slideWrappers.length) {
            return;
        }

        this.currentIndex = index;

        // Hide all slides, show only the current one
        for (let i = 0; i < this.slideWrappers.length; i++) {
            this.slideWrappers[i].classList.toggle('active', i === index);
        }

        if (this.counter) {
            this.counter.textContent = `${this.currentIndex + 1} / ${this.slideWrappers.length}`;
        }
    }

    private nextSlide(): void {
        if (this.controller) {
            this.controller.next();
        } else if (this.currentIndex < this.slideWrappers.length - 1) {
            this.showSlide(this.currentIndex + 1);
        }
    }

    private prevSlide(): void {
        if (this.controller) {
            this.controller.prev();
        } else if (this.currentIndex > 0) {
            this.showSlide(this.currentIndex - 1);
        }
    }

    private handleKeyDown(e: KeyboardEvent): void {
        switch (e.key) {
            case 'ArrowRight':
            case 'ArrowDown':
            case ' ':
            case 'PageDown':
                e.preventDefault();
                this.nextSlide();
                break;
            case 'ArrowLeft':
            case 'ArrowUp':
            case 'PageUp':
                e.preventDefault();
                this.prevSlide();
                break;
            case 'Home':
                e.preventDefault();
                this.showSlide(0);
                break;
            case 'End':
                e.preventDefault();
                this.showSlide(this.slideWrappers.length - 1);
                break;
            case 'Escape':
                e.preventDefault();
                this.exit();
                break;
            case 'l':
            case 'L':
                e.preventDefault();
                this.toggleLaser();
                break;
        }
    }

    private handleClick(e: MouseEvent): void {
        if (!this.overlay) return;

        const rect = this.overlay.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const midpoint = rect.width / 2;

        if (clickX < midpoint) {
            this.prevSlide();
        } else {
            this.nextSlide();
        }
    }

    private handleMouseMove(e: MouseEvent): void {
        this.resetHideTimer();

        if (!this.laserActive || !this.laserPointer) return;

        this.laserPointer.style.left = `${e.clientX - 6}px`;
        this.laserPointer.style.top = `${e.clientY - 6}px`;

        // Broadcast pointer position to controller
        if (this.controller && this.slideContainer) {
            const rect = this.slideContainer.getBoundingClientRect();
            const nx = (e.clientX - rect.left) / rect.width;
            const ny = (e.clientY - rect.top) / rect.height;
            this.controller.setPointer(nx, ny, true);
        }
    }

    private toggleLaser(): void {
        this.laserActive = !this.laserActive;

        if (this.overlay) {
            this.overlay.classList.toggle('laser-active', this.laserActive);
        }

        if (this.laserPointer) {
            this.laserPointer.style.display = this.laserActive ? 'block' : 'none';
        }

        // Notify controller when laser is turned off
        if (!this.laserActive && this.controller) {
            this.controller.setPointer(0, 0, false);
        }
    }

    // Auto-hide UI methods
    private resetHideTimer(): void {
        this.showUI();
        if (this.hideTimeout) {
            clearTimeout(this.hideTimeout);
        }
        this.hideTimeout = setTimeout(() => this.hideUI(), this.HIDE_DELAY);
    }

    private showUI(): void {
        if (this.uiVisible) return;
        this.uiVisible = true;
        if (this.overlay && !this.laserActive) {
            this.overlay.classList.remove('cursor-hidden');
        }
        if (this.counter) {
            this.counter.classList.remove('hidden');
        }
    }

    private hideUI(): void {
        if (!this.uiVisible) return;
        this.uiVisible = false;
        if (this.overlay) {
            this.overlay.classList.add('cursor-hidden');
        }
        if (this.counter) {
            this.counter.classList.add('hidden');
        }
    }

    private handleFullscreenChange(): void {
        if (!this.targetDoc.fullscreenElement && this.overlay) {
            this.exit();
        }
    }

    exit(): void {
        if (this.hideTimeout) {
            clearTimeout(this.hideTimeout);
            this.hideTimeout = null;
        }

        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }

        this.targetDoc.removeEventListener('keydown', this.boundKeyDown);
        this.targetDoc.removeEventListener('fullscreenchange', this.boundFullscreenChange);

        if (this.overlay) {
            this.overlay.removeEventListener('click', this.boundClick);
            this.overlay.removeEventListener('mousemove', this.boundMouseMove);
            this.overlay.remove();
            this.overlay = null;
        }

        this.slideContainer = null;
        this.counter = null;
        this.laserPointer = null;
        this.slideWrappers = [];
        this.currentIndex = 0;
        this.laserActive = false;
        this.controller = null;

        if (this.targetDoc.fullscreenElement) {
            this.targetDoc.exitFullscreen().catch(() => {});
        }

        this.targetDoc = document;
    }
}

import { browser, type MarpCoreBrowser } from '@marp-team/marp-core/browser';

export class MarpPresentationView {
    private overlay: HTMLDivElement | null = null;
    private slideContainer: HTMLDivElement | null = null;
    private counter: HTMLDivElement | null = null;
    private laserPointer: HTMLDivElement | null = null;
    private slideWrappers: HTMLElement[] = [];
    private currentIndex = 0;
    private laserActive = false;

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

    async present(html: string, css: string, basePath: string): Promise<void> {
        this.createOverlay(html, css, basePath);

        this.slideWrappers = Array.from(
            this.slideContainer!.querySelectorAll('[data-marp-vscode-slide-wrapper]')
        ) as HTMLElement[];

        if (this.slideWrappers.length === 0) {
            return;
        }

        this.showSlide(0);

        document.addEventListener('keydown', this.boundKeyDown);
        document.addEventListener('fullscreenchange', this.boundFullscreenChange);

        try {
            await document.documentElement.requestFullscreen();
        } catch {
            // Fullscreen may be denied; continue in overlay mode
        }
    }

    private createOverlay(html: string, css: string, basePath: string): void {
        this.overlay = document.createElement('div');
        this.overlay.className = 'marp-presentation-overlay';

        this.slideContainer = document.createElement('div');
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

        this.counter = document.createElement('div');
        this.counter.className = 'marp-presentation-counter';
        this.overlay.appendChild(this.counter);

        this.laserPointer = document.createElement('div');
        this.laserPointer.className = 'marp-laser-pointer';
        this.laserPointer.style.display = 'none';
        this.overlay.appendChild(this.laserPointer);

        this.overlay.addEventListener('click', this.boundClick);
        this.overlay.addEventListener('mousemove', this.boundMouseMove);

        document.body.appendChild(this.overlay);
    }

    private showSlide(index: number): void {
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
        if (this.currentIndex < this.slideWrappers.length - 1) {
            this.showSlide(this.currentIndex + 1);
        }
    }

    private prevSlide(): void {
        if (this.currentIndex > 0) {
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
        if (!this.laserActive || !this.laserPointer) return;

        this.laserPointer.style.left = `${e.clientX - 6}px`;
        this.laserPointer.style.top = `${e.clientY - 6}px`;
    }

    private toggleLaser(): void {
        this.laserActive = !this.laserActive;

        if (this.overlay) {
            this.overlay.classList.toggle('laser-active', this.laserActive);
        }

        if (this.laserPointer) {
            this.laserPointer.style.display = this.laserActive ? 'block' : 'none';
        }
    }

    private handleFullscreenChange(): void {
        if (!document.fullscreenElement && this.overlay) {
            this.exit();
        }
    }

    exit(): void {
        document.removeEventListener('keydown', this.boundKeyDown);
        document.removeEventListener('fullscreenchange', this.boundFullscreenChange);

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

        if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => {});
        }
    }
}

import { Marp } from '@marp-team/marp-core';
import { MarpSlidesSettings } from '../utilities/settings';
import { MathOptions } from '@marp-team/marp-core/types/src/math/math';

const markdownItContainer = require('markdown-it-container');
const markdownItMark = require('markdown-it-mark');
const markdownItKroki = require('@kazumatu981/markdown-it-kroki');

export class MarpPresentationView {
    private overlay: HTMLDivElement | null = null;
    private slideContainer: HTMLDivElement | null = null;
    private counter: HTMLDivElement | null = null;
    private laserPointer: HTMLDivElement | null = null;
    private slides: HTMLElement[] = [];
    private currentIndex = 0;
    private laserActive = false;
    private settings: MarpSlidesSettings;

    private boundKeyDown: (e: KeyboardEvent) => void;
    private boundClick: (e: MouseEvent) => void;
    private boundMouseMove: (e: MouseEvent) => void;
    private boundFullscreenChange: () => void;

    constructor(settings: MarpSlidesSettings) {
        this.settings = settings;
        this.boundKeyDown = this.handleKeyDown.bind(this);
        this.boundClick = this.handleClick.bind(this);
        this.boundMouseMove = this.handleMouseMove.bind(this);
        this.boundFullscreenChange = this.handleFullscreenChange.bind(this);
    }

    async present(markdownText: string, basePath: string, themeContents: string[]): Promise<void> {
        const marp = new Marp({
            container: { tag: 'div', id: '__marp-vscode' },
            slideContainer: { tag: 'div', 'data-marp-vscode-slide-wrapper': '' },
            html: this.settings.EnableHTML,
            inlineSVG: {
                enabled: true,
                backdropSelector: false,
            },
            math: this.settings.MathTypesettings as MathOptions,
            minifyCSS: true,
            script: false,
        });

        if (this.settings.EnableMarkdownItPlugins) {
            marp
                .use(markdownItContainer, 'container')
                .use(markdownItMark)
                .use(markdownItKroki, { entrypoint: 'https://kroki.io' });
        }

        themeContents.forEach(css => marp.themeSet.add(css));

        let { html, css } = marp.render(markdownText);

        // Replace background image URLs for local resources
        html = html.replace(
            /(?!background-image:url\(&quot;http)background-image:url\(&quot;/g,
            `background-image:url(&quot;${basePath}`
        );

        this.slides = this.parseSlides(html);

        if (this.slides.length === 0) {
            return;
        }

        this.createOverlay(css, basePath);
        this.showSlide(0);

        document.addEventListener('keydown', this.boundKeyDown);
        document.addEventListener('fullscreenchange', this.boundFullscreenChange);

        try {
            await document.documentElement.requestFullscreen();
        } catch {
            // Fullscreen may be denied; continue in overlay mode
        }
    }

    private parseSlides(html: string): HTMLElement[] {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;

        const wrappers = tempDiv.querySelectorAll('[data-marp-vscode-slide-wrapper]');
        if (wrappers.length > 0) {
            return Array.from(wrappers) as HTMLElement[];
        }

        // Fallback: try section elements (Marp default)
        const sections = tempDiv.querySelectorAll('section');
        if (sections.length > 0) {
            return Array.from(sections) as HTMLElement[];
        }

        // Last fallback: use the entire HTML as one slide
        const single = document.createElement('div');
        single.innerHTML = html;
        return [single];
    }

    private createOverlay(css: string, basePath: string): void {
        this.overlay = document.createElement('div');
        this.overlay.className = 'marp-presentation-overlay';

        const style = document.createElement('style');
        style.textContent = css;
        this.overlay.appendChild(style);

        const base = document.createElement('base');
        base.href = basePath;
        this.overlay.appendChild(base);

        this.slideContainer = document.createElement('div');
        this.slideContainer.className = 'marp-presentation-slide-container';
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
        if (index < 0 || index >= this.slides.length) {
            return;
        }

        this.currentIndex = index;

        if (this.slideContainer) {
            this.slideContainer.innerHTML = '';

            const wrapper = document.createElement('div');
            wrapper.id = '__marp-vscode';
            const clone = this.slides[index].cloneNode(true) as HTMLElement;
            wrapper.appendChild(clone);
            this.slideContainer.appendChild(wrapper);
        }

        if (this.counter) {
            this.counter.textContent = `${this.currentIndex + 1} / ${this.slides.length}`;
        }
    }

    private nextSlide(): void {
        if (this.currentIndex < this.slides.length - 1) {
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
                this.showSlide(this.slides.length - 1);
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
        this.slides = [];
        this.currentIndex = 0;
        this.laserActive = false;

        if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => {});
        }
    }
}

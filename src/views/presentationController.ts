export class PresentationController {
    private currentIndex = 0;
    private totalSlides: number;
    private comments: string[][];
    private listeners = new Set<(index: number) => void>();
    private pointerListeners = new Set<(x: number, y: number, visible: boolean) => void>();
    private startTime: number;

    constructor(totalSlides: number, comments: string[][]) {
        this.totalSlides = totalSlides;
        this.comments = comments;
        this.startTime = Date.now();
    }

    subscribe(cb: (index: number) => void): () => void {
        this.listeners.add(cb);
        return () => this.listeners.delete(cb);
    }

    private notify(): void {
        for (const cb of this.listeners) {
            cb(this.currentIndex);
        }
    }

    setSlide(index: number): void {
        if (index < 0 || index >= this.totalSlides) return;
        this.currentIndex = index;
        this.notify();
    }

    next(): void {
        if (this.currentIndex < this.totalSlides - 1) {
            this.setSlide(this.currentIndex + 1);
        }
    }

    prev(): void {
        if (this.currentIndex > 0) {
            this.setSlide(this.currentIndex - 1);
        }
    }

    getIndex(): number {
        return this.currentIndex;
    }

    getTotal(): number {
        return this.totalSlides;
    }

    getComments(index: number): string[] {
        if (index >= 0 && index < this.comments.length) {
            return this.comments[index];
        }
        return [];
    }

    getElapsedTime(): number {
        return Date.now() - this.startTime;
    }

    subscribePointer(cb: (x: number, y: number, visible: boolean) => void): () => void {
        this.pointerListeners.add(cb);
        return () => this.pointerListeners.delete(cb);
    }

    setPointer(x: number, y: number, visible: boolean): void {
        for (const cb of this.pointerListeners) {
            cb(x, y, visible);
        }
    }
}

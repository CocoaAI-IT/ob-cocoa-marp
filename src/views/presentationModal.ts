import { App, Modal } from 'obsidian';

export interface PresentationModalResult {
    mode: 'fullscreen' | 'popout';
    presenterView: boolean;
}

export class PresentationModal extends Modal {
    private resolve: ((result: PresentationModalResult | null) => void) | null = null;
    private mode: 'fullscreen' | 'popout' = 'fullscreen';
    private presenterView = false;

    constructor(app: App) {
        super(app);
    }

    open(): Promise<PresentationModalResult | null> {
        return new Promise((resolve) => {
            this.resolve = resolve;
            super.open();
        });
    }

    onOpen(): void {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('marp-presentation-modal');

        contentEl.createEl('h3', { text: 'Start Presentation' });

        // Display mode selection
        const modeSection = contentEl.createDiv({ cls: 'marp-modal-section' });
        modeSection.createEl('div', { cls: 'marp-modal-label', text: 'Display mode:' });

        const modeGroup = modeSection.createDiv({ cls: 'marp-modal-radio-group' });

        // Fullscreen option
        const fullscreenLabel = modeGroup.createEl('label', { cls: 'marp-modal-radio-label' });
        const fullscreenInput = fullscreenLabel.createEl('input', {
            attr: { type: 'radio', name: 'mode', value: 'fullscreen' }
        });
        fullscreenInput.checked = true;
        fullscreenLabel.appendText(' Fullscreen (current monitor)');

        // Popout option
        const popoutLabel = modeGroup.createEl('label', { cls: 'marp-modal-radio-label' });
        const popoutInput = popoutLabel.createEl('input', {
            attr: { type: 'radio', name: 'mode', value: 'popout' }
        });
        popoutLabel.appendText(' Popout window');

        fullscreenInput.addEventListener('change', () => {
            if (fullscreenInput.checked) this.mode = 'fullscreen';
        });
        popoutInput.addEventListener('change', () => {
            if (popoutInput.checked) this.mode = 'popout';
        });

        // Presenter view checkbox
        const presenterSection = contentEl.createDiv({ cls: 'marp-modal-section' });
        const presenterLabel = presenterSection.createEl('label', { cls: 'marp-modal-checkbox-label' });
        const presenterInput = presenterLabel.createEl('input', {
            attr: { type: 'checkbox' }
        });
        presenterLabel.appendText(' Open presenter view');

        presenterInput.addEventListener('change', () => {
            this.presenterView = presenterInput.checked;
        });

        // Buttons
        const buttonRow = contentEl.createDiv({ cls: 'marp-modal-buttons' });

        const startBtn = buttonRow.createEl('button', {
            cls: 'mod-cta',
            text: 'Start'
        });
        startBtn.addEventListener('click', () => {
            if (this.resolve) {
                this.resolve({ mode: this.mode, presenterView: this.presenterView });
                this.resolve = null;
            }
            this.close();
        });

        const cancelBtn = buttonRow.createEl('button', { text: 'Cancel' });
        cancelBtn.addEventListener('click', () => {
            if (this.resolve) {
                this.resolve(null);
                this.resolve = null;
            }
            this.close();
        });
    }

    onClose(): void {
        // If modal is closed without selecting (e.g. Escape), resolve null
        if (this.resolve) {
            this.resolve(null);
            this.resolve = null;
        }
        this.contentEl.empty();
    }
}

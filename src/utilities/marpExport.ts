import { TFile, App, Notice } from 'obsidian';
import { spawn } from 'child_process';
import { MarpSlidesSettings } from './settings';
import { FilePath } from './filePath';
import { ThemeLoader } from './themeLoader';
import { exportEditablePptx } from './pptxExport';

export class MarpCLIError extends Error {}

export class MarpExport {

    private settings : MarpSlidesSettings;

    private app: App | null;

    constructor(settings: MarpSlidesSettings, app?: App) {
        this.settings = settings;
        this.app = app || null;
    }

    private validatePath(path: string, label: string): void {
        if (path && path.includes('..')) {
            throw new Error(`${label} must not contain '..': ${path}`);
        }
    }

    async export(file: TFile, type: string){
        // Editable PPTX export doesn't need Chrome or marp-cli
        if (type === 'pptx-editable') {
            if (this.app) {
                await exportEditablePptx(file, this.app, this.settings);
            }
            return;
        }

        this.validatePath(this.settings.EXPORT_PATH, 'EXPORT_PATH');
        this.validatePath(this.settings.CHROME_PATH, 'CHROME_PATH');

        const filesTool = new FilePath(this.settings);
        await filesTool.removeFileFromRoot(file);
        await filesTool.copyFileToRoot(file);
        const completeFilePath = filesTool.getCompleteFilePath(file);
        const themePath = filesTool.getThemePath(file);
        const marpEngineConfig = filesTool.getMarpEngine(file.vault);

        if (completeFilePath != ''){
            const argv: string[] = [completeFilePath, '--allow-local-files'];

            if (this.settings.EnableMarkdownItPlugins){
                argv.push('--engine', marpEngineConfig);
            }

            if (this.settings.EnableBuiltinThemes) {
                const pluginDir = filesTool.getPluginDirectory(file.vault);
                const builtinDir = ThemeLoader.writeBuiltinThemesForExport(pluginDir);
                argv.push('--theme-set', builtinDir);
            }

            if (themePath != ''){
                argv.push('--theme-set', themePath);
            }

            switch (type) {
                case 'pdf':
                    argv.push('--pdf');
                    if (this.settings.EXPORT_PATH != ''){
                        argv.push('-o', `${this.settings.EXPORT_PATH}${file.basename}.pdf`);
                    }
                    break;
                case 'pdf-with-notes':
                    argv.push('--pdf', '--pdf-notes', '--pdf-outlines');
                    if (this.settings.EXPORT_PATH != ''){
                        argv.push('-o', `${this.settings.EXPORT_PATH}${file.basename}.pdf`);
                    }
                    break;
                case 'pptx':
                    argv.push('--pptx');
                    if (this.settings.EXPORT_PATH != ''){
                        argv.push('-o', `${this.settings.EXPORT_PATH}${file.basename}.pptx`);
                    }
                    break;
                case 'png':
                    argv.push('--images', '--png');
                    if (this.settings.EXPORT_PATH != ''){
                        argv.push('-o', `${this.settings.EXPORT_PATH}${file.basename}.png`);
                    }
                    break;
                case 'html':
                    argv.push('--html', '--template', this.settings.HTMLExportMode);
                    break;
                case 'preview':
                    argv.push('--html', '--preview');
                    break;
            }
            await this.runMarpCli(argv);
        }
    }

    private runMarpCli(argv: string[]): Promise<void> {
        return new Promise((resolve, reject) => {
            const marpPath = this.settings.MarpCliPath || 'marp';
            const env = { ...process.env };
            if (this.settings.CHROME_PATH) {
                env.CHROME_PATH = this.settings.CHROME_PATH;
            }

            const child = spawn(marpPath, argv, { env, shell: false });

            let stderr = '';
            child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
            child.stdout.on('data', () => { /* discard */ });

            child.on('error', (err: NodeJS.ErrnoException) => {
                if (err.code === 'ENOENT') {
                    new Notice(
                        `Marp CLI not found at "${marpPath}". ` +
                        `Install it with: npm install -g @marp-team/marp-cli ` +
                        `and set the Marp CLI Path in plugin settings.`,
                        10000,
                    );
                    reject(new MarpCLIError(`marp-cli not found: ${marpPath}`));
                } else {
                    reject(err);
                }
            });

            child.on('close', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    const msg = stderr.trim() || `Marp CLI exited with code ${code}`;
                    new Notice(`Marp export failed: ${msg}`, 10000);
                    reject(new MarpCLIError(msg));
                }
            });
        });
    }
}

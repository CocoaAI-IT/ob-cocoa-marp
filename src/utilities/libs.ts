import { App, requestUrl } from 'obsidian';
import { FilePath } from './filePath';
import { MarpSlidesSettings } from './settings';
import { existsSync, outputFileSync } from 'fs-extra';
import JSZip from 'jszip';
import { createHash } from 'crypto';

const EXPECTED_SHA256 = '';

export class Libs {

    private settings : MarpSlidesSettings;

    constructor(settings: MarpSlidesSettings) {
        this.settings = settings;
    }

    async loadLibs(app: App){
        const libPathUtility = new FilePath(this.settings);
        const libPath = libPathUtility.getLibDirectory(app.vault);

        if (!existsSync(libPath)) {
            const downloadUrl = `https://github.com/samuele-cozzi/obsidian-marp-slides/releases/download/lib-v3/lib.zip`;

            try {
                const response = await requestUrl({ url: downloadUrl });
                const buf = new Uint8Array(response.arrayBuffer);

                if (EXPECTED_SHA256) {
                    const hash = createHash('sha256').update(buf).digest('hex');
                    if (hash !== EXPECTED_SHA256) {
                        console.error(`SHA256 mismatch: expected ${EXPECTED_SHA256}, got ${hash}`);
                        return;
                    }
                }

                const zip = new JSZip();
                const contents = await zip.loadAsync(buf);

                for (const filename of Object.keys(contents.files)) {
                    if (!contents.files[filename].dir) {
                        const file = zip.file(filename);
                        if (file != null) {
                            const content = await file.async('nodebuffer');
                            const dest = `${libPathUtility.getLibDirectory(app.vault)}${filename}`;
                            outputFileSync(dest, content);
                        }
                    }
                }
            } catch (error) {
                console.error('Failed to download or extract libs:', error);
            }
        }
    }
}

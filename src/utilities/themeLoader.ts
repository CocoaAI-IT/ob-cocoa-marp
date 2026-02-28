import { App, normalizePath } from 'obsidian';
import { Marp } from '@marp-team/marp-core';
import { MarpSlidesSettings } from './settings';
import { getBuiltinThemeCSS } from '../themes/builtinThemes';

import * as fs from 'fs';
import * as path from 'path';

export class ThemeLoader {

	static async loadThemes(marp: Marp, settings: MarpSlidesSettings, app: App): Promise<void> {
		// 1. Register builtin themes first (so user themes can @import-theme them)
		if (settings.EnableBuiltinThemes) {
			for (const css of getBuiltinThemeCSS()) {
				marp.themeSet.add(css);
			}
		}

		// 2. Register user themes from ThemePath
		if (settings.ThemePath !== '') {
			const fileContents: string[] = await Promise.all(
				app.vault.getFiles()
					.filter(x => x.parent?.path === normalizePath(settings.ThemePath))
					.map(file => app.vault.cachedRead(file))
			);
			for (const css of fileContents) {
				marp.themeSet.add(css);
			}
		}
	}

	static writeBuiltinThemesForExport(pluginDir: string): string {
		const builtinDir = path.join(pluginDir, 'builtin-themes');

		if (!fs.existsSync(builtinDir)) {
			fs.mkdirSync(builtinDir, { recursive: true });
		}

		const themes = getBuiltinThemeCSS();
		themes.forEach((css, index) => {
			const match = css.match(/@theme\s+(\S+)/);
			const themeName = match ? match[1] : `builtin-${index}`;
			fs.writeFileSync(path.join(builtinDir, `${themeName}.css`), css, 'utf-8');
		});

		return builtinDir;
	}
}

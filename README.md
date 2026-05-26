# Marp Slides Presenter

Create and present [Marp](https://marp.app/) markdown slides inside [Obsidian](https://obsidian.md), with a fullscreen presentation mode, a popout presenter view, and a built-in laser pointer.

This plugin is a fork of [samuele-cozzi/obsidian-marp-slides](https://github.com/samuele-cozzi/obsidian-marp-slides) with added presentation features and an editable PPTX export.

## Features

- **Live slide preview** — real-time preview pane for the active Marp note
- **Fullscreen presentation** — present directly from Obsidian
- **Popout presentation** — present in a separate window
- **Presenter view** — current / next slide previews, speaker notes, and an elapsed timer
- **Laser pointer** — toggle with the `L` key during a presentation; the pointer is mirrored in the presenter view
- **Speaker notes** — use Marp's `<!-- comment -->` syntax for per-slide notes
- **Export** — HTML / PDF / PNG / PPTX (image-based) via Marp CLI
- **Editable PPTX export** — generate a PPTX whose text is editable in PowerPoint (via PptxGenJS)
- **Custom theme CSS** and three bundled themes (corporate / dark / enterprise)

> **Note:** Exporting anything other than HTML requires [Google Chrome](https://www.google.com/chrome/), [Chromium](https://www.chromium.org/), or [Microsoft Edge](https://www.microsoft.com/edge). The browser path can be set via the `CHROME_PATH` setting.

## Getting Started

1. Download `main.js`, `styles.css`, and `manifest.json` from the latest [Release](https://github.com/CocoaAI-IT/ob-cocoa-marp/releases).
2. Create `.obsidian/plugins/marp-slides-presenter/` in your vault.
3. Place the three files in that folder.
4. Enable the plugin from Obsidian → Settings → Community plugins.

## Usage

Open any markdown file with a Marp front matter; the preview pane renders the slides.

```markdown
---
marp: true
theme: default
paginate: true
---

# Slide 1

<!-- This becomes a speaker note -->

---

## Slide 2

- Point 1
- Point 2

<!-- Speaker note for slide 2 -->
```

### Toolbar

| Button | Action |
|--------|--------|
| **Present** | Start the presentation (choose fullscreen or popout) |
| **PPTX** | Image-based PPTX export (highest fidelity) |
| **PPTX Edit** | Editable PPTX export (text remains editable) |

### Presentation controls

| Key | Action |
|-----|--------|
| `→` / `↓` / `Space` / `PageDown` | Next slide |
| `←` / `↑` / `PageUp` | Previous slide |
| `Home` | First slide |
| `End` | Last slide |
| `L` | Toggle laser pointer |
| `Escape` | End presentation |

### Presenter view

When **Show presenter view** is enabled before starting a presentation, a separate window shows:

- **Current slide** — including the live laser-pointer position
- **Next slide** — preview of the upcoming slide
- **Speaker notes** — taken from `<!-- comments -->` (directive comments are filtered out)
- **Elapsed time** — since the presentation started
- **Navigation buttons**

## Network use

This plugin sends HTTPS requests in the following case:

- **Kroki diagram rendering (`https://kroki.io`)** — when a slide contains a Kroki code block (PlantUML, Mermaid, GraphViz, etc.), the diagram source is sent to `https://kroki.io` to render an SVG. No network call is made for slides that do not contain Kroki blocks. The endpoint is currently hard-coded; if you do not use Kroki blocks, no request will be issued.

The plugin does not send any telemetry and does not contact any other host.

## File access outside the vault

Because exporting PDF / PPTX / PNG uses Marp CLI through a local Chromium/Chrome/Edge binary, the plugin invokes a system executable whose path is configured via the `CHROME_PATH` setting. The plugin does not otherwise read or write files outside the vault.

## Platform support

This plugin is **desktop only** (`isDesktopOnly: true`). It depends on Node.js APIs (filesystem access, Marp CLI, child processes) and will not load on Obsidian Mobile.

## Not supported

- Obsidian Wiki Links (`[[...]]`) inside slides
- Mobile platforms

## Acknowledgements

This project builds on the work of:

- **[samuele-cozzi/obsidian-marp-slides](https://github.com/samuele-cozzi/obsidian-marp-slides)** — the upstream Obsidian Marp integration this fork is based on
- **[Marp](https://marp.app/)** — the Markdown-to-slides ecosystem ([Marp Core](https://github.com/marp-team/marp-core), [Marp CLI](https://github.com/marp-team/marp-cli), [Marpit](https://marpit.marp.app/))
- **[marp-team/marp-vscode](https://github.com/marp-team/marp-vscode)** — reference for the rendering pipeline
- **[PptxGenJS](https://github.com/gitbrent/PptxGenJS)** — JavaScript PPTX generation
- **[Obsidian](https://obsidian.md)** — plugin platform ([API](https://github.com/obsidianmd/obsidian-api), [Plugin Docs](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin))

## License

MIT License — see [LICENSE](LICENSE).

---

# 日本語版

[Obsidian](https://obsidian.md) 上で [Marp](https://marp.app/) ベースのスライドを作成・プレゼンテーションできるプラグインです。

[samuele-cozzi/obsidian-marp-slides](https://github.com/samuele-cozzi/obsidian-marp-slides) をフォークし、プレゼンテーション機能や編集可能な PPTX エクスポートなどの機能を追加しています。

## 機能

- **スライドプレビュー** — Obsidian 内でスライドをリアルタイムプレビュー
- **フルスクリーンプレゼンテーション** — Obsidian から直接スライドを発表
- **別ウィンドウ（Popout）プレゼンテーション** — 別ウィンドウでスライドを表示しながら発表
- **発表者ビュー** — 現在・次スライドのプレビュー、スピーカーノート、経過時間を表示
- **レーザーポインタ** — プレゼン中に `L` キーでレーザーポインタを切り替え（発表者ビューにも同期表示）
- **スピーカーノート** — Marp の `<!-- コメント -->` 構文でスライドごとのノートを記述
- **エクスポート** — HTML / PDF / PNG / PPTX（画像ベース）への書き出し（Marp CLI 経由）
- **編集可能 PPTX エクスポート** — テキスト編集可能な PPTX を生成（PptxGenJS 経由）
- **カスタムテーマ CSS** — 独自テーマの適用
- **ビルトインテーマ** — corporate / dark / enterprise テーマを同梱

> **Note:** HTML 以外のエクスポートには [Google Chrome](https://www.google.com/chrome/)、[Chromium](https://www.chromium.org/)、または [Microsoft Edge](https://www.microsoft.com/edge) のいずれかが必要です。設定の `CHROME_PATH` でパスを指定できます。

## はじめに

1. このリポジトリの Releases から `main.js`、`styles.css`、`manifest.json` をダウンロード
2. Obsidian の Vault 内に `.obsidian/plugins/marp-slides-presenter/` フォルダを作成
3. ダウンロードしたファイルを配置
4. Obsidian の設定 → コミュニティプラグイン から有効化

## 使い方

Marp のフロントマターを持つ Markdown ファイルを開くと、プレビューパネルにスライドが表示されます。

```markdown
---
marp: true
theme: default
paginate: true
---

# スライド 1

<!-- これがスピーカーノートになります -->

---

## スライド 2

- ポイント 1
- ポイント 2

<!-- 2枚目のスピーカーノート -->
```

### ツールバー

| ボタン | 機能 |
|--------|------|
| **Present** | プレゼンテーション開始（フルスクリーン or 別ウィンドウを選択） |
| **PPTX** | 画像ベース PPTX エクスポート（高品質） |
| **PPTX Edit** | 編集可能 PPTX エクスポート（テキスト編集可能） |

### プレゼンテーション操作

| キー | 操作 |
|------|------|
| `→` / `↓` / `Space` / `PageDown` | 次のスライド |
| `←` / `↑` / `PageUp` | 前のスライド |
| `Home` | 最初のスライド |
| `End` | 最後のスライド |
| `L` | レーザーポインタの切り替え |
| `Escape` | プレゼンテーション終了 |

### 発表者ビュー

プレゼンテーション開始時に「発表者ビューを表示」を有効にすると、別ウィンドウに以下が表示されます：

- **現在のスライド** — レーザーポインタの位置も同期表示
- **次のスライド** — 次に表示されるスライドのプレビュー
- **スピーカーノート** — `<!-- コメント -->` で記述したノート（ディレクティブコメントは自動除外）
- **経過時間** — プレゼン開始からの時間
- **ナビゲーションボタン** — スライド送り/戻し

## ネットワーク通信について

本プラグインは次の場合に限り HTTPS 通信を行います。

- **Kroki 図表のレンダリング (`https://kroki.io`)** — スライドに Kroki コードブロック（PlantUML、Mermaid、GraphViz など）が含まれる場合、図表のソースを `https://kroki.io` に送信して SVG にレンダリングします。Kroki ブロックを含まないスライドではネットワーク通信は行いません。

テレメトリや上記以外の外部送信は一切行いません。

## Vault 外のファイルアクセスについて

PDF / PPTX / PNG エクスポートは Marp CLI を介してローカルの Chromium / Chrome / Edge を起動します。実行するブラウザのパスは `CHROME_PATH` 設定で指定します。これ以外の Vault 外ファイルの読み書きは行いません。

## 動作プラットフォーム

本プラグインは **デスクトップ専用**（`isDesktopOnly: true`）です。Node.js API（ファイルシステムアクセス、Marp CLI、子プロセス）に依存しており、Obsidian Mobile では動作しません。

## サポート対象外

- Wiki Link (`[[...]]`)
- モバイルアプリ

## 謝辞

このプロジェクトは以下のプロジェクトに基づいています。感謝いたします。

- **[samuele-cozzi/obsidian-marp-slides](https://github.com/samuele-cozzi/obsidian-marp-slides)** — フォーク元。Obsidian 上での Marp スライドプレビュー・エクスポートの基盤を構築されました
- **[Marp](https://marp.app/)** — Markdown からスライドを生成するエコシステム（[Marp Core](https://github.com/marp-team/marp-core)、[Marp CLI](https://github.com/marp-team/marp-cli)、[Marpit](https://marpit.marp.app/)）
- **[marp-team/marp-vscode](https://github.com/marp-team/marp-vscode)** — VS Code 向け Marp 拡張。レンダリング実装の参考にしました
- **[PptxGenJS](https://github.com/gitbrent/PptxGenJS)** — JavaScript での PPTX 生成ライブラリ
- **[Obsidian](https://obsidian.md)** — プラグインプラットフォーム（[API](https://github.com/obsidianmd/obsidian-api)、[Plugin Docs](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)）

## ライセンス

MIT License — 詳細は [LICENSE](LICENSE) を参照してください。

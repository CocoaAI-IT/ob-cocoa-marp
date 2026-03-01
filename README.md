# Marp Slides Presenter for Obsidian

[Obsidian](https://obsidian.md) 上で [Marp](https://marp.app/) ベースのスライドを作成・プレゼンテーションできるプラグインです。

[samuele-cozzi/obsidian-marp-slides](https://github.com/samuele-cozzi/obsidian-marp-slides) をフォークし、プレゼンテーション機能や編集可能な PPTX エクスポートなどの機能を追加しています。

## Features

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

## Getting Started

1. このリポジトリの Releases から `main.js`、`styles.css`、`manifest.json` をダウンロード
2. Obsidian の Vault 内に `.obsidian/plugins/marp-slides-presenter/` フォルダを作成
3. ダウンロードしたファイルを配置
4. Obsidian の設定 → コミュニティプラグイン から有効化

## Usage

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

## Not Supported

- Wiki Link (`[[...]]`)
- モバイルアプリは未検証

## Acknowledgements

このプロジェクトは以下のプロジェクトに基づいています。感謝いたします。

- **[samuele-cozzi/obsidian-marp-slides](https://github.com/samuele-cozzi/obsidian-marp-slides)** — フォーク元。Obsidian 上での Marp スライドプレビュー・エクスポートの基盤を構築されました
- **[Marp](https://marp.app/)** — Markdown からスライドを生成するエコシステム（[Marp Core](https://github.com/marp-team/marp-core)、[Marp CLI](https://github.com/marp-team/marp-cli)、[Marpit](https://marpit.marp.app/)）
- **[marp-team/marp-vscode](https://github.com/marp-team/marp-vscode)** — VS Code 向け Marp 拡張。レンダリング実装の参考にしました
- **[PptxGenJS](https://github.com/gitbrent/PptxGenJS)** — JavaScript での PPTX 生成ライブラリ
- **[Obsidian](https://obsidian.md)** — プラグインプラットフォーム（[API](https://github.com/obsidianmd/obsidian-api)、[Plugin Docs](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)）

## License

MIT License — 詳細は [LICENSE](LICENSE) を参照してください。

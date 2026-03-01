# Marp Slides Presenter for Obsidian

[Obsidian](https://obsidian.md) 上で [Marp](https://marp.app/) ベースのスライドを作成・プレゼンテーションできるプラグインです。

[samuele-cozzi/obsidian-marp-slides](https://github.com/samuele-cozzi/obsidian-marp-slides) をフォークし、プレゼンテーション機能や編集可能な PPTX エクスポートなどの機能を追加しています。

## Features

- **スライドプレビュー** — Obsidian 内でスライドをリアルタイムプレビュー
- **フルスクリーンプレゼンテーション** — Obsidian から直接スライドを発表
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

---

## スライド 2

- ポイント 1
- ポイント 2
```

ツールバーから以下の操作が可能です：

| ボタン | 機能 |
|--------|------|
| **Present** | フルスクリーンプレゼンテーション |
| **PPTX** | 画像ベース PPTX エクスポート（高品質） |
| **PPTX Edit** | 編集可能 PPTX エクスポート（テキスト編集可能） |

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

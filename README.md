# michi — セルフコーチング

日々の振り返り、目標・習慣、感情の整理をひとつにまとめた日本語Webアプリです。

## 開発

Node.js 20.19+ または 22.12+ を使用します。この環境では Node.js 24 で動作を確認しています。

```sh
cd /workspace/CodexApp1
npm ci --cache /tmp/michi-npm-cache
npm run dev -- --port 5173
```

## 機能

- 5段階の気分チェックと、3つのテーマに応じた問いかけ
- 3ステップの振り返り、次の行動の記録
- 記録の一覧・テーマ別絞り込み・詳細・削除
- 目標・習慣・目標日の登録、当日の実行記録、過去7日間の表示
- 目標達成・再開、振り返り回数・継続日数の集計
- 記録と目標をJSONファイルに書き出し
- スマートフォン対応、キーボード操作、保存エラー表示

データは利用中のブラウザの localStorage に保存されます。アカウント・サーバー保存・端末間同期はありません。ブラウザデータを消すと記録も削除されるため、必要に応じて記録一覧から書き出してください。JSON書き出しはバックアップ・閲覧用で、インポート機能はありません。問いかけはテーマ別に用意したもので、外部AIやAPIキーは使用しません。

## 検証

```sh
npm run build
npm test
```

テストはデータ保存・継続日数のユニットテストと、Playwrightによる実ブラウザテストです。開発サーバーはテスト内で自動起動します。ブラウザテストには `/usr/bin/chromium` が必要です。この環境には導入済みです。

ビルド結果は `dist/` に出力され、静的ホスティングに配置できます。GitHub Pages 用のビルドは `npm run build:pages` で `docs/` に出力します。

## GitHub Pages で試す

リポジトリの **Settings → Pages → Build and deployment** で、Source を **Deploy from a branch**、Branch を **main**、フォルダを **/docs** にして保存します。

公開後のURL: https://monakatv1558-maker.github.io/CodexApp1/

更新時は `npm run build:pages` を実行し、ソースと `docs/` を一緒にコミットしてください。記録は閲覧しているブラウザにのみ保存され、GitHubには送信されません。

# tampermonkey-scripts

[Claude.ai](https://claude.ai/) で使う [Tampermonkey](https://www.tampermonkey.net/) 用ユーザースクリプト集。

## スクリプト一覧

| ファイル | 概要 |
|---|---|
| [claude_auto_continue.user.js](claude_auto_continue.user.js) | 「続ける」「再試行」ボタンを自動クリック(個別ON/OFF対応) |
| [claude_done_beep.user.js](claude_done_beep.user.js) | 出力完了を通知音で知らせる(自動継続対応) |
| [claude_artifact_diff.user.js](claude_artifact_diff.user.js) | アーティファクト更新時に前バージョンとの差分をブラウザ内表示 |
| [claude_shift_enter_send.user.js](claude_shift_enter_send.user.js) | Enter で改行、Shift+Enter で送信に変更 |
| [claude_hide_gdrive_button.user.js](claude_hide_gdrive_button.user.js) | ファイル生成カードのGoogle Driveエクスポートボタンを非表示化 |

すべて `https://claude.ai/*` に対して動作。

## インストール

1. ブラウザに [Tampermonkey](https://www.tampermonkey.net/) 拡張をインストール
2. このリポジトリで使いたい `.user.js` ファイルをクリックして開く
3. GitHub上の **Raw** ボタンから raw ファイルを表示すると Tampermonkey がインストール画面を出す
4. 内容を確認して「インストール」

ローカルファイルから入れる場合は、Tampermonkey ダッシュボードの「ユーティリティ → ファイル」からインポート。

## バージョン管理

- ファイル名にはバージョンを含めない
- バージョンはスクリプト内の `@version` ヘッダで管理する
- 変更履歴は git のコミット履歴を参照

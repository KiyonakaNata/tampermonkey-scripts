# tampermonkey-scripts

[Tampermonkey](https://www.tampermonkey.net/) 用ユーザースクリプト集。

## スクリプト一覧

### Claude.ai (`https://claude.ai/*`)

| ファイル | 概要 |
|---|---|
| [claude_auto_continue.user.js](claude_auto_continue.user.js) | 「続ける」「再試行」ボタンを自動クリック(個別ON/OFF対応) |
| [claude_done_beep.user.js](claude_done_beep.user.js) | 出力完了を通知音で知らせる(自動継続対応) |
| [claude_artifact_diff.user.js](claude_artifact_diff.user.js) | アーティファクト更新時に前バージョンとの差分をブラウザ内表示 |
| [claude_ctrl_enter_send.user.js](claude_ctrl_enter_send.user.js) | Enter / Shift+Enter で改行、Ctrl+Enter で送信に変更 |
| [claude_hide_gdrive_button.user.js](claude_hide_gdrive_button.user.js) | ファイル生成カードのGoogle Driveエクスポートボタンを非表示化 |
| [claude_adaptive_width.user.js](claude_adaptive_width.user.js) | アーティファクト非表示時のみチャット幅を拡張 |

### e-typing (`https://*.e-typing.ne.jp/*`)

[AdGuard](https://adguard.com/) で広告ブロックしていることを前提とした作り(広告非表示によるレイアウト/挙動を想定)。

| ファイル | 概要 |
|---|---|
| [etyping_space_replay.user.js](etyping_space_replay.user.js) | リザルト画面でスペースキー押下でページをリロードして次のゲームへ |
| [etyping_practice_new_tab.user.js](etyping_practice_new_tab.user.js) | 練習選択リンクをモーダルではなく新しいタブで開く |

## インストール

1. ブラウザに [Tampermonkey](https://www.tampermonkey.net/) 拡張をインストール
2. 下記の各スクリプトの **Raw URL** をクリックすると Tampermonkey のインストール画面が開く
3. 内容を確認して「インストール」

### Raw URL 一覧

#### Claude.ai

- [claude_auto_continue.user.js](https://raw.githubusercontent.com/KiyonakaNata/tampermonkey-scripts/main/claude_auto_continue.user.js)
- [claude_done_beep.user.js](https://raw.githubusercontent.com/KiyonakaNata/tampermonkey-scripts/main/claude_done_beep.user.js)
- [claude_artifact_diff.user.js](https://raw.githubusercontent.com/KiyonakaNata/tampermonkey-scripts/main/claude_artifact_diff.user.js)
- [claude_ctrl_enter_send.user.js](https://raw.githubusercontent.com/KiyonakaNata/tampermonkey-scripts/main/claude_ctrl_enter_send.user.js)
- [claude_hide_gdrive_button.user.js](https://raw.githubusercontent.com/KiyonakaNata/tampermonkey-scripts/main/claude_hide_gdrive_button.user.js)
- [claude_adaptive_width.user.js](https://raw.githubusercontent.com/KiyonakaNata/tampermonkey-scripts/main/claude_adaptive_width.user.js)

#### e-typing

- [etyping_space_replay.user.js](https://raw.githubusercontent.com/KiyonakaNata/tampermonkey-scripts/main/etyping_space_replay.user.js)
- [etyping_practice_new_tab.user.js](https://raw.githubusercontent.com/KiyonakaNata/tampermonkey-scripts/main/etyping_practice_new_tab.user.js)

各スクリプトのヘッダに `@updateURL` / `@downloadURL` が設定されているため、
**インストール後は git push する度に Tampermonkey が自動更新を取得** します(デフォルト約24時間ごと、手動更新は Tampermonkey ダッシュボードの「アップデートを確認」から)。

## バージョン管理

- ファイル名にはバージョンを含めない
- バージョンはスクリプト内の `@version` ヘッダで管理する
- 変更履歴は git のコミット履歴を参照

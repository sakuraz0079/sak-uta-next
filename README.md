# sak_Uta NEXT

「次に歌う曲」をスマホで選ぶためのWebアプリです。

## 公開URL
GitHubユーザー名が `sakuraz0079` の場合:

`https://sakuraz0079.github.io/sak-uta-next/`

## GitHub Pages公開手順
1. GitHubで `sak-uta-next` というPublicリポジトリを新規作成
2. このフォルダ内のファイルをリポジトリ直下へアップロード
3. GitHubの `Settings` → `Pages`
4. `Build and deployment` の Source を `Deploy from a branch`
5. Branch を `main`、Folder を `/(root)` にして Save

数分後、上記URLでアクセスできます。

## 構成
- `index.html` : メイン画面
- `styles.css` : UI
- `app.js` : 検索・フィルタ・お気に入り・詳細画面
- `readiness.js` : 想定キーと高音負荷、試唱結果による「歌えるか判断」
- Google Sheetsから取得した最新データを正本とし、同期成功時のデータのみ端末に保存
- `config.js` : Google Sheets / 歌準備アプリ連携設定
- `manifest.webmanifest` : PWA設定
- `sw.js` : オフラインキャッシュ
- `.nojekyll` : GitHub Pages向け設定

## 次段階
### Google Sheets 自動同期
`config.js` の `SHEET_GVIZ_URL` からGoogle Visualization APIをJSONPで読み込みます。

曲の基本・詳細情報（A:Q）に加え、以下の歌唱判定用データ（R:X）をヘッダー名で読み込みます。未入力でも既存画面は維持され、詳細画面では不足項目を表示します。

- 想定キー差
- オクターブ調整
- 高音頻度
- 高音保持
- 高音連続性
- サビ平均負荷
- 試唱判定
- 見送り理由
- 見送りメモ
- 見送り日
- 見送り前ステータス
- 歌唱済みメモ
- 歌唱済み日
- 歌唱済み前ステータス

ステータスが `見送り` の曲は通常一覧から除外されます。絞り込みの「見送り」からいつでも確認でき、詳細画面から該当するGoogle Sheets行を直接開いて試唱記録・見送り・候補復帰を編集できます。

投稿用に歌い終えた曲は詳細画面から `歌唱済` にできます。通常一覧からは外れますが、「歌唱済」フィルターで記録を確認し、必要なら元の候補ステータスへ戻せます。

ホーム上部の「新しい候補を追加」から、アーティスト・曲名・ステータス・推奨キー・選曲理由をGoogle Sheetsへ登録できます。アーティストと曲名が一致する既存曲は重複登録せず、その曲の詳細を開きます。

`config.js` の `SHEET_WRITE_URL` に `apps-script/Code.gs` をWebアプリとして公開したURLを設定すると、詳細画面内のフォームから試唱記録・見送り・歌唱済み・候補復帰を直接保存できます。

### 歌準備アプリ連携
`config.js` の `PREP_APP_URL` に準備アプリURLを設定します。
曲詳細の「歌うと決めた」ボタンから以下をquery parameterで渡します。

- `title`
- `artist`
- `key`
- `status`

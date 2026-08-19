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
- `data.js` : 現在の候補データ
- `config.js` : Google Sheets / 歌準備アプリ連携設定
- `manifest.webmanifest` : PWA設定
- `sw.js` : オフラインキャッシュ
- `.nojekyll` : GitHub Pages向け設定

## 次段階
### Google Sheets 自動同期
`config.js` の `SHEET_DATA_URL` に、候補シートをJSON化して返す公開エンドポイントを設定します。

### 歌準備アプリ連携
`config.js` の `PREP_APP_URL` に準備アプリURLを設定します。
曲詳細の「歌うと決めた」ボタンから以下をquery parameterで渡します。

- `title`
- `artist`
- `key`
- `status`

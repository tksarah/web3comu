# Web3 Community Portal

NFT/トークン保有者向けの Web3 コミュニティポータルです。ウォレット署名ログイン、トークン保有判定、メンバープロフィール、管理画面、ポータルのお知らせ/ライブラリ管理、Faucet、Big Medal Token (BMT)、ログインボーナスをまとめて扱います。

## Overview

- ウォレット署名によるメンバー/管理者ログイン
- ERC-20 / ERC-721 / ERC-1155 の保有条件によるメンバー認証
- 管理ウォレットによるトークン条件に依存しないポータルアクセス
- メンバープロフィールとプロフィール画像アップロード
- 管理画面でのメンバー管理、公開制御、セッション失効
- 管理画面でのポータル「お知らせ」「ライブラリ」コンテンツ作成、編集、公開切替
- Faucet の支給額、allowlist、送金履歴、送金元ウォレット確認
- BMT の mint、transfer、minter 権限、ログインボーナス設定
- Caddy による HTTPS 終端とセキュリティヘッダー付与

## Requirements

- Node.js 24 以上
- npm
- Docker / Docker Compose (Docker 運用する場合)
- Reown / WalletConnect v2 Project ID
- 管理者用ウォレット
- Faucet を使う場合は、少額だけ入れた Faucet 送信用ウォレット

## Environment Variables

`.env.example` を `.env` にコピーして設定します。

```powershell
Copy-Item .env.example .env
```

既存 Caddy proxy 配下で動かす場合は、`.env.proxy.example` を `.env.proxy` にコピーして設定します。

```powershell
Copy-Item .env.proxy.example .env.proxy
```

| Key | 用途 |
| --- | --- |
| `DOMAIN` | 本番で Caddy が HTTPS を発行するドメイン。例: `example.com` |
| `ADMIN_WALLET_ADDRESS` | `/admin` に管理者としてログインでき、条件に関係なくポータルへ入れるウォレットアドレス |
| `SESSION_SECRET` | セッショントークンの HMAC に使う長いランダム文字列。本番では必ず変更する |
| `DATABASE_URL` | SQLite DB の保存先。Docker 本番の標準は `/data/portal.sqlite` |
| `UPLOAD_DIR` | プロフィール画像の保存先。Docker 本番の標準は `/data/uploads` |
| `EVM_RPC_URL` | メンバー認証の初期 RPC URL。未設定時は Soneium Mainnet RPC を使う |
| `MINATO_RPC_URL` | BMT デプロイ用 Hardhat network の RPC URL |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | Reown / WalletConnect v2 の Project ID |
| `NEXT_PUBLIC_APP_NAME` | ウォレット署名メッセージや AppKit 表示に使うアプリ名 |
| `FAUCET_PRIVATE_KEY` | Faucet 自動送金用ウォレットの秘密鍵。少額運用に限定する |
| `DEPLOYER_PRIVATE_KEY` | BMT デプロイ用ウォレットの秘密鍵。アプリ実行環境には渡さない |
| `NEXT_PUBLIC_BMT_TOKEN_ADDRESS` | デプロイ済み BMT コントラクトアドレス |

本番では `SESSION_SECRET` を十分長い乱数にし、公開後に変更した場合は既存セッションを無効化してください。`FAUCET_PRIVATE_KEY` のウォレットには、失ってよい少額だけを入れてください。`DEPLOYER_PRIVATE_KEY` はデプロイ作業時だけ使い、本番アプリの runtime には置かない運用にします。

## Local Development

```powershell
npm install
npm run dev
```

開発サーバーは `0.0.0.0:3000` で起動します。

よく使う検証コマンド:

```powershell
npm run typecheck
npm run build
npm audit --omit=dev
```

## Docker

### Development

```powershell
docker compose -f docker-compose-dev.yml up --build
```

- App: `http://localhost:8080`
- HTTPS dev proxy: `https://localhost:8443`
- ソースコードはコンテナへマウントされます。
- 開発用 compose は `.env` を app/caddy に読み込ませます。

### Production

#### Existing Caddy Proxy

同じ Docker host で既存 Caddy container が `80` / `443` を公開している場合は、`docker-compose.proxy.yml` を使います。この compose は Web3 app だけを起動し、Caddy service は起動しません。

初回のみ、既存 Caddy と Web3 app が共有する external network を作成します。

```bash
docker network create proxy
```

既存 Caddy container と Web3 app container の両方を `proxy` network に参加させます。既存 Caddyfile の新ドメイン block は、次の upstream に proxy します。

```caddyfile
reverse_proxy web3comu-app:3000
```

Web3 app は次のように起動します。

```bash
docker compose --env-file .env.proxy -f docker-compose.proxy.yml up --build -d
```

起動前の設定確認:

```bash
docker compose --env-file .env.proxy -f docker-compose.proxy.yml config
```

- `docker-compose.proxy.yml` は `ports` を公開せず、`expose: "3000"` のみを使います。
- `app` は `proxy` network 上で `web3comu-app` alias を持ちます。
- SQLite DB とアップロード画像は `portal-data` volume の `/data` に保存されます。
- 既存 Caddy 側には `reverse_proxy web3comu-app:3000` を設定します。
- `.env.proxy` は secret を含むため Git 管理しません。

#### Standalone Caddy

アプリ専用の Docker host で、この compose set が `80` / `443` を直接公開できる場合は、従来どおり `docker-compose.yml` を使います。

```powershell
docker compose up --build -d
```

- Caddy が `80` / `443` を公開し、Next.js app へ reverse proxy します。
- Caddy には `DOMAIN` だけを渡します。
- app には runtime に必要な環境変数だけを明示して渡します。
- `DEPLOYER_PRIVATE_KEY` は本番 app コンテナに渡しません。
- DB とアップロード画像は Docker volume の `/data` に保存されます。
- Docker runner は `npm prune --omit=dev` 後の production dependencies で動作し、非 root ユーザーで起動します。

## First Admin Setup

1. `.env` の `ADMIN_WALLET_ADDRESS` に管理者ウォレットを設定します。
2. `.env` の `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` を設定します。
3. `/admin` を開き、管理者ウォレットで接続して署名します。
4. 管理画面の「メンバー条件」で対象チェーン、RPC URL、コントラクト、規格、保有条件を設定します。
5. 管理画面の「コンテンツ管理」で「お知らせ」と「ライブラリ」を必要に応じて登録します。
6. 条件を有効化すると、メンバーは `/` からウォレット接続して `/portal` に入れるようになります。

管理ウォレットはメンバー条件が未設定、無効、または未達の場合でも `/portal`、`/portal/news`、`/portal/library`、`/members`、`/mypage` に入れます。Faucet の allowlist や BMT のオンチェーン条件は別管理です。

## Member Flow

1. メンバーが `/` でウォレットを接続します。
2. アプリが署名 nonce を発行し、ウォレット署名を検証します。
3. 設定済みの ERC-20 / ERC-721 / ERC-1155 条件で保有判定します。
4. 条件を満たすとメンバーセッションが作成され、`/portal` に入れます。
5. `/mypage` でプロフィール、SNS、公開状態、プロフィール画像を設定できます。
6. `/members` では公開済みで停止されていないメンバーのプロフィールを表示します。

プロフィール画像は jpg/png/webp のみ、3MB 以下です。アップロード時に MIME type と実ファイル内容を検証し、配信時は認証済みメンバーまたは管理者だけが取得できます。

## Portal Content

管理画面の「コンテンツ管理」では、ポータルに表示する「お知らせ」と「ライブラリ」を管理できます。

- お知らせはタイトル、本文、URL を登録できます。本文または URL のどちらかが必須です。
- ライブラリは外部資料リンクを中心に扱います。タイトルと URL が必須で、説明文は任意です。
- URL は `http://` または `https://` のみ保存できます。
- 公開状態は「下書き」と「公開」から選びます。ポータルには公開済みコンテンツだけが表示されます。
- 「一覧の上部に固定する」を有効にすると、公開一覧で固定コンテンツが先に表示されます。
- 表示順は固定コンテンツが先、その後は公開日時の新しい順です。
- お知らせ本文中の URL はポータル表示時にリンク化されます。

ポータル上部のメニューバーから、ホーム、お知らせ、イベント、ライブラリ、メンバー、マイページへ移動できます。各ページ末尾の重複する戻りリンクは置かず、上部メニューを共通導線にしています。ライブラリのURLは互換性維持のため `/portal/library` のままです。

## Faucet

Faucet は Soneium Mainnet / Soneium Minato のガス代用 ETH を、allowlist 済みウォレットへ支給する機能です。

- 管理画面でチェーン別の有効/無効と支給額を設定します。
- 管理画面で受け取り対象ウォレットを allowlist に登録します。
- ユーザーは `/faucet` で対象ウォレットを接続し、署名して請求します。
- 請求は JST 日付でウォレット/チェーンごとに 1 日 1 回です。
- nonce 発行と claim API には IP + wallet + chain 単位の短時間連打制限があります。
- Faucet の成功、失敗、レート制限は秘密情報なしで監査ログへ出力します。

本番では `FAUCET_PRIVATE_KEY` のウォレット残高を常に少額に保ってください。Mainnet faucet を有効化する場合は、支給額、allowlist、残高を特に厳格に管理してください。

## Big Medal Token

BMT は Minato 上の ERC-20 トークンです。Hardhat でデプロイします。

```powershell
npm run deploy:bmt:minato
```

デプロイ後、出力されたコントラクトアドレスを `.env` の `NEXT_PUBLIC_BMT_TOKEN_ADDRESS` に設定します。管理画面では次の操作ができます。

- BMT の name / symbol / owner / totalSupply / cap / 管理者残高の確認
- 管理者ウォレットによる mint
- 管理者ウォレットからの transfer
- minter 権限の付与/解除
- ログインボーナスの有効/無効、支給額、必要残高の設定

メンバーは `/portal/login-bonus` で接続中ウォレット自身から `claimLoginBonus` を実行します。受け取りには Minato のガス代が必要です。

## Security Notes

- 状態変更 API は same-origin 検証を行い、外部 origin からの `POST` / `PUT` / `PATCH` / `DELETE` を拒否します。
- セッション cookie は `httpOnly`、production では `secure`、`sameSite: "lax"` です。
- 管理 API は `ADMIN_WALLET_ADDRESS` に一致する admin session を要求します。
- ポータル閲覧とプロフィール更新は、認証済みメンバーまたは設定済み管理ウォレットを許可します。
- DB 操作は SQLite prepared statement を使います。
- ポータルコンテンツの URL は `http:` / `https:` に制限し、外部リンクは別タブで開きます。
- Caddy は HSTS、`X-Content-Type-Options`、`X-Frame-Options`、`Referrer-Policy`、`Permissions-Policy`、最小 CSP を付与します。
- 画像配信は `X-Content-Type-Options: nosniff` を付けます。
- 本番 Docker image には Hardhat などの devDependencies を残さない構成です。

## Verification

公開前に最低限以下を確認してください。

```powershell
npm install
npm run typecheck
npm run build
npm audit --omit=dev
```

手動確認項目:

- 通常ログインと管理ログインが成功する
- 管理ウォレットがトークン条件に関係なくポータルへ入れる
- 管理画面でメンバー条件を保存できる
- 管理画面でお知らせ/ライブラリの下書き作成、公開、編集、削除が動作する
- ポータルには公開済みのお知らせ/ライブラリだけが表示される
- メンバー停止/解除、強制非公開、セッション失効が動作する
- プロフィール更新、画像アップロード、画像表示が動作する
- Faucet allowlist、設定保存、通常請求が動作する
- 同一 wallet/IP で短時間に Faucet を連打すると `429` になる
- 外部 origin から状態変更 API を呼ぶと `403` になる
- BMT の mint / transfer / minter / ログインボーナス設定が想定どおり動作する

## Assets and Data

- 静的画像は `public/images/` に配置します。
- サンプル素材は `samples/` にあります。
- ライブラリカード画像は `public/images/items.png` を使います。元素材は `samples/items.png` です。
- Docker 本番では SQLite DB とアップロード画像は `portal-data` volume の `/data` に保存されます。
- `.env`、`data/`、`node_modules/`、`.next/` は Git 管理しません。

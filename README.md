# Web3 Community Portal

NFT保有ウォレットだけが入れるコミュニティポータルです。

## Setup

```powershell
Copy-Item .env.example .env
npm install
npm run dev
```

`.env` では最低限以下を設定します。

- `DOMAIN`: 本番でCaddyがHTTPSを発行するドメイン
- `ADMIN_WALLET_ADDRESS`: 管理者としてログインできるウォレット
- `SESSION_SECRET`: 十分に長いランダム文字列
- `EVM_RPC_URL`: 初期表示に使うRPC URL。デフォルトはSoneium Mainnetの `https://rpc.soneium.org/`
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`: Reown / WalletConnect v2用のProject ID

## Wallet Modal

ウォレット接続は Reown AppKit を使います。`NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` が未設定の場合、QRコードは表示せず、設定不足エラーを画面に出します。

デフォルトネットワークは Soneium Mainnet です。

- Chain ID: `1868`
- RPC: `https://rpc.soneium.org/`
- Currency: `ETH`

## Docker

開発環境:

```powershell
docker compose -f docker-compose-dev.yml up --build
```

- App: `http://localhost:8080`
- HTTPS dev proxy: `https://localhost:8443`

本番環境:

```powershell
docker compose up --build -d
```

Caddyは `.env` の `DOMAIN` でHTTPS終端し、Next.jsアプリへリバースプロキシします。

## First Admin Flow

1. `.env` の `ADMIN_WALLET_ADDRESS` に管理ウォレットを設定します。
2. `/admin` で管理ウォレットを接続し、署名します。
3. NFT条件を設定して有効化します。
4. メンバーは `/` でウォレット接続し、NFT保有確認後に `/portal` へ進みます。

プロフィール画像とSQLite DBはDocker volumeの `/data` に保存されます。

## Portal Background

メンバー向け画面の背景は `public/images/portal-bg.png` を参照します。背景を差し替える場合は、このファイル名で画像を配置してください。

import Link from "next/link";

import { WalletLoginButton } from "@/components/WalletLoginButton";

export function LandingGate() {
  return (
    <main className="landing-page">
      <div className="landing-content">
        <img className="landing-image" src="/images/top.png" alt="Web3コミュニティポータル" />
        <section className="pixel-panel landing-actions" aria-label="ウォレット接続">
          <div>
            <h1>Web3コミュニティポータル</h1>
            <p>コミュニティトークンを保有しているウォレットで接続してください。</p>
          </div>
          <div className="landing-buttons">
            <WalletLoginButton intent="member" label="ウォレット接続" redirectTo="/portal" />
            <Link className="pixel-button secondary" href="/faucet">
              Faucet
            </Link>
            <Link className="text-link" href="/admin">
              管理ページ
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

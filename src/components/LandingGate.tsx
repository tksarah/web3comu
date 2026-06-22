import Link from "next/link";
import Image from "next/image";

import { WalletLoginButton } from "@/components/WalletLoginButton";

export function LandingGate() {
  return (
    <main className="landing-page">
      <div className="landing-content">
        <Image
          priority
          className="landing-image"
          src="/images/top.png"
          alt="Web3コミュニティポータル"
          width={1774}
          height={887}
          sizes="(max-width: 720px) calc(100vw - 36px), 1180px"
        />
        <section className="pixel-panel landing-actions" aria-label="Web3コミュニティポータルへの入口">
          <div>
            <div className="landing-title-row">
              <img className="landing-title-icon" src="/icons/site-crest-512.png" alt="" aria-hidden="true" />
              <h1>Web3コミュニティポータル</h1>
            </div>
            <p>LiON Web3分科会の学びと実践に参加するための入口です。</p>
          </div>
          <div className="landing-buttons">
            <Link className="pixel-button guide-button" href="/guide">
              はじめに
            </Link>
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

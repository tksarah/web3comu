import Link from "next/link";
import { redirect } from "next/navigation";

import { PortalFrame } from "@/components/PortalFrame";
import { getPortalContext } from "@/lib/auth";

export default async function LearnPage() {
  const context = await getPortalContext();
  if (!context) {
    redirect("/");
  }

  return (
    <PortalFrame title="体験学習" walletAddress={context.session.walletAddress}>
      <section className="pixel-panel learn-lesson-intro">
        <div>
          <p className="eyebrow">LEARNING PATH</p>
          <h2>Lessonを順番に体験する</h2>
          <p>
            Web3の基本操作を、ブラウザ内の安全な学習環境から順番に試します。まずはLesson 0でウォレット操作の基本を身につけます。
          </p>
        </div>
      </section>

      <section className="learn-lesson-grid" aria-label="体験学習Lesson一覧">
        <Link className="learn-lesson-card pixel-panel" href="/portal/learn/wallet">
          <div className="learn-lesson-card-head">
            <img src="/images/wallet-small.svg" alt="" aria-hidden="true" />
            <span>Lesson 0</span>
          </div>
          <h3>ブラウザ内ウォレット体験</h3>
          <p>学習用ウォレットを作成し、ネットワーク登録、トークン追加、受け取り、送信を体験します。</p>
          <strong className="learn-lesson-status available">開始できます</strong>
        </Link>

        <article className="learn-lesson-card locked pixel-panel" aria-disabled="true">
          <div className="learn-lesson-card-head">
            <img src="/images/wallet-small.svg" alt="" aria-hidden="true" />
            <span>Lesson 1</span>
          </div>
          <h3>実ウォレットの体験</h3>
          <p>実ウォレットを使い、テストネット接続や実際の署名操作へ進む予定です。</p>
          <strong className="learn-lesson-status">準備中</strong>
        </article>
      </section>
    </PortalFrame>
  );
}

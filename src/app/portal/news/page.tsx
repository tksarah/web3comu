import Link from "next/link";
import { redirect } from "next/navigation";

import { PortalFrame } from "@/components/PortalFrame";
import { getMemberContext } from "@/lib/auth";

export default async function NewsPage() {
  const context = await getMemberContext();
  if (!context) {
    redirect("/");
  }

  return (
    <PortalFrame title="お知らせ" walletAddress={context.session.walletAddress}>
      <section className="pixel-panel focused-panel">
        <p className="eyebrow">News</p>
        <h2>お知らせは準備中です</h2>
        <p>コミュニティからのお知らせをここに掲載予定です。</p>
        <Link className="pixel-button" href="/portal">
          ホームへ戻る
        </Link>
      </section>
    </PortalFrame>
  );
}

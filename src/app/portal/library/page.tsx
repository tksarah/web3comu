import Link from "next/link";
import { redirect } from "next/navigation";

import { PortalFrame } from "@/components/PortalFrame";
import { getMemberContext } from "@/lib/auth";

export default async function LibraryPage() {
  const context = await getMemberContext();
  if (!context) {
    redirect("/");
  }

  return (
    <PortalFrame title="資料庫" walletAddress={context.session.walletAddress}>
      <section className="pixel-panel focused-panel">
        <h2>資料庫は準備中です</h2>
        <p>メンバー向け資料をここに掲載予定です。</p>
        <Link className="pixel-button" href="/portal">
          ホームへ戻る
        </Link>
      </section>
    </PortalFrame>
  );
}

import { redirect } from "next/navigation";

import { LinkedText } from "@/components/LinkedText";
import { PortalFrame } from "@/components/PortalFrame";
import { getPortalContext } from "@/lib/auth";
import { listPublishedPortalContent } from "@/lib/repository";

function formatContentDate(value: string | null) {
  if (!value) {
    return "未公開";
  }
  return new Date(value).toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" });
}

export default async function NewsPage() {
  const context = await getPortalContext();
  if (!context) {
    redirect("/");
  }

  const notices = listPublishedPortalContent("notice");

  return (
    <PortalFrame title="お知らせ" walletAddress={context.session.walletAddress}>
      <section className="portal-content-list">
        {notices.length ? (
          notices.map((notice) => (
            <article className="pixel-panel portal-content-card" key={notice.id}>
              <div className="portal-content-head">
                <h2>{notice.title}</h2>
                {notice.pinned ? <span className="member-status-badge enabled">固定</span> : null}
              </div>
              <p className="content-meta">公開日: {formatContentDate(notice.publishedAt)}</p>
              {notice.body ? (
                <p className="portal-content-body">
                  <LinkedText text={notice.body} />
                </p>
              ) : null}
              {notice.url ? (
                <a className="pixel-button small" href={notice.url} rel="noreferrer" target="_blank">
                  リンクを開く
                </a>
              ) : null}
            </article>
          ))
        ) : (
          <section className="pixel-panel focused-panel">
            <h2>お知らせはまだありません</h2>
            <p>公開されたお知らせがここに表示されます。</p>
          </section>
        )}
      </section>
    </PortalFrame>
  );
}

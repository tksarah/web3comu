import { redirect } from "next/navigation";

import { PortalFrame } from "@/components/PortalFrame";
import { ProfileForm } from "@/components/ProfileForm";
import { getPortalContext } from "@/lib/auth";

export default async function MyPage() {
  const context = await getPortalContext();
  if (!context) {
    redirect("/");
  }

  return (
    <PortalFrame title="マイページ" walletAddress={context.session.walletAddress}>
      <section className="page-intro pixel-panel">
        <h1>プロフィール設定</h1>
        <p>すべて任意です。メールアドレスは公開設定に関係なく本人と管理者だけが確認できます。</p>
      </section>
      <ProfileForm initialProfile={context.member} />
    </PortalFrame>
  );
}

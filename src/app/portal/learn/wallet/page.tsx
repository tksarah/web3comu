import { redirect } from "next/navigation";

import { PortalFrame } from "@/components/PortalFrame";
import { WalletLessonSandbox } from "@/components/WalletLessonSandbox";
import { getPortalContext } from "@/lib/auth";

export default async function WalletLessonPage() {
  const context = await getPortalContext();
  if (!context) {
    redirect("/");
  }

  return (
    <PortalFrame title="体験学習: Lesson 0" walletAddress={context.session.walletAddress}>
      <WalletLessonSandbox walletAddress={context.session.walletAddress} />
    </PortalFrame>
  );
}

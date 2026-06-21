"use client";

import { useState } from "react";
import { useDisconnect } from "wagmi";

import { useAppKitRuntime } from "@/components/AppKitRuntimeProvider";

type Props = {
  className?: string;
};

type LogoutButtonViewProps = Props & {
  disconnectWallet?: () => Promise<unknown>;
};

function LogoutButtonView({ className, disconnectWallet }: LogoutButtonViewProps) {
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    await disconnectWallet?.().catch(() => undefined);
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    window.location.href = "/";
  }

  return (
    <button className={className || "icon-button"} type="button" disabled={busy} onClick={logout}>
      {busy ? "..." : "ログアウト"}
    </button>
  );
}

function WagmiLogoutButton(props: Props) {
  const { disconnectAsync } = useDisconnect();

  return <LogoutButtonView {...props} disconnectWallet={disconnectAsync} />;
}

export function LogoutButton(props: Props) {
  const runtime = useAppKitRuntime();

  if (!runtime.ready) {
    return <LogoutButtonView {...props} />;
  }

  return <WagmiLogoutButton {...props} />;
}

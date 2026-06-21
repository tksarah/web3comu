import Link from "next/link";

import { WalletLoginButton } from "@/components/WalletLoginButton";

export function AdminLogin() {
  return (
    <main className="admin-login-page">
      <section className="pixel-panel auth-panel">
        <h1>管理者ログイン</h1>
        <WalletLoginButton intent="admin" label="管理ウォレットで接続" redirectTo="/admin" />
        <Link className="text-link" href="/">
          LPへ戻る
        </Link>
      </section>
    </main>
  );
}

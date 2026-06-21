import type { Metadata } from "next";
import type { ReactNode } from "react";

import "@/app/globals.css";
import { AppKitRuntimeProvider } from "@/components/AppKitRuntimeProvider";
import { getAppName } from "@/lib/env";

export const metadata: Metadata = {
  title: getAppName(),
  description: "Token gated community portal"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <AppKitRuntimeProvider>{children}</AppKitRuntimeProvider>
      </body>
    </html>
  );
}

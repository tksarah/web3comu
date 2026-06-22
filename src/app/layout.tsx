import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";

import "@/app/globals.css";
import { AppKitRuntimeProvider } from "@/components/AppKitRuntimeProvider";
import { PageTransition } from "@/components/PageTransition";
import { getAppName } from "@/lib/env";

export const metadata: Metadata = {
  title: getAppName(),
  description: "Token gated community portal",
  icons: {
    icon: [
      { url: "/icons/site-crest-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/site-crest-48.png", sizes: "48x48", type: "image/png" },
      { url: "/icons/site-crest-512.png", sizes: "512x512", type: "image/png" }
    ],
    apple: [{ url: "/icons/site-crest-180.png", sizes: "180x180", type: "image/png" }]
  }
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <AppKitRuntimeProvider>
          <Suspense fallback={children}>
            <PageTransition>{children}</PageTransition>
          </Suspense>
        </AppKitRuntimeProvider>
      </body>
    </html>
  );
}

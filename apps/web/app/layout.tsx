import { type Metadata } from "next";

import { PostHogProvider } from "@/components/providers/PostHogProvider";
import { SentryProvider } from "@/components/providers/SentryProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { TRPCReactProvider } from "@/trpc/react";

import "@/styles/globals.css";

import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: { default: "Acme", template: "%s | Acme" },
  description: "Acme is a platform for managing your business.",
  keywords: ["acme", "platform", "business", "management"],
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class">
          <TRPCReactProvider>
            <SentryProvider>
              <PostHogProvider>{children}</PostHogProvider>
            </SentryProvider>
          </TRPCReactProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}

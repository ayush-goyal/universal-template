import { type Metadata } from "next";
import { ThemeProvider } from "next-themes";

import { PostHogProvider } from "@/components/providers/PostHogProvider";
import { SentryProvider } from "@/components/providers/SentryProvider";
import { ORPCReactProvider } from "@/orpc/react";

import "@/styles/globals.css";

import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "Acme",
  description: "Acme is a platform for managing your business.",
  keywords: ["acme", "platform", "business", "management"],
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      {
        url: "/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: "/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class">
          <ORPCReactProvider>
            <SentryProvider>
              <PostHogProvider>{children}</PostHogProvider>
            </SentryProvider>
          </ORPCReactProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}

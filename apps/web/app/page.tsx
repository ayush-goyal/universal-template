import type { Metadata } from "next";

import {
  CallToAction,
  Features,
  Hero,
  MarketingFooter,
  MarketingHeaderClient,
  PricingTeaser,
  Showcase,
} from "@/components/landing";

export const metadata: Metadata = {
  title: "Acme Tasks — the calm to-do list",
  description:
    "A modern, soft, AI-friendly Todoist clone. Inbox, smart views, AI quick-add, reminders, and unlimited projects.",
};

export default function HomePage() {
  return (
    <div className="bg-background text-foreground min-h-screen">
      {/* Uses the client variant so the header reads `useSession` after
          hydration. Keeps the landing page statically prerenderable for
          anonymous visitors (the vast majority). Signed-in users see
          "Open app" once their session resolves on the client. */}
      <MarketingHeaderClient />
      <Hero />
      <Showcase />
      <Features />
      <PricingTeaser />
      <CallToAction />
      <MarketingFooter />
    </div>
  );
}

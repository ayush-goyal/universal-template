import type { Metadata } from "next";

import {
  CallToAction,
  Features,
  Hero,
  MarketingFooter,
  MarketingHeader,
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
      <MarketingHeader />
      <Hero />
      <Showcase />
      <Features />
      <PricingTeaser />
      <CallToAction />
      <MarketingFooter />
    </div>
  );
}

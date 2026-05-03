import type { Metadata } from "next";
import { headers } from "next/headers";

import { auth } from "@acme/auth";

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

export default async function HomePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const isSignedIn = !!session?.user;
  return (
    <div className="bg-background text-foreground min-h-screen">
      <MarketingHeader isSignedIn={isSignedIn} />
      <Hero />
      <Showcase />
      <Features />
      <PricingTeaser />
      <CallToAction />
      <MarketingFooter />
    </div>
  );
}

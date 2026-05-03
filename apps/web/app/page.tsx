import {
  CallToAction,
  Features,
  Hero,
  MarketingFooter,
  MarketingHeader,
  PricingTeaser,
  Showcase,
} from "@/components/landing";

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

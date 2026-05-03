import {
  CallToAction,
  Features,
  Hero,
  MarketingFooter,
  MarketingHeader,
} from "@/components/landing";

export default function HomePage() {
  return (
    <div className="bg-background text-foreground min-h-screen">
      <MarketingHeader />
      <Hero />
      <Features />
      <CallToAction />
      <MarketingFooter />
    </div>
  );
}

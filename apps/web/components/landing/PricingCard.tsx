import { Check, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";

interface Props {
  name: string;
  price: string;
  priceSuffix?: string;
  caption: string;
  cta: React.ReactNode;
  features: string[];
  highlighted?: boolean;
  badge?: string;
}

export function PricingCard({
  name,
  price,
  priceSuffix,
  caption,
  cta,
  features,
  highlighted,
  badge,
}: Props) {
  return (
    <div
      className={cn(
        "bg-card relative rounded-2xl border p-8",
        highlighted ? "border-primary border-2 shadow-md" : "shadow-sm"
      )}
    >
      {badge ? (
        <span className="bg-primary text-primary-foreground absolute -top-3 left-6 rounded-full px-3 py-1 text-xs font-medium">
          {badge}
        </span>
      ) : null}
      <div
        className={cn(
          "mb-1 flex items-center gap-2 text-sm font-medium tracking-wider uppercase",
          highlighted ? "text-primary" : "text-muted-foreground"
        )}
      >
        {highlighted ? <Sparkles className="size-4" /> : null}
        {name}
      </div>
      <div className="text-4xl font-semibold tracking-tight">
        {price}
        {priceSuffix ? (
          <span className="text-muted-foreground text-base font-normal">{priceSuffix}</span>
        ) : null}
      </div>
      <p className="text-muted-foreground mt-1 text-sm">{caption}</p>
      <div className="mt-6">{cta}</div>
      <ul className="mt-6 space-y-2 text-sm">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <Check className="text-primary mt-0.5 size-4" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

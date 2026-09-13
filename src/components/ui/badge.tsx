import { cn } from "@/lib/utils";

export function Badge({
  className,
  tone = "stone",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: "stone" | "gold" | "garnet" | "wool" }) {
  const tones = {
    stone: "border-border text-muted-foreground",
    gold: "border-gold/50 text-gold",
    garnet: "border-garnet/40 text-garnet",
    wool: "border-wool/40 text-wool",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium tracking-wide",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}

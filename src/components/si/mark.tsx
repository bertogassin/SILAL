import { cn } from "@/lib/utils";

export function SiMark({ className, gold = true }: { className?: string; gold?: boolean }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={cn("text-foreground", className)}
      aria-hidden="true"
      fill="none"
    >
      <rect x="2" y="2" width="60" height="60" rx="16" className="fill-card stroke-border" strokeWidth="1" />
      <path
        d="M12 46 L32 18 L52 46"
        className={gold ? "stroke-gold" : "stroke-wool"}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M22 46 L32 32 L42 46"
        className="stroke-wool/70"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path
        d="M22 26 C22 21 26 18 32 18 C38.5 18 42 21.5 42 25.5 C42 31 36 33 31 35 C25 37.2 22 40 22 45 C22 50.5 27 54 33.5 54 C40 54 44 50.5 44 46"
        className="stroke-foreground"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path d="M18 48 H46" className={gold ? "stroke-gold" : "stroke-wool"} strokeWidth="1.2" />
    </svg>
  );
}

export function SiWordmark({ className, size = "md" }: { className?: string; size?: "sm" | "md" | "lg" }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <SiMark className={size === "lg" ? "size-10" : size === "sm" ? "size-7" : "size-8"} />
      <span
        className={cn(
          "si-brand leading-none text-foreground",
          size === "lg" ? "text-2xl" : size === "sm" ? "text-base" : "text-xl",
        )}
      >
        SILAL
      </span>
    </div>
  );
}

import * as React from "react";
import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    className={cn(
      "flex min-h-28 w-full rounded-lg border border-border bg-background px-3 py-2 text-base text-foreground placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:border-gold focus-visible:ring-2 focus-visible:ring-gold/30",
      className,
    )}
    ref={ref}
    {...props}
  />
));
Textarea.displayName = "Textarea";

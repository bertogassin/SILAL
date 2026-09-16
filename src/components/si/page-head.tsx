import type { ReactNode } from "react";

export function PageHead({
  kicker,
  title,
  children,
}: {
  kicker?: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <header className="mb-0">
      {kicker ? <p className="si-kicker">{kicker}</p> : null}
      <h1 className="mt-1 font-display text-2xl tracking-tight md:text-3xl">{title}</h1>
      {children ? <div className="mt-1 text-sm text-muted-foreground text-pretty">{children}</div> : null}
    </header>
  );
}

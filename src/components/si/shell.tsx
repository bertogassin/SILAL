import { Link, useRouterState } from "@tanstack/react-router";
import {
  Archive,
  BadgeCheck,
  Calendar,
  GitFork,
  Home,
  Menu,
  Scale,
  Settings,
  Users,
  Wallet,
  Coins,
  Gift,
  Globe,
  BookOpen,
  Landmark,
  Lock,
} from "lucide-react";
import { type ReactNode, useState } from "react";
import { useT } from "@/lib/si/use-t";
import { useSi } from "@/lib/si/store";
import { playSound } from "@/lib/si/sounds";
import { cn } from "@/lib/utils";
import { SiWordmark } from "./mark";
import { FindBar } from "./find-bar";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

const tabs = [
  { to: "/", icon: Home, key: "nav.home" as const },
  { to: "/silsila", icon: GitFork, key: "nav.tree" as const },
  { to: "/wallet", icon: Wallet, key: "nav.wallet" as const },
  { to: "/house", icon: Landmark, key: "nav.house" as const },
];

const more = [
  { to: "/events", icon: Calendar, key: "nav.events" as const },
  { to: "/archive", icon: Archive, key: "nav.archive" as const },
  { to: "/cred", icon: BadgeCheck, key: "nav.cred" as const },
  { to: "/mekhk", icon: Scale, key: "nav.mekhk" as const },
  { to: "/circle", icon: Users, key: "nav.circle" as const },
  { to: "/referrals", icon: Gift, key: "nav.referrals" as const },
  { to: "/token", icon: Coins, key: "nav.token" as const },
  { to: "/network", icon: Globe, key: "nav.network" as const },
  { to: "/custom", icon: BookOpen, key: "nav.custom" as const },
  { to: "/settings", icon: Settings, key: "nav.settings" as const },
];

export function Shell({ children }: { children: ReactNode }) {
  const t = useT();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const lock = useSi((s) => s.lock);
  const [open, setOpen] = useState(false);

  return (
    <div className="relative min-h-dvh bg-background text-foreground">
      <a
        href="#si-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-card focus:px-3 focus:py-2"
      >
        {t("common.skip")}
      </a>
      <div className="si-grain pointer-events-none absolute inset-0 opacity-15 md:opacity-25" />
      <div className="relative mx-auto flex min-h-dvh w-full max-w-6xl">
        <aside className="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col border-r border-border px-4 py-6 md:flex">
          <Link to="/" className="mb-6 flex items-center gap-2 px-2">
            <SiWordmark />
          </Link>
          <nav className="flex flex-1 flex-col gap-1">
            {[...tabs, ...more].map((item) => (
              <NavLink key={item.to} to={item.to} icon={item.icon} active={pathname === item.to}>
                {t(item.key)}
              </NavLink>
            ))}
          </nav>
          <button
            type="button"
            className="mt-4 flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm text-muted-foreground"
            onClick={() => {
              void playSound("ui_tap");
              lock();
            }}
          >
            <Lock className="size-4" />
            {t("common.lock")}
          </button>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between px-4 pb-2 pt-[max(1rem,env(safe-area-inset-top))] md:hidden">
            <Link to="/" className="flex items-center">
              <SiWordmark size="sm" />
            </Link>
            <div className="flex items-center">
              <button
                type="button"
                className="flex size-11 items-center justify-center rounded-lg text-muted-foreground"
                aria-label={t("common.lock")}
                onClick={() => {
                  void playSound("ui_tap");
                  lock();
                }}
              >
                <Lock className="size-5" />
              </button>
              <Link
                to="/settings"
                className="flex size-11 items-center justify-center rounded-lg text-muted-foreground"
                aria-label={t("nav.settings")}
              >
                <Settings className="size-5" />
              </Link>
            </div>
          </header>
          <main id="si-main" className="flex-1 px-3 pb-24 pt-1 md:px-6 md:pb-8 md:pt-6">
            <FindBar />
            {children}
          </main>
        </div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm md:hidden">
        <ul className="mx-auto grid max-w-lg grid-cols-5">
          {tabs.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.to;
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  onClick={() => void playSound("ui_tap")}
                  className={cn(
                    "flex h-12 flex-col items-center justify-center gap-0.5 text-xs",
                    active ? "si-tab-on" : "text-muted-foreground",
                  )}
                >
                  <Icon className="size-5" strokeWidth={active ? 2 : 1.5} />
                  {t(item.key)}
                </Link>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              onClick={() => {
                void playSound("ui_tap");
                setOpen(true);
              }}
              className={cn(
                "flex h-12 w-full flex-col items-center justify-center gap-0.5 text-xs",
                more.some((m) => m.to === pathname) ? "si-tab-on" : "text-muted-foreground",
              )}
            >
              <Menu className="size-5" strokeWidth={1.5} />
              {t("nav.more")}
            </button>
          </li>
        </ul>
      </nav>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom">
          <SheetTitle className="mb-4">{t("nav.more")}</SheetTitle>
          <div className="grid gap-2">
            {more.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => {
                    void playSound("ui_tap");
                    setOpen(false);
                  }}
                  className="flex min-h-12 items-center gap-3 rounded-xl border border-border bg-card px-4"
                >
                  <Icon className="size-4 text-wool" />
                  {t(item.key)}
                </Link>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function NavLink({
  to,
  icon: Icon,
  active,
  children,
}: {
  to: string;
  icon: typeof Home;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      to={to}
      onClick={() => void playSound("ui_tap")}
      className={cn(
        "flex h-11 items-center gap-3 rounded-xl border-l-2 px-3 text-sm",
        active
          ? "border-gold bg-card text-foreground"
          : "border-transparent text-muted-foreground hover:bg-card/60 hover:text-foreground",
      )}
    >
      <Icon className={cn("size-4", active && "text-gold")} strokeWidth={1.6} />
      {children}
    </Link>
  );
}

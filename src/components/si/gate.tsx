import type { ReactNode } from "react";
import { useSi } from "@/lib/si/store";
import { Onboarding } from "./onboarding";
import { UnlockScreen } from "./unlock";

export function Gate({ children }: { children: ReactNode }) {
  const onboarded = useSi((s) => s.onboardingComplete);
  const unlocked = useSi((s) => s.session.unlocked);
  const vault = useSi((s) => s.vault);
  if (vault && !unlocked) return <UnlockScreen />;
  if (!onboarded) return <Onboarding />;
  return <>{children}</>;
}

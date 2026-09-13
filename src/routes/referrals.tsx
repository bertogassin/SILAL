import { createFileRoute } from "@tanstack/react-router";
import { Gate } from "@/components/si/gate";
import { Shell } from "@/components/si/shell";
import { ReferralsScreen } from "@/components/si/referrals-screen";

export const Route = createFileRoute("/referrals")({ component: Page });

function Page() {
  return (
    <Gate>
      <Shell>
        <ReferralsScreen />
      </Shell>
    </Gate>
  );
}

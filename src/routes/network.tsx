import { createFileRoute } from "@tanstack/react-router";
import { Gate } from "@/components/si/gate";
import { Shell } from "@/components/si/shell";
import { NetworkScreen } from "@/components/si/network-screen";

export const Route = createFileRoute("/network")({ component: Page });

function Page() {
  return (
    <Gate>
      <Shell>
        <NetworkScreen />
      </Shell>
    </Gate>
  );
}

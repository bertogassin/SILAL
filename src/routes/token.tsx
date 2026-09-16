import { createFileRoute } from "@tanstack/react-router";
import { Gate } from "@/components/si/gate";
import { Shell } from "@/components/si/shell";
import { TokenScreen } from "@/components/si/token-screen";

export const Route = createFileRoute("/token")({ component: Page });

function Page() {
  return (
    <Gate>
      <Shell>
        <TokenScreen />
      </Shell>
    </Gate>
  );
}

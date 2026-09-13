import { createFileRoute } from "@tanstack/react-router";
import { Gate } from "@/components/si/gate";
import { Shell } from "@/components/si/shell";
import { CredScreen } from "@/components/si/cred-screen";

export const Route = createFileRoute("/cred")({ component: Page });

function Page() {
  return (
    <Gate>
      <Shell>
        <CredScreen />
      </Shell>
    </Gate>
  );
}

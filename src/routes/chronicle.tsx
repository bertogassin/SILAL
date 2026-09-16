import { createFileRoute } from "@tanstack/react-router";
import { Gate } from "@/components/si/gate";
import { Shell } from "@/components/si/shell";
import { ChronicleScreen } from "@/components/si/chronicle-screen";

export const Route = createFileRoute("/chronicle")({ component: Page });

function Page() {
  return (
    <Gate>
      <Shell>
        <ChronicleScreen />
      </Shell>
    </Gate>
  );
}

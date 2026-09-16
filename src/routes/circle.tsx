import { createFileRoute } from "@tanstack/react-router";
import { Gate } from "@/components/si/gate";
import { Shell } from "@/components/si/shell";
import { CircleScreen } from "@/components/si/circle-screen";

export const Route = createFileRoute("/circle")({ component: Page });

function Page() {
  return (
    <Gate>
      <Shell>
        <CircleScreen />
      </Shell>
    </Gate>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { Gate } from "@/components/si/gate";
import { Shell } from "@/components/si/shell";
import { MekhkScreen } from "@/components/si/mekhk-screen";

export const Route = createFileRoute("/mekhk")({ component: Page });

function Page() {
  return (
    <Gate>
      <Shell>
        <MekhkScreen />
      </Shell>
    </Gate>
  );
}

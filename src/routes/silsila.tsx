import { createFileRoute } from "@tanstack/react-router";
import { Gate } from "@/components/si/gate";
import { Shell } from "@/components/si/shell";
import { SilsilaScreen } from "@/components/si/silsila-screen";

export const Route = createFileRoute("/silsila")({ component: Page });

function Page() {
  return (
    <Gate>
      <Shell>
        <SilsilaScreen />
      </Shell>
    </Gate>
  );
}

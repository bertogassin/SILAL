import { createFileRoute } from "@tanstack/react-router";
import { Gate } from "@/components/si/gate";
import { Shell } from "@/components/si/shell";
import { CustomScreen } from "@/components/si/custom-screen";

export const Route = createFileRoute("/custom")({ component: Page });

function Page() {
  return (
    <Gate>
      <Shell>
        <CustomScreen />
      </Shell>
    </Gate>
  );
}

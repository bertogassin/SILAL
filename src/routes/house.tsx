import { createFileRoute } from "@tanstack/react-router";
import { Gate } from "@/components/si/gate";
import { Shell } from "@/components/si/shell";
import { HouseScreen } from "@/components/si/house-screen";

export const Route = createFileRoute("/house")({ component: Page });

function Page() {
  return (
    <Gate>
      <Shell>
        <HouseScreen />
      </Shell>
    </Gate>
  );
}

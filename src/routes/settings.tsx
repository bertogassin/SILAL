import { createFileRoute } from "@tanstack/react-router";
import { Gate } from "@/components/si/gate";
import { Shell } from "@/components/si/shell";
import { SettingsScreen } from "@/components/si/settings-screen";

export const Route = createFileRoute("/settings")({ component: Page });

function Page() {
  return (
    <Gate>
      <Shell>
        <SettingsScreen />
      </Shell>
    </Gate>
  );
}

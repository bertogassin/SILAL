import { createFileRoute } from "@tanstack/react-router";
import { Gate } from "@/components/si/gate";
import { Shell } from "@/components/si/shell";
import { ArchiveScreen } from "@/components/si/archive-screen";

export const Route = createFileRoute("/archive")({ component: Page });

function Page() {
  return (
    <Gate>
      <Shell>
        <ArchiveScreen />
      </Shell>
    </Gate>
  );
}

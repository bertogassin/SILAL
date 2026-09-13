import { createFileRoute } from "@tanstack/react-router";
import { Gate } from "@/components/si/gate";
import { Shell } from "@/components/si/shell";
import { EventsScreen } from "@/components/si/events-screen";

export const Route = createFileRoute("/events")({ component: Page });

function Page() {
  return (
    <Gate>
      <Shell>
        <EventsScreen />
      </Shell>
    </Gate>
  );
}

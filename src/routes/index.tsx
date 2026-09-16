import { createFileRoute } from "@tanstack/react-router";
import { Gate } from "@/components/si/gate";
import { Shell } from "@/components/si/shell";
import { HomeScreen } from "@/components/si/home-screen";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return (
    <Gate>
      <Shell>
        <HomeScreen />
      </Shell>
    </Gate>
  );
}

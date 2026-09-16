import { createFileRoute } from "@tanstack/react-router";
import { Gate } from "@/components/si/gate";
import { Shell } from "@/components/si/shell";
import { WalletScreen } from "@/components/si/wallet-screen";

export const Route = createFileRoute("/wallet")({ component: Page });

function Page() {
  return (
    <Gate>
      <Shell>
        <WalletScreen />
      </Shell>
    </Gate>
  );
}

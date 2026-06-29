import { OrdersList } from "@/features/orders";
import { PageShell } from "@/shared/ui/page-shell";

export function HomePage() {
  return (
    <PageShell>
      <OrdersList />
    </PageShell>
  );
}

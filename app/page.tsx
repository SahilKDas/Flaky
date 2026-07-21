import { DashboardClient } from "@/components/dashboard-client";
import { getSeedStore } from "@/lib/demo-data";

export default function Home() {
  return <DashboardClient initialStore={getSeedStore()} />;
}

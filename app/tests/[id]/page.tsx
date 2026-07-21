import { TestDetailClient } from "@/components/test-detail-client";
import { getSeedStore } from "@/lib/demo-data";

export default async function TestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = getSeedStore();
  return <TestDetailClient testId={id} initialStore={store} />;
}

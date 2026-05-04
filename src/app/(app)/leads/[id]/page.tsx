import { redirect } from 'next/navigation';

// Redirección legacy: /leads/[id] → /opportunities/[id]
export default async function LegacyLeadRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/opportunities/${id}`);
}

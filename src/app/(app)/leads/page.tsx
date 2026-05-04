import { redirect } from 'next/navigation';

// Redirección legacy: /leads → /pipeline
export default function LegacyLeadsRedirect() {
  redirect('/pipeline');
}

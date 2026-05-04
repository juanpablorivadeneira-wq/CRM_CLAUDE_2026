'use server';

import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export async function getSession() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  return session as typeof session & {
    orgId: string;
    orgSlug: string;
    orgName: string;
  };
}

export async function getOptionalSession() {
  return auth();
}

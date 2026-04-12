import { getAuthContext } from '@/lib/api/auth';
import { serverError, unauthorized } from '@/lib/api/errors';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function DELETE() {
  try {
    const auth = await getAuthContext();
    if ('error' in auth) return unauthorized();
    const { supabase, user } = auth;

    const serviceRole = await createServiceRoleClient();
    const { error } = await serviceRole.auth.admin.deleteUser(user.id);

    if (error) return serverError(error, 'account/DELETE');

    await supabase.auth.signOut();

    return NextResponse.json({ success: true });
  } catch (error) {
    return serverError(error, 'account/DELETE');
  }
}

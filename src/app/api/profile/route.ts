import { getAuthContext } from '@/lib/api/auth';
import { badRequest, serverError, unauthorized } from '@/lib/api/errors';
import { NextResponse } from 'next/server';
import type { Profile } from '@/types';

const ALLOWED_FIELDS = ['display_name', 'life_context', 'personality', 'core_values'] as const;

/**
 * GET /api/profile
 */
export async function GET() {
  try {
    const auth = await getAuthContext();
    if ('error' in auth) return unauthorized();
    const { supabase, user } = auth;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) return serverError(error, 'profile/GET');

    return NextResponse.json({ profile: data as Profile });
  } catch (error) {
    return serverError(error, 'profile/GET');
  }
}

/**
 * PATCH /api/profile
 */
export async function PATCH(req: Request) {
  try {
    const auth = await getAuthContext();
    if ('error' in auth) return unauthorized();
    const { supabase, user } = auth;

    const body = await req.json();

    // Only allow updating safe fields
    const updates: Record<string, unknown> = {};
    for (const key of ALLOWED_FIELDS) {
      if (key in body) {
        updates[key] = body[key];
      }
    }

    if (Object.keys(updates).length === 0) {
      return badRequest('No valid fields to update');
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) return serverError(error, 'profile/PATCH');

    return NextResponse.json({ profile: data as Profile });
  } catch (error) {
    return serverError(error, 'profile/PATCH');
  }
}

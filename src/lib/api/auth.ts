/**
 * Shared API authentication helper.
 *
 * Extracts repeated auth-check boilerplate from every route handler
 * into a single reusable function.
 */

import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { SupabaseClient, User } from '@supabase/supabase-js';

export interface AuthContext {
  supabase: SupabaseClient;
  user: User;
}

export interface AuthError {
  error: string;
  status: 401;
}

/**
 * Authenticate the current request and return the Supabase client + user.
 * Returns an AuthError if the user is not authenticated.
 *
 * Usage:
 * ```ts
 * const auth = await getAuthContext();
 * if ('error' in auth) {
 *   return NextResponse.json({ error: auth.error }, { status: auth.status });
 * }
 * const { supabase, user } = auth;
 * ```
 */
export async function getAuthContext(): Promise<AuthContext | AuthError> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized', status: 401 };
  }

  return { supabase, user };
}

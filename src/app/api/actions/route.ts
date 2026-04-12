import { getAuthContext } from '@/lib/api/auth';
import { badRequest, serverError, unauthorized } from '@/lib/api/errors';
import { NextResponse } from 'next/server';
import type { ActionTask } from '@/types';

const VALID_STATUSES = ['active', 'completed', 'dismissed'] as const;

export async function GET() {
  try {
    const auth = await getAuthContext();
    if ('error' in auth) return unauthorized();
    const { supabase, user } = auth;

    const { data, error } = await supabase
      .from('action_tasks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) return serverError(error, 'actions/GET');

    return NextResponse.json({ tasks: (data as ActionTask[] | null) ?? [] });
  } catch (error) {
    return serverError(error, 'actions/GET');
  }
}

export async function PATCH(req: Request) {
  try {
    const auth = await getAuthContext();
    if ('error' in auth) return unauthorized();
    const { supabase, user } = auth;

    const { id, status } = await req.json();
    if (!id || !VALID_STATUSES.includes(status)) {
      return badRequest('Invalid payload');
    }

    const now = new Date().toISOString();
    const updates: Record<string, string | null> = {
      status,
      updated_at: now,
      completed_at: status === 'completed' ? now : null,
    };

    const { data, error } = await supabase
      .from('action_tasks')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) return serverError(error, 'actions/PATCH');

    return NextResponse.json({ task: data as ActionTask });
  } catch (error) {
    return serverError(error, 'actions/PATCH');
  }
}

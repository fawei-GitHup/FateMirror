import { getAuthContext } from '@/lib/api/auth';
import { badRequest, notFound, serverError, unauthorized } from '@/lib/api/errors';
import { buildJournalUpdatePayload } from '@/lib/journal/update-payload';
import { NextResponse } from 'next/server';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/journal/:id
 */
export async function GET(_req: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const auth = await getAuthContext();
    if ('error' in auth) return unauthorized();
    const { supabase, user } = auth;

    const { data: journal, error } = await supabase
      .from('journals')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error || !journal) return notFound('Journal not found');

    return NextResponse.json({ journal });
  } catch (error) {
    return serverError(error, 'journal/GET');
  }
}

/**
 * PATCH /api/journal/:id
 */
export async function PATCH(req: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const auth = await getAuthContext();
    if ('error' in auth) return unauthorized();
    const { supabase, user } = auth;

    const body = await req.json();
    let updates: Record<string, unknown>;
    try {
      updates = buildJournalUpdatePayload(body);
    } catch (err) {
      return badRequest(err instanceof Error ? err.message : 'Invalid payload');
    }

    if (Object.keys(updates).length === 0) {
      return badRequest('No editable fields provided');
    }

    const { data: journal, error } = await supabase
      .from('journals')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id)
      .select('*')
      .single();

    if (error || !journal) return notFound('Journal not found');

    return NextResponse.json({ journal });
  } catch (error) {
    return serverError(error, 'journal/PATCH');
  }
}

/**
 * DELETE /api/journal/:id
 */
export async function DELETE(_req: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const auth = await getAuthContext();
    if ('error' in auth) return unauthorized();
    const { supabase, user } = auth;

    const { error } = await supabase
      .from('journals')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) return serverError(error, 'journal/DELETE');

    return NextResponse.json({ success: true });
  } catch (error) {
    return serverError(error, 'journal/DELETE');
  }
}

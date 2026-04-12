import { getAuthContext } from '@/lib/api/auth';
import { badRequest, notFound, serverError, unauthorized } from '@/lib/api/errors';
import { buildLifeNodePatchPayload } from '@/lib/tree/node-mutations';
import { NextResponse } from 'next/server';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const auth = await getAuthContext();
    if ('error' in auth) return unauthorized();
    const { supabase, user } = auth;

    const body = await req.json();
    const payload = buildLifeNodePatchPayload(body);
    if (Object.keys(payload).length === 0) {
      return badRequest('No mutable fields provided');
    }

    const { data: node, error } = await supabase
      .from('life_nodes')
      .update(payload)
      .eq('id', id)
      .eq('user_id', user.id)
      .select('*')
      .single();

    if (error || !node) return notFound('Node not found');

    return NextResponse.json({ node });
  } catch (error) {
    return serverError(error, 'tree/PATCH');
  }
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const auth = await getAuthContext();
    if ('error' in auth) return unauthorized();
    const { supabase, user } = auth;

    const { error } = await supabase
      .from('life_nodes')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) return serverError(error, 'tree/DELETE');

    return NextResponse.json({ success: true });
  } catch (error) {
    return serverError(error, 'tree/DELETE');
  }
}

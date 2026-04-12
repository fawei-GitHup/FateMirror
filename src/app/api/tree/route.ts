import { getAuthContext } from '@/lib/api/auth';
import { badRequest, serverError, unauthorized } from '@/lib/api/errors';
import { computeTreeLayout } from '@/lib/tree/layout-engine';
import { attachJournalPreviewsToLayout } from '@/lib/tree/node-journal-map';
import { getEntitlements, resolvePlan } from '@/lib/billing/entitlements';
import { NextResponse } from 'next/server';
import type { Journal, LifeNode, Subscription } from '@/types';
import { buildLifeNodeCreatePayload } from '@/lib/tree/node-mutations';

/**
 * GET /api/tree
 * Returns the computed tree layout for the current user.
 */
export async function GET(req: Request) {
  try {
    const auth = await getAuthContext();
    if ('error' in auth) return unauthorized();
    const { supabase, user } = auth;

    const url = new URL(req.url);
    const width = Math.max(1, parseInt(url.searchParams.get('width') || '800', 10) || 800);
    const height = Math.max(1, parseInt(url.searchParams.get('height') || '600', 10) || 600);

    const [nodesResult, subResult, journalsResult] = await Promise.all([
      supabase
        .from('life_nodes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true }),
      supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase
        .from('journals')
        .select('id,title,created_at')
        .eq('user_id', user.id),
    ]);

    const allLifeNodes = (nodesResult.data as LifeNode[]) ?? [];
    const plan = resolvePlan((subResult.data as Subscription | null) ?? null);
    const entitlements = getEntitlements(plan);
    const lifeNodes =
      entitlements.treeNodeLimit === null
        ? allLifeNodes
        : allLifeNodes.slice(0, entitlements.treeNodeLimit);
    const truncated = lifeNodes.length < allLifeNodes.length;

    if (lifeNodes.length === 0) {
      return NextResponse.json({
        layout: { nodes: [], links: [], patternLinks: [], width, height },
        nodeCount: 0,
        totalNodeCount: 0,
        plan,
        truncated: false,
      });
    }

    const layout = attachJournalPreviewsToLayout(
      computeTreeLayout(lifeNodes, width, height),
      ((journalsResult.data as Pick<Journal, 'id' | 'title' | 'created_at'>[]) ?? []).map((j) => ({
        id: j.id,
        title: j.title,
        created_at: j.created_at,
      })),
    );

    return NextResponse.json({
      layout,
      nodeCount: lifeNodes.length,
      totalNodeCount: allLifeNodes.length,
      plan,
      truncated,
      limit: entitlements.treeNodeLimit,
    });
  } catch (error) {
    return serverError(error, 'tree/GET');
  }
}

/**
 * POST /api/tree
 * Create a life node.
 */
export async function POST(req: Request) {
  try {
    const auth = await getAuthContext();
    if ('error' in auth) return unauthorized();
    const { supabase, user } = auth;

    const body = await req.json();
    let payload: ReturnType<typeof buildLifeNodeCreatePayload>;
    try {
      payload = buildLifeNodeCreatePayload(user.id, body);
    } catch (err) {
      return badRequest(err instanceof Error ? err.message : 'Invalid payload');
    }

    const { data: node, error } = await supabase
      .from('life_nodes')
      .insert(payload)
      .select('*')
      .single();

    if (error) return serverError(error, 'tree/POST');

    return NextResponse.json({ node }, { status: 201 });
  } catch (error) {
    return serverError(error, 'tree/POST');
  }
}

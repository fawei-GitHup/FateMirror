import { getAuthContext } from '@/lib/api/auth';
import { notFound, serverError, unauthorized } from '@/lib/api/errors';
import { buildChapterDetail } from '@/lib/chapters/serializers';
import { NextResponse } from 'next/server';
import type { Chapter, Journal, LifeNode } from '@/types';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const auth = await getAuthContext();
    if ('error' in auth) return unauthorized();
    const { supabase, user } = auth;

    const { data: chapterData, error: chapterError } = await supabase
      .from('chapters')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (chapterError || !chapterData) return notFound('Chapter not found');

    const chapter = chapterData as Chapter;

    const [journalsResult, nodesResult] = await Promise.all([
      supabase
        .from('journals')
        .select('id,title,created_at,user_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true }),
      supabase
        .from('life_nodes')
        .select('id,chapter_id')
        .eq('user_id', user.id)
        .eq('chapter_id', chapter.id),
    ]);

    return NextResponse.json({
      chapter: buildChapterDetail(
        chapter,
        (journalsResult.data as Journal[]) ?? [],
        (nodesResult.data as LifeNode[]) ?? [],
      ),
    });
  } catch (error) {
    return serverError(error, 'chapters/[id]/GET');
  }
}

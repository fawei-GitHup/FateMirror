import { getAuthContext } from '@/lib/api/auth';
import { serverError, unauthorized } from '@/lib/api/errors';
import { buildChapterSummaries } from '@/lib/chapters/serializers';
import { NextResponse } from 'next/server';
import type { Chapter, Journal, LifeNode } from '@/types';

export async function GET() {
  try {
    const auth = await getAuthContext();
    if ('error' in auth) return unauthorized();
    const { supabase, user } = auth;

    const [chaptersResult, journalsResult, nodesResult] = await Promise.all([
      supabase.from('chapters').select('*').eq('user_id', user.id).order('number', { ascending: true }),
      supabase.from('journals').select('id,title,created_at,user_id').eq('user_id', user.id).order('created_at', { ascending: true }),
      supabase.from('life_nodes').select('id,chapter_id').eq('user_id', user.id),
    ]);

    return NextResponse.json({
      chapters: buildChapterSummaries(
        (chaptersResult.data as Chapter[]) ?? [],
        (journalsResult.data as Journal[]) ?? [],
        (nodesResult.data as LifeNode[]) ?? [],
      ),
    });
  } catch (error) {
    return serverError(error, 'chapters/GET');
  }
}

import { getAuthContext } from '@/lib/api/auth';
import { badRequest, serverError, unauthorized } from '@/lib/api/errors';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const auth = await getAuthContext();
    if ('error' in auth) return unauthorized();
    const { supabase, user } = auth;

    const body = await req.json();
    const {
      title,
      content,
      mode,
      emotions = [],
      themes = [],
      decisions = [],
      insights = [],
      thinking_patterns = [],
      behavior_patterns = [],
      ai_summary,
    } = body;

    if (!content || content.trim().length === 0) {
      return badRequest('Content is required');
    }

    const wordCount = content.trim().split(/\s+/).length;
    // Detect language: if >30% Chinese chars, mark as zh
    const chineseChars = (content.match(/[\u4e00-\u9fff]/g) || []).length;
    const language = content.length > 0 && chineseChars / content.length > 0.3 ? 'zh' : 'en';

    const { data: journal, error } = await supabase
      .from('journals')
      .insert({
        user_id: user.id,
        title: title || null,
        content,
        mode: mode || 'freewrite',
        emotions,
        themes,
        decisions,
        insights,
        thinking_patterns,
        behavior_patterns,
        ai_summary: ai_summary || null,
        word_count: wordCount,
        language,
      })
      .select()
      .single();

    if (error) {
      return serverError(error, 'journal/insert');
    }

    return NextResponse.json({ journal }, { status: 201 });
  } catch (error) {
    return serverError(error, 'journal/POST');
  }
}

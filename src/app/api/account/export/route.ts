import { getAuthContext } from '@/lib/api/auth';
import { serverError, unauthorized } from '@/lib/api/errors';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const auth = await getAuthContext();
    if ('error' in auth) return unauthorized();
    const { supabase, user } = auth;

    const [
      { data: profile },
      { data: journals },
      { data: patterns },
      { data: habitLoops },
      { data: lifeNodes },
      { data: chapters },
      { data: conversations },
      { data: subscription },
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('journals').select('*').eq('user_id', user.id).order('created_at', { ascending: true }),
      supabase.from('patterns').select('*').eq('user_id', user.id).order('created_at', { ascending: true }),
      supabase.from('habit_loops').select('*').eq('user_id', user.id).order('created_at', { ascending: true }),
      supabase.from('life_nodes').select('*').eq('user_id', user.id).order('date', { ascending: true }),
      supabase.from('chapters').select('*').eq('user_id', user.id).order('number', { ascending: true }),
      supabase.from('conversations').select('*').eq('user_id', user.id).order('created_at', { ascending: true }),
      supabase.from('subscriptions').select('*').eq('user_id', user.id).maybeSingle(),
    ]);

    return NextResponse.json({
      exported_at: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email ?? null,
      },
      data: {
        profile,
        journals: journals ?? [],
        patterns: patterns ?? [],
        habit_loops: habitLoops ?? [],
        life_nodes: lifeNodes ?? [],
        chapters: chapters ?? [],
        conversations: conversations ?? [],
        subscription,
      },
    });
  } catch (error) {
    return serverError(error, 'account/export');
  }
}

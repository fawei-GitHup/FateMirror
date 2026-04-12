import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// In-memory rate-limit store (resets on redeploy; fine for now)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

const MAX_PER_DAY = 5;

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);

  if (!entry || now > entry.resetAt) {
    // Start a new 24-hour window
    rateLimitMap.set(userId, { count: 1, resetAt: now + 24 * 60 * 60 * 1000 });
    return false;
  }

  if (entry.count >= MAX_PER_DAY) {
    return true;
  }

  entry.count += 1;
  return false;
}

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (isRateLimited(user.id)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Max 5 feedback submissions per day.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { type, rating, message, pageUrl } = body as {
      type: string;
      rating: number;
      message: string;
      pageUrl?: string;
    };

    // Validate
    if (!type || typeof rating !== 'number' || rating < 0 || rating > 5) {
      return NextResponse.json({ error: 'Invalid feedback payload' }, { status: 400 });
    }

    // For now, log to console (no feedback table yet)
    console.log('[Feedback]', {
      user_id: user.id,
      email: user.email,
      type,
      rating,
      message,
      page_url: pageUrl ?? null,
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Feedback] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

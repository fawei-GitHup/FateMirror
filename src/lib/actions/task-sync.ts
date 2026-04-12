import type { SupabaseClient } from '@supabase/supabase-js';
import type { ActionTask, HabitLoop, Profile } from '@/types';
import type { Locale } from '@/i18n/config';
import { buildMicroActions } from '@/lib/actions/micro-actions';

export async function syncActionTasks(
  supabase: SupabaseClient,
  userId: string,
  profile: Profile | null,
  loops: HabitLoop[],
  locale: Locale = 'en'
): Promise<ActionTask[]> {
  const generated = buildMicroActions(profile, loops, locale);

  const activeLoop =
    loops.find((loop) => loop.status === 'breaking') ??
    loops.find((loop) => loop.status === 'active') ??
    null;

  const { data: existingData } = await supabase
    .from('action_tasks')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['active', 'completed']);

  const existing = (existingData as ActionTask[] | null) ?? [];
  const existingByPrompt = new Map(existing.map((task) => [task.prompt, task]));
  const generatedPrompts = new Set(generated.map((task) => task.prompt));

  for (const task of existing) {
    if (task.status === 'active' && !generatedPrompts.has(task.prompt)) {
      await supabase
        .from('action_tasks')
        .update({ status: 'dismissed', updated_at: new Date().toISOString() })
        .eq('id', task.id);
    }
  }

  for (const task of generated) {
    const existingTask = existingByPrompt.get(task.prompt);
    if (!existingTask) {
      await supabase.from('action_tasks').insert({
        user_id: userId,
        title: task.title,
        reason: task.reason,
        prompt: task.prompt,
        source: 'system',
        status: 'active',
        habit_loop_id: activeLoop?.id ?? null,
      });
    }
  }

  const { data: refreshedData } = await supabase
    .from('action_tasks')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(5);

  return (refreshedData as ActionTask[] | null) ?? [];
}

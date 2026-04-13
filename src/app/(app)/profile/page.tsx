import { getLocale, getTranslations } from 'next-intl/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, Target, RotateCcw, Flame, TrendingUp, ListTodo } from 'lucide-react';
import type { Profile, HabitLoop, ActionTask } from '@/types';
import { ThinkingLevel } from '@/components/cognition/ThinkingLevel';
import { BehaviorRadar } from '@/components/cognition/BehaviorRadar';
import { HabitLoopCard } from '@/components/cognition/HabitLoopCard';
import { ActionTaskList } from './ActionTaskList';
import { formatLocalizedDate } from '@/lib/i18n/format-date';

export default async function ProfilePage() {
  const locale = await getLocale();
  const t = await getTranslations('profile');
  const tJournal = await getTranslations('journal');
  const tLevels = await getTranslations('levels');
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profileData }, { data: loopsData }, { count: journalCount }, { data: tasksData }] =
    await Promise.all([
      supabase.from('profiles').select('*').eq('user_id', user!.id).single(),
      supabase.from('habit_loops').select('*').eq('user_id', user!.id).order('trigger_count', { ascending: false }).limit(5),
      supabase.from('journals').select('id', { count: 'exact', head: true }).eq('user_id', user!.id),
      supabase.from('action_tasks').select('*').eq('user_id', user!.id).in('status', ['active', 'completed']).order('created_at', { ascending: false }).limit(5),
    ]);

  const profile = profileData as Profile | null;
  const habitLoops = (loopsData as HabitLoop[]) || [];
  const totalJournalCount = journalCount ?? 0;
  const hasEnoughData = (profile?.cognition_version ?? 0) > 0;
  const actionTasks = (tasksData as ActionTask[]) || [];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flame className="size-5 text-orange-400" />
            {t('level', { level: profile?.level ?? 0, name: tLevels(`level${profile?.level ?? 0}` as 'level0') })}
          </CardTitle>
          <CardDescription>{t(`levelDescription${profile?.level ?? 0}` as 'levelDescription0')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>{t('journalEntries', { count: totalJournalCount })}</span>
            <span>{t('cognitionVersion', { version: profile?.cognition_version ?? 0 })}</span>
            {profile?.cognition_updated_at && (
              <span>{t('updated', { date: formatLocalizedDate(profile.cognition_updated_at, locale) })}</span>
            )}
          </div>
        </CardContent>
      </Card>

      {!hasEnoughData ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center space-y-3 py-12">
            <Brain className="size-10 text-muted-foreground/30" />
            <div className="space-y-1 text-center">
              <h3 className="font-semibold">{t('notEnoughData')}</h3>
              <p className="max-w-sm text-sm text-muted-foreground">{t('notEnoughDescription')}</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Brain className="size-4" />
                {t('thinking')}
              </CardTitle>
              <CardDescription>{t('thinkingDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              <ThinkingLevel
                level={profile?.thinking_level_overall ?? 'L1'}
                byTheme={profile?.thinking_levels_by_theme as Record<string, 'L1' | 'L2' | 'L3' | 'L4'>}
              />
              {profile?.thinking_distortions && profile.thinking_distortions.length > 0 && (
                <div className="mt-4">
                  <span className="text-xs font-medium text-muted-foreground">{t('distortions')}</span>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {profile.thinking_distortions.map((distortion) => (
                      <Badge key={distortion} variant="destructive" className="text-xs">
                        {tJournal.has(`distortionLabels.${distortion}`) ? tJournal(`distortionLabels.${distortion}` as 'distortionLabels.catastrophize') : distortion}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Target className="size-4" />
                {t('behavior')}
              </CardTitle>
              <CardDescription>{t('behaviorDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center gap-4 md:flex-row md:items-start">
                <BehaviorRadar
                  scores={(profile?.behavior_scores as Record<string, number>) || {}}
                  labels={{
                    'over-compensate': tJournal('behaviorLabels.over-compensate'),
                    avoid: tJournal('behaviorLabels.avoid'),
                    please: tJournal('behaviorLabels.please'),
                    control: tJournal('behaviorLabels.control'),
                    prove: tJournal('behaviorLabels.prove'),
                    victim: tJournal('behaviorLabels.victim'),
                  }}
                />
                <div className="flex-1 space-y-2">
                  {profile?.behavior_primary && (
                    <div className="flex items-center justify-between rounded-md bg-zinc-900 px-3 py-2">
                      <div>
                        <span className="text-xs text-muted-foreground">{t('primary')}</span>
                        <p className="text-sm font-medium">{tJournal.has(`behaviorLabels.${profile.behavior_primary}`) ? tJournal(`behaviorLabels.${profile.behavior_primary}` as 'behaviorLabels.please') : profile.behavior_primary}</p>
                      </div>
                      <span className="text-lg font-bold text-purple-400">
                        {Math.round((profile.behavior_scores?.[profile.behavior_primary] ?? 0) * 100)}%
                      </span>
                    </div>
                  )}
                  {profile?.behavior_secondary && (
                    <div className="flex items-center justify-between rounded-md bg-zinc-900 px-3 py-2">
                      <div>
                        <span className="text-xs text-muted-foreground">{t('secondary')}</span>
                        <p className="text-sm font-medium">{tJournal.has(`behaviorLabels.${profile.behavior_secondary}`) ? tJournal(`behaviorLabels.${profile.behavior_secondary}` as 'behaviorLabels.please') : profile.behavior_secondary}</p>
                      </div>
                      <span className="text-lg font-bold text-purple-400/60">
                        {Math.round((profile.behavior_scores?.[profile.behavior_secondary] ?? 0) * 100)}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {habitLoops.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <RotateCcw className="size-4" />
                <h2 className="text-base font-semibold">{t('habitLoops')}</h2>
                <Badge variant="outline" className="text-xs">
                  {habitLoops.length}
                </Badge>
              </div>
              {habitLoops.map((loop) => (
                <HabitLoopCard key={loop.id} loop={loop} />
              ))}
            </div>
          )}

          {actionTasks.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ListTodo className="size-4" />
                  {t('microActions')}
                </CardTitle>
                <CardDescription>{t('microActionsDescription')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <ActionTaskList initialTasks={actionTasks} />
              </CardContent>
            </Card>
          )}

          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="flex items-start gap-3 pt-6">
              <TrendingUp className="mt-0.5 size-4 shrink-0 text-primary" />
              <div>
                <p className="text-sm font-medium">{t('upgradePath')}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {profile?.thinking_level_overall === 'L1' && t('upgradeL1')}
                  {profile?.thinking_level_overall === 'L2' && t('upgradeL2')}
                  {profile?.thinking_level_overall === 'L3' && t('upgradeL3')}
                  {profile?.thinking_level_overall === 'L4' && t('upgradeL4')}
                </p>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

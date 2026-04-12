import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  Calendar,
  FileText,
  Brain,
  Target,
  Lightbulb,
  MessageSquareQuote,
} from 'lucide-react';
import type { Journal, Pattern } from '@/types';
import { DeleteJournalButton } from './DeleteButton';
import { JournalEditor } from './JournalEditor';
import { TagEditor } from './TagEditor';
import { PatternAlert } from './PatternAlert';
import { formatLocalizedDate } from '@/lib/i18n/format-date';
import {
  getBehaviorLabelKey,
  getDistortionLabelKey,
  getThinkingLevelLabelKey,
} from '@/lib/journal/tag-labels';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function JournalDetailPage({ params }: Props) {
  const locale = await getLocale();
  const t = await getTranslations('journal');
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from('journals')
    .select('*')
    .eq('id', id)
    .eq('user_id', user!.id)
    .single();

  if (!data) notFound();

  const journal = data as Journal;
  const matchedPatterns = journal.pattern_ids.length > 0
    ? await supabase
        .from('patterns')
        .select('id, name, description, status, trigger_count, user_quotes')
        .eq('user_id', user!.id)
        .in('id', journal.pattern_ids)
    : { data: [] };

  const thinkingTags = journal.thinking_patterns.filter((tag) => tag.startsWith('thinking:'));
  const distortionTags = journal.thinking_patterns.filter((tag) => tag.startsWith('distortion:'));
  const patterns = (matchedPatterns.data ?? []) as Array<Pick<Pattern, 'id' | 'name' | 'description' | 'status' | 'trigger_count' | 'user_quotes'>>;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Link href="/journal">
            <Button variant="ghost" size="icon" className="mt-0.5">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight">{journal.title || t('untitled')}</h1>
            <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="size-3" />
                {formatLocalizedDate(journal.created_at, locale, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
              <span className="flex items-center gap-1">
                <FileText className="size-3" />
                {journal.word_count} {t('words')}
              </span>
              <Badge variant="outline" className="text-[10px]">
                {journal.mode === 'guided' ? t('guided') : t('freewrite')}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <JournalEditor journalId={journal.id} initialTitle={journal.title} initialContent={journal.content} />
          <TagEditor
            journalId={journal.id}
            initialTags={{
              emotions: journal.emotions,
              themes: journal.themes,
              decisions: journal.decisions,
              insights: journal.insights,
              thinking_patterns: journal.thinking_patterns,
              behavior_patterns: journal.behavior_patterns,
            }}
          />
          <DeleteJournalButton journalId={journal.id} />
        </div>
      </div>

      {journal.ai_summary && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Lightbulb className="size-3.5" />
              {t('aiSummary')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-muted-foreground">{journal.ai_summary}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          <div className="whitespace-pre-wrap text-sm leading-relaxed">{journal.content}</div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {(journal.emotions.length > 0 || journal.themes.length > 0) && (
          <Card>
            <CardContent className="space-y-3 pt-6">
              {journal.emotions.length > 0 && (
                <div>
                  <span className="text-xs font-medium text-muted-foreground">{t('emotions')}</span>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {journal.emotions.map((emotion) => (
                      <Badge key={emotion} variant="secondary" className="text-xs">
                        {emotion}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {journal.themes.length > 0 && (
                <div>
                  <span className="text-xs font-medium text-muted-foreground">{t('themes')}</span>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {journal.themes.map((theme) => (
                      <Badge key={theme} variant="outline" className="text-xs">
                        {theme}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {(thinkingTags.length > 0 || distortionTags.length > 0) && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Brain className="size-3.5" />
                {t('thinkingPatterns')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {thinkingTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {thinkingTags.map((tag) => (
                    <Badge key={tag} className="border-blue-500/20 bg-blue-500/10 text-xs text-blue-400">
                      {getThinkingLevelLabelKey(tag)
                        ? t(getThinkingLevelLabelKey(tag) as
                            | 'thinkingLevelLabels.L1'
                            | 'thinkingLevelLabels.L2'
                            | 'thinkingLevelLabels.L3'
                            | 'thinkingLevelLabels.L4')
                        : tag}
                    </Badge>
                  ))}
                </div>
              )}
              {distortionTags.length > 0 && (
                <div>
                  <span className="text-xs font-medium text-muted-foreground">{t('distortions')}</span>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {distortionTags.map((distortion) => (
                      <Badge key={distortion} variant="destructive" className="text-xs">
                        {getDistortionLabelKey(distortion)
                          ? t(getDistortionLabelKey(distortion) as
                              | 'distortionLabels.catastrophize'
                              | 'distortionLabels.black-white'
                              | 'distortionLabels.overgeneralize'
                              | 'distortionLabels.mind-reading'
                              | 'distortionLabels.should-statements'
                              | 'distortionLabels.emotional-reasoning'
                              | 'distortionLabels.personalize'
                              | 'distortionLabels.mental-filter')
                          : distortion}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {journal.behavior_patterns.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Target className="size-3.5" />
                {t('behaviorPatterns')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1.5">
                {journal.behavior_patterns.map((pattern) => (
                  <Badge key={pattern} className="border-orange-500/20 bg-orange-500/10 text-xs text-orange-400">
                    {getBehaviorLabelKey(pattern)
                      ? t(getBehaviorLabelKey(pattern) as
                          | 'behaviorLabels.over-compensate'
                          | 'behaviorLabels.avoid'
                          | 'behaviorLabels.please'
                          | 'behaviorLabels.control'
                          | 'behaviorLabels.prove'
                          | 'behaviorLabels.victim')
                      : pattern}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {journal.insights.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <MessageSquareQuote className="size-3.5" />
                {t('keyInsights')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {journal.insights.map((insight, index) => (
                  <blockquote
                    key={`${insight}-${index}`}
                    className="border-l-2 border-primary/40 pl-3 text-sm italic text-muted-foreground"
                  >
                    &ldquo;{insight}&rdquo;
                  </blockquote>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {journal.decisions.length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <span className="text-xs font-medium text-muted-foreground">{t('decisions')}</span>
              <ul className="mt-1.5 space-y-1">
                {journal.decisions.map((decision, index) => (
                  <li key={`${decision}-${index}`} className="text-sm text-muted-foreground">
                    &bull; {decision}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>

      {journal.loop_count > 0 && (
        <>
          <Separator />
          <PatternAlert journal={journal} patterns={patterns} />
        </>
      )}
    </div>
  );
}

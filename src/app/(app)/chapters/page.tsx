import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getLocale, getTranslations } from 'next-intl/server';
import { getEntitlements, resolvePlan } from '@/lib/billing/entitlements';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Layers } from 'lucide-react';
import type { Chapter, Subscription } from '@/types';
import { formatLocalizedDate } from '@/lib/i18n/format-date';

export default async function ChaptersPage() {
  const locale = await getLocale();
  const t = await getTranslations('chapters');
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: chaptersData }, { count: journalCount }, { data: subscriptionData }] = await Promise.all([
    supabase
      .from('chapters')
      .select('*')
      .eq('user_id', user!.id)
      .order('number', { ascending: true }),
    supabase
      .from('journals')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user!.id),
    supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user!.id)
      .maybeSingle(),
  ]);

  const chapters = (chaptersData as Chapter[]) || [];
  const plan = resolvePlan((subscriptionData as Subscription | null) ?? null);
  const entitlements = getEntitlements(plan);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground text-sm">
          {t('subtitle')}
        </p>
      </div>

      {!entitlements.chaptersEnabled && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-base">{t('proFeature')}</CardTitle>
            <CardDescription>
              {t('proDescription')}
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {chapters.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-24 space-y-4">
            <Layers className="h-16 w-16 text-muted-foreground/30" />
            <div className="text-center space-y-2">
              <h3 className="font-semibold text-lg">{t('emptyTitle')}</h3>
              <p className="text-muted-foreground text-sm max-w-md">
                {t('emptyDescription', { count: journalCount ?? 0 })}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {chapters.map((chapter) => (
            <Card key={chapter.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle>
                      {t('chapterTitle', { number: chapter.number, title: chapter.title })}
                    </CardTitle>
                    {chapter.subtitle && (
                      <CardDescription>{chapter.subtitle}</CardDescription>
                    )}
                  </div>
                  <Badge variant="outline">{t(chapter.status as 'open')}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                {(chapter.date_start || chapter.date_end) && (
                  <p>
                    {chapter.date_start
                      ? formatLocalizedDate(chapter.date_start, locale)
                      : t('unknownStart')}{' '}
                    {t('to')}{' '}
                    {chapter.date_end
                      ? formatLocalizedDate(chapter.date_end, locale)
                      : t('present')}
                  </p>
                )}
                {chapter.ai_narrative && <p>{chapter.ai_narrative}</p>}
                {chapter.themes.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {chapter.themes.map((theme) => (
                      <Badge key={theme} variant="secondary">
                        {theme}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

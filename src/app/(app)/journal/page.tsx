import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PenLine, BookOpen } from 'lucide-react';
import type { Journal } from '@/types';
import { formatLocalizedDate } from '@/lib/i18n/format-date';

export default async function JournalListPage() {
  const locale = await getLocale();
  const t = await getTranslations('journal');
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: journals } = await supabase
    .from('journals')
    .select('*')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })
    .limit(20);

  const typedJournals = (journals as Journal[]) || [];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground text-sm">
            {typedJournals.length === 1
              ? t('singleEntry', { count: typedJournals.length })
              : t('emptyEntries', { count: typedJournals.length })}
          </p>
        </div>
        <Link href="/journal/new">
          <Button className="gap-2">
            <PenLine className="h-4 w-4" />
            {t('newEntry')}
          </Button>
        </Link>
      </div>

      {/* Journal list */}
      {typedJournals.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 space-y-4">
            <BookOpen className="h-12 w-12 text-muted-foreground/40" />
            <div className="text-center space-y-2">
              <h3 className="font-semibold text-lg">{t('emptyTitle')}</h3>
              <p className="text-muted-foreground text-sm max-w-sm">
                {t('emptyDescription')}
              </p>
            </div>
            <Link href="/journal/new">
              <Button className="gap-2">
                <PenLine className="h-4 w-4" />
                {t('writeFirst')}
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {typedJournals.map((journal) => (
            <Link key={journal.id} href={`/journal/${journal.id}`}>
              <Card className="hover:bg-accent/30 transition-colors cursor-pointer">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">
                      {journal.title || t('untitled')}
                    </CardTitle>
                    <span className="text-xs text-muted-foreground whitespace-nowrap ml-4">
                      {formatLocalizedDate(journal.created_at, locale, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  {journal.ai_summary && (
                    <CardDescription className="line-clamp-2">{journal.ai_summary}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex flex-wrap gap-1.5">
                    {journal.emotions.slice(0, 3).map((e) => (
                      <Badge key={e} variant="secondary" className="text-[10px]">
                        {e}
                      </Badge>
                    ))}
                    {journal.themes.slice(0, 3).map((t) => (
                      <Badge key={t} variant="outline" className="text-[10px]">
                        {t}
                      </Badge>
                    ))}
                    {journal.loop_count > 0 && (
                      <Badge variant="destructive" className="text-[10px]">
                        {t('loopBadge', { count: journal.loop_count })}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

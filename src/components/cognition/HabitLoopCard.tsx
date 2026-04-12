'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RotateCcw, ArrowRight, AlertTriangle } from 'lucide-react';
import type { HabitLoop } from '@/types';
import { formatLocalizedDate } from '@/lib/i18n/format-date';

interface HabitLoopCardProps {
  loop: HabitLoop;
}

import { LOOP_STATUS_STYLES } from '@/lib/ui/constants';

export function HabitLoopCard({ loop }: HabitLoopCardProps) {
  const locale = useLocale();
  const t = useTranslations('cognition');
  const tStatus = useTranslations('statuses');

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <RotateCcw className="size-3.5" />
            {loop.name}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge className={LOOP_STATUS_STYLES[loop.status] || ''} variant="outline">
              {tStatus(loop.status as 'active' | 'observed' | 'breaking' | 'broken')}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {t('triggeredCount', { count: loop.trigger_count })}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] items-center gap-1 text-xs">
          <LoopStep label={t('cue')} value={loop.cue} color="text-zinc-300" />
          <ArrowRight className="size-3 text-zinc-600" />
          <LoopStep label={t('craving')} value={loop.craving} color="text-yellow-400" />
          <ArrowRight className="size-3 text-zinc-600" />
          <LoopStep label={t('response')} value={loop.response} color="text-blue-400" />
          <ArrowRight className="size-3 text-zinc-600" />
          <LoopStep label={t('reward')} value={loop.reward} color="text-green-400" />
        </div>

        {loop.hidden_cost && (
          <div className="flex items-start gap-2 rounded-md bg-destructive/5 px-3 py-2">
            <AlertTriangle className="mt-0.5 size-3 shrink-0 text-destructive" />
            <div>
              <span className="text-[10px] font-medium uppercase text-destructive">{t('hiddenCost')}</span>
              <p className="text-xs text-muted-foreground">{loop.hidden_cost}</p>
            </div>
          </div>
        )}

        {loop.user_quotes.length > 0 && (
          <div className="space-y-1">
            <span className="text-[10px] font-medium uppercase text-muted-foreground">{t('yourWords')}</span>
            {loop.user_quotes.slice(0, 2).map((quote, index) => (
              <blockquote
                key={`${quote}-${index}`}
                className="border-l-2 border-primary/30 pl-2 text-xs italic text-muted-foreground"
              >
                &ldquo;{quote}&rdquo;
              </blockquote>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>{t('firstSeen', { date: formatLocalizedDate(loop.first_seen, locale) })}</span>
          <span>{t('lastSeen', { date: formatLocalizedDate(loop.last_seen, locale) })}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function LoopStep({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-md bg-zinc-900 p-2 text-center">
      <span className="block text-[10px] uppercase text-muted-foreground">{label}</span>
      <span className={`mt-0.5 block leading-tight ${color}`}>
        {value.length > 40 ? `${value.slice(0, 38)}...` : value}
      </span>
    </div>
  );
}

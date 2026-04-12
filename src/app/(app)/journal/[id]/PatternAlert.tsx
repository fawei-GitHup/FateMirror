'use client';

import { useState, useMemo } from 'react';
import { AlertTriangle, Quote, Maximize2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PatternAlertDialog } from '@/components/cognition/PatternAlertDialog';
import { buildPatternAlert } from '@/lib/pattern/pattern-alert';
import { PATTERN_STATUS_STYLES } from '@/lib/ui/constants';
import type { Journal, Pattern } from '@/types';

interface PatternAlertProps {
  journal: Pick<Journal, 'loop_count' | 'pattern_ids'>;
  patterns: Array<
    Pick<Pattern, 'id' | 'name' | 'description' | 'status' | 'trigger_count' | 'user_quotes'>
  >;
}

export function PatternAlert({ journal, patterns }: PatternAlertProps) {
  const t = useTranslations('patternAlert');
  const tStatus = useTranslations('statuses');
  const [showDialog, setShowDialog] = useState(false);

  const alert = useMemo(
    () => buildPatternAlert(journal, patterns),
    [journal, patterns]
  );

  // No loops — render nothing
  if (!alert && !journal.loop_count) return null;

  // Loops exist but no enriched patterns — minimal fallback
  if (!alert) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-lg border border-destructive/30 bg-destructive/5 p-4"
      >
        <p className="text-sm font-medium text-destructive">
          {t('headline', { count: journal.loop_count })}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {t('fallbackBody')}
        </p>
      </motion.div>
    );
  }

  return (
    <>
      {/* Dialog — auto-opens on first render */}
      <PatternAlertDialog
        alert={alert}
        loopCount={journal.loop_count}
        autoOpen={true}
        onClose={() => setShowDialog(false)}
      />

      {/* Re-openable dialog on demand */}
      {showDialog && (
        <PatternAlertDialog
          alert={alert}
          loopCount={journal.loop_count}
          autoOpen={true}
          onClose={() => setShowDialog(false)}
        />
      )}

      {/* Inline card (always visible below journal) */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm text-destructive">
                <AlertTriangle className="size-4" />
                {t('title')}
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground hover:text-destructive"
                onClick={() => setShowDialog(true)}
                title={t('expand')}
              >
                <Maximize2 className="size-3.5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-foreground">
                {t('headline', { count: journal.loop_count })}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t('description')}
              </p>
            </div>

            <div className="space-y-2">
              {alert.patterns.map((pattern, index) => (
                <motion.div
                  key={pattern.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + index * 0.08 }}
                  className="rounded-lg border border-border/60 bg-background/70 p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-foreground">
                      {pattern.name}
                    </p>
                    <Badge className={PATTERN_STATUS_STYLES[pattern.status]}>
                      {tStatus(pattern.status as 'active' | 'breaking' | 'resolved')}
                    </Badge>
                  </div>
                  {pattern.description && (
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {pattern.description}
                    </p>
                  )}
                  <p className="mt-2 text-[11px] uppercase tracking-wide text-muted-foreground">
                    {t('triggered', { count: pattern.trigger_count })}
                  </p>
                </motion.div>
              ))}
            </div>

            {alert.quotes.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="rounded-lg border border-border/60 bg-background/70 p-3"
              >
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <Quote className="size-3.5" />
                  {t('pastWords')}
                </div>
                <div className="mt-2 space-y-2">
                  {alert.quotes.map((quote) => (
                    <blockquote
                      key={quote}
                      className="border-l-2 border-destructive/40 pl-3 text-sm italic text-muted-foreground"
                    >
                      &ldquo;{quote}&rdquo;
                    </blockquote>
                  ))}
                </div>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </>
  );
}

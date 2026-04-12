'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Quote, RotateCcw, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PATTERN_STATUS_STYLES } from '@/lib/ui/constants';
import type { PatternAlertSummary } from '@/lib/pattern/pattern-alert';

/* ─── Types ─── */

interface PatternAlertDialogProps {
  alert: PatternAlertSummary;
  loopCount: number;
  /** Auto-open on mount (default: true) */
  autoOpen?: boolean;
  onClose?: () => void;
}

/* ─── Quote Typewriter ─── */

function TypewriterQuote({
  quote,
  delay,
}: {
  quote: string;
  delay: number;
}) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      let i = 0;
      const interval = setInterval(() => {
        if (i < quote.length) {
          setDisplayed(quote.slice(0, i + 1));
          i++;
        } else {
          setDone(true);
          clearInterval(interval);
        }
      }, 30);
      return () => clearInterval(interval);
    }, delay);
    return () => clearTimeout(timeout);
  }, [quote, delay]);

  return (
    <motion.blockquote
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: delay / 1000, duration: 0.3 }}
      className="border-l-2 border-red-500/60 pl-3 text-sm italic text-zinc-300"
    >
      &ldquo;{displayed}
      {done ? '&rdquo;' : (
        <span className="inline-block w-0.5 h-3.5 bg-red-400 align-middle animate-pulse ml-0.5" />
      )}
    </motion.blockquote>
  );
}

/* ─── Main Component ─── */

export function PatternAlertDialog({
  alert,
  loopCount,
  autoOpen = true,
  onClose,
}: PatternAlertDialogProps) {
  const t = useTranslations('patternAlert');
  const tStatus = useTranslations('statuses');
  const [open, setOpen] = useState(false);

  // Auto-open with slight delay for dramatic effect
  useEffect(() => {
    if (!autoOpen) return;
    const timer = setTimeout(() => setOpen(true), 600);
    return () => clearTimeout(timer);
  }, [autoOpen]);

  function handleClose() {
    setOpen(false);
    onClose?.();
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{
              type: 'spring',
              damping: 25,
              stiffness: 300,
            }}
            className="fixed inset-x-4 top-1/2 z-50 mx-auto max-w-md -translate-y-1/2 sm:inset-x-auto"
          >
            <div className="relative overflow-hidden rounded-2xl border border-red-500/30 bg-zinc-950 shadow-2xl shadow-red-900/20">
              {/* Animated red pulse border */}
              <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-red-500/20 animate-[pulse-border_2s_ease-in-out_infinite]" />

              {/* Top accent bar */}
              <div className="h-1 w-full bg-gradient-to-r from-red-600 via-red-500 to-red-600" />

              {/* Close button */}
              <button
                onClick={handleClose}
                className="absolute right-3 top-4 rounded-full p-1.5 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
              >
                <X className="size-4" />
              </button>

              {/* Content */}
              <div className="space-y-5 p-6">
                {/* Header with icon */}
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="flex items-center gap-3"
                >
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-red-500/15">
                    <AlertTriangle className="size-5 text-red-400" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-red-400">
                      {t('title')}
                    </h2>
                    <p className="text-xs text-zinc-500">
                      {t('headline', { count: loopCount })}
                    </p>
                  </div>
                </motion.div>

                {/* Description */}
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-sm leading-relaxed text-zinc-400"
                >
                  {t('description')}
                </motion.p>

                {/* Pattern cards */}
                <div className="space-y-2">
                  {alert.patterns.map((pattern, index) => (
                    <motion.div
                      key={pattern.id}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + index * 0.1 }}
                      className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <RotateCcw className="size-3.5 text-red-400" />
                          <span className="text-sm font-medium text-zinc-200">
                            {pattern.name}
                          </span>
                        </div>
                        <Badge className={PATTERN_STATUS_STYLES[pattern.status]}>
                          {tStatus(pattern.status as 'active' | 'breaking' | 'resolved')}
                        </Badge>
                      </div>
                      {pattern.description && (
                        <p className="mt-1.5 text-xs text-zinc-500">
                          {pattern.description}
                        </p>
                      )}
                      <p className="mt-2 text-[11px] uppercase tracking-wider text-zinc-600">
                        {t('triggered', { count: pattern.trigger_count })}
                      </p>
                    </motion.div>
                  ))}
                </div>

                {/* Historical quotes — "打脸" section */}
                {alert.quotes.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="rounded-lg border border-red-500/20 bg-red-950/20 p-4"
                  >
                    <div className="mb-3 flex items-center gap-2">
                      <Quote className="size-3.5 text-red-400" />
                      <span className="text-xs font-medium text-red-400/80">
                        {t('pastWords')}
                      </span>
                    </div>
                    <div className="space-y-3">
                      {alert.quotes.map((quote, index) => (
                        <TypewriterQuote
                          key={quote}
                          quote={quote}
                          delay={800 + index * 1200}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Action button */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1 }}
                >
                  <Button
                    onClick={handleClose}
                    variant="outline"
                    className="w-full border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                  >
                    {t('acknowledge')}
                  </Button>
                </motion.div>
              </div>
            </div>
          </motion.div>

          {/* Global keyframe for pulse border */}
          <style>{`
            @keyframes pulse-border {
              0%, 100% { box-shadow: inset 0 0 0 1px rgba(239, 68, 68, 0.15); }
              50% { box-shadow: inset 0 0 0 1px rgba(239, 68, 68, 0.4), 0 0 20px rgba(239, 68, 68, 0.1); }
            }
          `}</style>
        </>
      )}
    </AnimatePresence>
  );
}

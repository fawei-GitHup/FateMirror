'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { MessageCircle, PenLine, ArrowLeft, Save, Loader2, Bot, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { loadUserAIConfig } from '@/lib/ai/browser-config';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { ChatMessage } from '@/hooks/useChat';
import {
  buildGuidedJournalPayload,
  buildGuidedTranscript,
} from '@/lib/journal/guided-preview';

type Mode = 'select' | 'guided' | 'freewrite';

interface AIStatusPayload {
  available: boolean;
  primaryProvider: 'anthropic' | 'openai-compatible' | 'none';
  primaryModel: string | null;
  freeGuidedSessionsPerDay: number | null;
}

function mergeAIStatusWithBrowserConfig(
  status: AIStatusPayload
): AIStatusPayload {
  const browserConfig = loadUserAIConfig();
  if (!browserConfig) {
    return status;
  }

  return {
    ...status,
    available: true,
    primaryProvider: 'openai-compatible',
    primaryModel: browserConfig.model,
  };
}

export default function NewJournalPage() {
  const t = useTranslations('journal');
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('select');
  const [guidedMessages, setGuidedMessages] = useState<ChatMessage[]>([]);
  const [freewriteTitle, setFreewriteTitle] = useState('');
  const [freewriteContent, setFreewriteContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isPreparingPreview, setIsPreparingPreview] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [crisisMessage, setCrisisMessage] = useState<string | null>(null);
  const [aiStatus, setAiStatus] = useState<AIStatusPayload | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDraft, setPreviewDraft] = useState<ReturnType<typeof buildGuidedJournalPayload> | null>(null);

  useEffect(() => {
    fetch('/api/ai/status')
      .then((response) => response.json())
      .then((payload: { status?: AIStatusPayload }) => {
        if (payload.status) {
          setAiStatus(mergeAIStatusWithBrowserConfig(payload.status));
        }
      })
      .catch(() => {});
  }, []);

  const handleSessionComplete = useCallback(
    async (extract: Record<string, unknown>, transcript: string) => {
      setSaveError(null);
      setCrisisMessage(null);
      setPreviewDraft(buildGuidedJournalPayload(extract, transcript));
      setPreviewOpen(true);
    },
    []
  );

  const persistJournal = useCallback(
    async (payload: ReturnType<typeof buildGuidedJournalPayload>) => {
      setIsSaving(true);
      setSaveError(null);
      try {
        const res = await fetch('/api/journal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Failed to save journal');
        const { journal } = await res.json();

        fetch('/api/journal/process', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ journalId: journal.id }),
        }).catch(() => {});

        router.push(`/journal/${journal.id}`);
      } catch {
        setSaveError(t('saveFailed'));
      } finally {
        setIsSaving(false);
      }
    },
    [router, t]
  );

  const prepareGuidedPreview = useCallback(async () => {
    const transcript = buildGuidedTranscript(guidedMessages);
    if (!transcript) {
      setSaveError(t('guidedPreviewEmpty'));
      return;
    }

    setIsPreparingPreview(true);
    setSaveError(null);
    setCrisisMessage(null);

    try {
      const extractRes = await fetch('/api/journal/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: transcript,
          aiConfig: loadUserAIConfig(),
        }),
      });

      if (extractRes.status === 422) {
        const payload = await extractRes.json();
        setCrisisMessage(payload.supportMessage || 'Please contact emergency support right now.');
        return;
      }

      if (!extractRes.ok) {
        throw new Error('Failed to prepare preview');
      }

      const extract = await extractRes.json();
      setPreviewDraft(buildGuidedJournalPayload(extract, transcript));
      setPreviewOpen(true);
    } catch {
      setSaveError(t('guidedPreviewFailed'));
    } finally {
      setIsPreparingPreview(false);
    }
  }, [guidedMessages, t]);

  const handleFreewriteSave = useCallback(async () => {
    if (!freewriteContent.trim()) return;
    setIsSaving(true);
    setSaveError(null);
    setCrisisMessage(null);

    try {
      const extractRes = await fetch('/api/journal/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: freewriteContent,
          aiConfig: loadUserAIConfig(),
        }),
      });

      let tags: Record<string, unknown> = {};
      if (extractRes.status === 422) {
        const payload = await extractRes.json();
        setCrisisMessage(payload.supportMessage || 'Please contact emergency support right now.');
        return;
      }

      if (extractRes.ok) {
        tags = await extractRes.json();
      }

      const saveRes = await fetch('/api/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: freewriteTitle.trim() || tags.title || null,
          content: freewriteContent,
          mode: 'freewrite',
          emotions: tags.emotions || [],
          themes: tags.themes || [],
          decisions: tags.decisions || [],
          insights: tags.insights || [],
          thinking_patterns: tags.thinking_patterns || [],
          behavior_patterns: tags.behavior_patterns || [],
          ai_summary: tags.ai_summary || null,
        }),
      });

      if (!saveRes.ok) throw new Error('Failed to save journal');
      const { journal } = await saveRes.json();

      fetch('/api/journal/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ journalId: journal.id }),
      }).catch(() => {});

      router.push(`/journal/${journal.id}`);
    } catch {
      setSaveError(t('saveFailed'));
    } finally {
      setIsSaving(false);
    }
  }, [freewriteContent, router, t]);

  if (mode === 'select') {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-8 p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">{t('newJournalEntry')}</h1>
          <p className="mt-2 text-muted-foreground">{t('chooseMode')}</p>
        </div>

        {aiStatus && (
          <div className="w-full max-w-lg rounded-xl border border-border/60 bg-card/60 p-4">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <Bot className="size-4 text-primary" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  {aiStatus.available ? t('aiReadyTitle') : t('aiUnavailableTitle')}
                </p>
                <p className="text-sm text-muted-foreground">
                  {aiStatus.available
                    ? t('aiReadyDescription', {
                        provider:
                          aiStatus.primaryProvider === 'anthropic'
                            ? t('aiProviderAnthropic')
                            : aiStatus.primaryProvider === 'openai-compatible'
                              ? t('aiProviderOpenAICompatible')
                              : t('aiProviderNone'),
                        model: aiStatus.primaryModel ?? t('aiNotConfigured'),
                        count: aiStatus.freeGuidedSessionsPerDay ?? 0,
                      })
                    : t('aiUnavailableDescription')}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid w-full max-w-lg gap-4">
          <Card className="cursor-pointer p-6 transition-colors hover:bg-accent/50" onClick={() => setMode('guided')}>
            <div className="flex items-start gap-4">
              <div className="rounded-lg bg-primary/10 p-2.5">
                <MessageCircle className="size-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">{t('guided')}</CardTitle>
                <CardDescription className="mt-1">{t('guidedDescription')}</CardDescription>
              </div>
            </div>
          </Card>

          <Card className="cursor-pointer p-6 transition-colors hover:bg-accent/50" onClick={() => setMode('freewrite')}>
            <div className="flex items-start gap-4">
              <div className="rounded-lg bg-zinc-700/50 p-2.5">
                <PenLine className="size-5 text-zinc-300" />
              </div>
              <div>
                <CardTitle className="text-base">{t('freewrite')}</CardTitle>
                <CardDescription className="mt-1">{t('freewriteDescription')}</CardDescription>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (mode === 'guided') {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => setMode('select')}>
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <h2 className="text-sm font-semibold">{t('guided')}</h2>
            <p className="text-xs text-muted-foreground">{t('guidedReflectionHint')}</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="ml-auto"
            onClick={prepareGuidedPreview}
            disabled={isPreparingPreview || isSaving}
          >
            {isPreparingPreview ? (
              <Loader2 className="mr-1.5 size-3.5 animate-spin" />
            ) : (
              <Check className="mr-1.5 size-3.5" />
            )}
            {t('guidedPreviewAction')}
          </Button>
          {isSaving && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="size-3 animate-spin" />
              {t('saving')}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-hidden">
          <ChatWindow
            mode="guided"
            onSessionComplete={handleSessionComplete}
            onMessagesChange={setGuidedMessages}
            greeting={t('guidedGreeting')}
          />
        </div>

        {saveError && (
          <div className="border-t border-destructive/20 bg-destructive/10 px-4 py-2 text-sm text-destructive">
            {saveError}
          </div>
        )}

        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="max-w-2xl p-0" showCloseButton={!isSaving}>
            <DialogHeader className="px-6 pt-6">
              <DialogTitle>{t('guidedPreviewTitle')}</DialogTitle>
              <DialogDescription>{t('guidedPreviewDescription')}</DialogDescription>
            </DialogHeader>

            {previewDraft && (
              <div className="max-h-[70vh] space-y-4 overflow-y-auto px-6 pb-2">
                <label className="block space-y-2">
                  <span className="text-sm font-medium">{t('journalTitleLabel')}</span>
                  <Input
                    value={previewDraft.title || ''}
                    onChange={(event) =>
                      setPreviewDraft((current) =>
                        current
                          ? { ...current, title: event.target.value }
                          : current
                      )
                    }
                  />
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-medium">{t('guidedPreviewTranscript')}</span>
                  <Textarea
                    value={previewDraft.content}
                    className="min-h-48"
                    onChange={(event) =>
                      setPreviewDraft((current) =>
                        current
                          ? { ...current, content: event.target.value }
                          : current
                      )
                    }
                  />
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-medium">{t('guidedPreviewSummary')}</span>
                  <Textarea
                    value={previewDraft.ai_summary || ''}
                    className="min-h-28"
                    onChange={(event) =>
                      setPreviewDraft((current) =>
                        current
                          ? { ...current, ai_summary: event.target.value }
                          : current
                      )
                    }
                  />
                </label>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block space-y-2">
                    <span className="text-sm font-medium">{t('guidedPreviewThemes')}</span>
                    <Textarea
                      value={previewDraft.themes.join('\n')}
                      className="min-h-28"
                      onChange={(event) =>
                        setPreviewDraft((current) =>
                          current
                            ? {
                                ...current,
                                themes: event.target.value
                                  .split('\n')
                                  .map((item) => item.trim())
                                  .filter(Boolean),
                              }
                            : current
                        )
                      }
                    />
                  </label>

                  <label className="block space-y-2">
                    <span className="text-sm font-medium">{t('guidedPreviewEmotions')}</span>
                    <Textarea
                      value={previewDraft.emotions.join('\n')}
                      className="min-h-28"
                      onChange={(event) =>
                        setPreviewDraft((current) =>
                          current
                            ? {
                                ...current,
                                emotions: event.target.value
                                  .split('\n')
                                  .map((item) => item.trim())
                                  .filter(Boolean),
                              }
                            : current
                        )
                      }
                    />
                  </label>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setPreviewOpen(false)}
                disabled={isSaving}
              >
                {t('cancel')}
              </Button>
              <Button
                onClick={() => previewDraft && persistJournal(previewDraft)}
                disabled={!previewDraft || !previewDraft.content.trim() || isSaving}
              >
                {isSaving ? (
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                ) : (
                  <Save className="mr-1.5 size-3.5" />
                )}
                {t('guidedPreviewConfirm')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Word count: handle both CJK characters and space-separated words
  const wordCount = freewriteContent.trim()
    ? freewriteContent.trim().replace(/[\s\n]+/g, ' ').split(' ').filter(Boolean).length
    : 0;
  const charCount = freewriteContent.length;
  // CJK-heavy text: show character count; otherwise word count
  const cjkRatio = (freewriteContent.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) || []).length / Math.max(charCount, 1);
  const displayCount = cjkRatio > 0.3 ? charCount : wordCount;
  const countLabel = cjkRatio > 0.3 ? t('characters') : t('words');

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <Button variant="ghost" size="icon" onClick={() => setMode('select')}>
          <ArrowLeft className="size-4" />
        </Button>
        <div className="flex-1">
          <h2 className="text-sm font-semibold">{t('freewrite')}</h2>
          <p className="text-xs text-muted-foreground">{t('freewriteSaveHint')}</p>
        </div>
        <Button size="sm" onClick={handleFreewriteSave} disabled={!freewriteContent.trim() || isSaving}>
          {isSaving ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <Save className="mr-1.5 size-3.5" />}
          {t('save')}
        </Button>
      </div>

      {/* Writing area */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-4 py-6 md:px-8 md:py-10">
          {/* Title input */}
          <input
            type="text"
            value={freewriteTitle}
            onChange={(event) => setFreewriteTitle(event.target.value)}
            placeholder={t('freewriteTitlePlaceholder')}
            className="w-full border-none bg-transparent text-2xl font-bold tracking-tight text-foreground placeholder:text-muted-foreground/40 focus:outline-none"
            autoFocus
          />

          {/* Content */}
          <Textarea
            value={freewriteContent}
            onChange={(event) => setFreewriteContent(event.target.value)}
            placeholder={t('writePrompt')}
            className="mt-4 min-h-[55vh] resize-none border-none bg-transparent text-base leading-[1.8] text-foreground/90 placeholder:text-muted-foreground/30 focus-visible:ring-0 focus-visible:border-transparent"
          />
        </div>
      </div>

      {/* Footer status bar */}
      <div className="flex items-center justify-between border-t border-border px-4 py-2">
        <span className="text-xs text-muted-foreground">
          {displayCount > 0 ? `${displayCount} ${countLabel}` : t('freewriteReady')}
        </span>
        {isSaving && (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="size-3 animate-spin" />
            {t('saving')}
          </span>
        )}
      </div>

      {saveError && (
        <div className="border-t border-destructive/20 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {saveError}
        </div>
      )}
      {crisisMessage && (
        <div className="border-t border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          {crisisMessage}
        </div>
      )}
    </div>
  );
}

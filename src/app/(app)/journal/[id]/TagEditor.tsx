'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Loader2, Tags, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { formatTagInput, parseTagInput } from '@/lib/editor/tag-input';

interface TagEditorProps {
  journalId: string;
  initialTags: {
    emotions: string[];
    themes: string[];
    decisions: string[];
    insights: string[];
    thinking_patterns: string[];
    behavior_patterns: string[];
  };
}

export function TagEditor({ journalId, initialTags }: TagEditorProps) {
  const t = useTranslations('journal');
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [emotions, setEmotions] = useState(formatTagInput(initialTags.emotions));
  const [themes, setThemes] = useState(formatTagInput(initialTags.themes));
  const [decisions, setDecisions] = useState(formatTagInput(initialTags.decisions));
  const [insights, setInsights] = useState(formatTagInput(initialTags.insights));
  const [thinkingPatterns, setThinkingPatterns] = useState(formatTagInput(initialTags.thinking_patterns));
  const [behaviorPatterns, setBehaviorPatterns] = useState(formatTagInput(initialTags.behavior_patterns));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setIsSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/journal/${journalId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emotions: parseTagInput(emotions),
          themes: parseTagInput(themes),
          decisions: parseTagInput(decisions),
          insights: parseTagInput(insights),
          thinking_patterns: parseTagInput(thinkingPatterns),
          behavior_patterns: parseTagInput(behaviorPatterns),
        }),
      });

      const payload = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(payload.error || t('updateTagsFailed'));
      }

      setIsEditing(false);
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : t('updateTagsFailed'));
    } finally {
      setIsSaving(false);
    }
  }

  function handleCancel() {
    setEmotions(formatTagInput(initialTags.emotions));
    setThemes(formatTagInput(initialTags.themes));
    setDecisions(formatTagInput(initialTags.decisions));
    setInsights(formatTagInput(initialTags.insights));
    setThinkingPatterns(formatTagInput(initialTags.thinking_patterns));
    setBehaviorPatterns(formatTagInput(initialTags.behavior_patterns));
    setError(null);
    setIsEditing(false);
  }

  if (!isEditing) {
    return (
      <Button variant="outline" onClick={() => setIsEditing(true)}>
        <Tags className="mr-1.5 size-4" />
        {t('editTags')}
      </Button>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border border-border/60 bg-background/80 p-4">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">{t('emotions')}</span>
          <Input value={emotions} onChange={(event) => setEmotions(event.target.value)} placeholder="shame, relief, hope" />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">{t('themes')}</span>
          <Input value={themes} onChange={(event) => setThemes(event.target.value)} placeholder="work, family, identity" />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">{t('decisions')}</span>
          <Textarea value={decisions} onChange={(event) => setDecisions(event.target.value)} className="min-h-24" placeholder={t('separateItems')} />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">{t('keyInsights')}</span>
          <Textarea value={insights} onChange={(event) => setInsights(event.target.value)} className="min-h-24" placeholder={t('separateItems')} />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">{t('thinkingPatterns')}</span>
          <Textarea value={thinkingPatterns} onChange={(event) => setThinkingPatterns(event.target.value)} className="min-h-24" placeholder={t('thinkingPlaceholder')} />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">{t('behaviorPatterns')}</span>
          <Textarea value={behaviorPatterns} onChange={(event) => setBehaviorPatterns(event.target.value)} className="min-h-24" placeholder={t('behaviorPlaceholder')} />
        </label>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="flex items-center gap-2">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : <Save className="mr-1.5 size-4" />}
          {t('saveTags')}
        </Button>
        <Button variant="ghost" onClick={handleCancel} disabled={isSaving}>
          <X className="mr-1.5 size-4" />
          {t('cancel')}
        </Button>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Edit3, Loader2, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface JournalEditorProps {
  journalId: string;
  initialTitle: string | null;
  initialContent: string;
}

export function JournalEditor({
  journalId,
  initialTitle,
  initialContent,
}: JournalEditorProps) {
  const t = useTranslations('journal');
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(initialTitle ?? '');
  const [content, setContent] = useState(initialContent);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setIsSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/journal/${journalId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content }),
      });

      const payload = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(payload.error || t('updateFailed'));
      }

      setIsEditing(false);
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : t('updateFailed'));
    } finally {
      setIsSaving(false);
    }
  }

  function handleCancel() {
    setTitle(initialTitle ?? '');
    setContent(initialContent);
    setError(null);
    setIsEditing(false);
  }

  if (!isEditing) {
    return (
      <Button variant="outline" onClick={() => setIsEditing(true)}>
        <Edit3 className="mr-1.5 size-4" />
        {t('edit')}
      </Button>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border border-border/60 bg-background/80 p-4">
      <div className="space-y-2">
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={t('journalTitlePlaceholder')}
        />
        <Textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          className="min-h-[240px]"
          placeholder={t('writeWhatHappened')}
        />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="flex items-center gap-2">
        <Button onClick={handleSave} disabled={isSaving || !content.trim()}>
          {isSaving ? (
            <Loader2 className="mr-1.5 size-4 animate-spin" />
          ) : (
            <Save className="mr-1.5 size-4" />
          )}
          {t('save')}
        </Button>
        <Button variant="ghost" onClick={handleCancel} disabled={isSaving}>
          <X className="mr-1.5 size-4" />
          {t('cancel')}
        </Button>
      </div>
    </div>
  );
}

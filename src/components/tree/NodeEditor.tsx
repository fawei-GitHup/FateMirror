'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, Pencil, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { formatTagInput, parseTagInput } from '@/lib/editor/tag-input';
import type { LayoutNode } from '@/lib/tree/layout-engine';

interface NodeEditorProps {
  node: LayoutNode;
  onSaved: (updates: Partial<LayoutNode>) => void;
}

export function NodeEditor({ node, onSaved }: NodeEditorProps) {
  const t = useTranslations('tree');
  const tCommon = useTranslations('common');
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(node.title);
  const [type, setType] = useState(node.type);
  const [status, setStatus] = useState(node.status);
  const [aiSummary, setAiSummary] = useState(node.aiSummary ?? '');
  const [themes, setThemes] = useState(formatTagInput(node.themes));
  const [emotions, setEmotions] = useState(formatTagInput(node.emotions));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTitle(node.title);
    setType(node.type);
    setStatus(node.status);
    setAiSummary(node.aiSummary ?? '');
    setThemes(formatTagInput(node.themes));
    setEmotions(formatTagInput(node.emotions));
    setError(null);
    setIsEditing(false);
  }, [node]);

  async function handleSave() {
    setIsSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/tree/${node.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          type,
          status,
          ai_summary: aiSummary || null,
          themes: parseTagInput(themes),
          emotions: parseTagInput(emotions),
        }),
      });

      const payload = (await res.json()) as {
        error?: string;
        node?: {
          id: string;
          title: string;
          type: LayoutNode['type'];
          status: LayoutNode['status'];
          themes: string[];
          emotions: string[];
          ai_summary: string | null;
        };
      };

      if (!res.ok || !payload.node) {
        throw new Error(payload.error || t('saveNodeFailed'));
      }

      onSaved({
        id: payload.node.id,
        title: payload.node.title,
        type: payload.node.type,
        status: payload.node.status,
        themes: payload.node.themes,
        emotions: payload.node.emotions,
        aiSummary: payload.node.ai_summary,
      });
      setIsEditing(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : t('saveNodeFailed'));
    } finally {
      setIsSaving(false);
    }
  }

  function handleCancel() {
    setTitle(node.title);
    setType(node.type);
    setStatus(node.status);
    setAiSummary(node.aiSummary ?? '');
    setThemes(formatTagInput(node.themes));
    setEmotions(formatTagInput(node.emotions));
    setError(null);
    setIsEditing(false);
  }

  if (!isEditing) {
    return (
      <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
        <Pencil className="mr-1.5 size-3.5" />
        {t('editNode')}
      </Button>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-3">
      <label className="space-y-1 text-xs">
        <span className="text-muted-foreground">{t('title')}</span>
        <Input value={title} onChange={(event) => setTitle(event.target.value)} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="space-y-1 text-xs">
          <span className="text-muted-foreground">{t('type')}</span>
          <select
            value={type}
            onChange={(event) => setType(event.target.value as LayoutNode['type'])}
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring"
          >
            <option value="milestone">{t('milestone')}</option>
            <option value="choice">{t('choice')}</option>
            <option value="insight">{t('insight')}</option>
            <option value="crisis">{t('crisis')}</option>
          </select>
        </label>
        <label className="space-y-1 text-xs">
          <span className="text-muted-foreground">{t('status')}</span>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as LayoutNode['status'])}
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring"
          >
            <option value="active">{t('active')}</option>
            <option value="resolved">{t('resolved')}</option>
            <option value="recurring">{t('recurring')}</option>
          </select>
        </label>
      </div>
      <label className="space-y-1 text-xs">
        <span className="text-muted-foreground">{t('summary')}</span>
        <Textarea value={aiSummary} onChange={(event) => setAiSummary(event.target.value)} className="min-h-24" />
      </label>
      <label className="space-y-1 text-xs">
        <span className="text-muted-foreground">{t('themes')}</span>
        <Input value={themes} onChange={(event) => setThemes(event.target.value)} placeholder="work, family, identity" />
      </label>
      <label className="space-y-1 text-xs">
        <span className="text-muted-foreground">{t('emotions')}</span>
        <Input value={emotions} onChange={(event) => setEmotions(event.target.value)} placeholder="fear, relief, hope" />
      </label>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={handleSave} disabled={isSaving || !title.trim()}>
          {isSaving ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <Save className="mr-1.5 size-3.5" />}
          {t('save')}
        </Button>
        <Button size="sm" variant="ghost" onClick={handleCancel} disabled={isSaving}>
          <X className="mr-1.5 size-3.5" />
          {tCommon('cancel')}
        </Button>
      </div>
    </div>
  );
}

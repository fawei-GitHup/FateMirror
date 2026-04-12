'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';
import { X, Calendar, Layers } from 'lucide-react';
import type { LayoutNode } from '@/lib/tree/layout-engine';
import { NodeEditor } from './NodeEditor';
import { formatLocalizedDate } from '@/lib/i18n/format-date';

interface NodeDetailProps {
  node: LayoutNode;
  onClose: () => void;
  onNodeUpdated?: (node: Partial<LayoutNode> & { id: string }) => void;
}

import { NODE_TYPE_STYLES } from '@/lib/ui/constants';

export function NodeDetail({ node, onClose, onNodeUpdated }: NodeDetailProps) {
  const locale = useLocale();
  const t = useTranslations('tree');
  const [currentNode, setCurrentNode] = useState(node);

  useEffect(() => {
    setCurrentNode(node);
  }, [node]);

  return (
    <div className="flex h-full flex-col border-l border-border bg-background">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 p-4">
        <div className="space-y-1">
          <Badge className={NODE_TYPE_STYLES[currentNode.type] || ''}>
            {t(currentNode.type as 'milestone' | 'choice' | 'insight' | 'crisis')}
          </Badge>
          <h3 className="text-base font-semibold leading-tight">{currentNode.title}</h3>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0">
          <X className="size-4" />
        </Button>
      </div>

      <Separator />

      {/* Content */}
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {/* Date */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Calendar className="size-3" />
          {formatLocalizedDate(currentNode.date, locale, {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })}
        </div>

        <NodeEditor
          node={currentNode}
          onSaved={(updates) => {
            const nextNode = { ...currentNode, ...updates };
            setCurrentNode(nextNode);
            onNodeUpdated?.(nextNode);
          }}
        />

        {/* AI Summary */}
        {currentNode.aiSummary && (
          <p className="text-sm leading-relaxed text-muted-foreground">
            {currentNode.aiSummary}
          </p>
        )}

        {/* Themes */}
        {currentNode.themes.length > 0 && (
          <div>
            <span className="text-xs font-medium text-muted-foreground">{t('themes')}</span>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {currentNode.themes.map((t) => (
                <Badge key={t} variant="outline" className="text-xs">
                  {t}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Emotions */}
        {currentNode.emotions.length > 0 && (
          <div>
            <span className="text-xs font-medium text-muted-foreground">{t('emotions')}</span>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {currentNode.emotions.map((e) => (
                <Badge key={e} variant="secondary" className="text-xs">
                  {e}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Status */}
        <div className="flex items-center gap-2 text-xs">
          <Layers className="size-3 text-muted-foreground" />
          <span className="text-muted-foreground">{t('status')}:</span>
          <Badge
            variant={currentNode.status === 'recurring' ? 'destructive' : 'secondary'}
            className="text-[10px]"
          >
            {t(currentNode.status as 'active' | 'resolved' | 'recurring')}
          </Badge>
        </div>

        {/* Depth in tree */}
        <div className="text-xs text-muted-foreground">
          {t('depth', { depth: currentNode.depth })}
        </div>

        {currentNode.journals && currentNode.journals.length > 0 && (
          <div>
            <span className="text-xs font-medium text-muted-foreground">{t('linkedJournals')}</span>
            <div className="mt-2 space-y-2">
              {currentNode.journals.map((journal) => (
                <Link
                  key={journal.id}
                  href={`/journal/${journal.id}`}
                  className="block rounded-lg border border-border/60 bg-muted/30 p-3 transition-colors hover:bg-muted/60"
                >
                  <p className="text-sm font-medium text-foreground">
                    {journal.title || t('untitledEntry')}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatLocalizedDate(journal.created_at, locale)}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

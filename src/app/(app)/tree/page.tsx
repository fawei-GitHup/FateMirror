'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TreeDeciduous } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { DestinyTree } from '@/components/tree/DestinyTree';
import { NodeDetail } from '@/components/tree/NodeDetail';
import type { TreeLayoutResult, LayoutNode } from '@/lib/tree/layout-engine';

export default function TreePage() {
  const t = useTranslations('tree');
  const [layout, setLayout] = useState<TreeLayoutResult | null>(null);
  const [nodeCount, setNodeCount] = useState(0);
  const [totalNodeCount, setTotalNodeCount] = useState(0);
  const [isTruncated, setIsTruncated] = useState(false);
  const [plan, setPlan] = useState<'free' | 'pro'>('free');
  const [limit, setLimit] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<LayoutNode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchTree = useCallback(async () => {
    try {
      setIsLoading(true);
      const width = containerRef.current?.clientWidth || 800;
      const height = containerRef.current?.clientHeight || 600;

      const res = await fetch(`/api/tree?width=${width}&height=${height}`);
      if (!res.ok) throw new Error('Failed to load tree');

      const data = await res.json();
      setLayout(data.layout);
      setNodeCount(data.nodeCount);
      setTotalNodeCount(data.totalNodeCount ?? data.nodeCount ?? 0);
      setIsTruncated(Boolean(data.truncated));
      setPlan(data.plan === 'pro' ? 'pro' : 'free');
      setLimit(typeof data.limit === 'number' ? data.limit : null);
      setError(null);
    } catch {
      setError(t('loadFailed'));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchTree();
  }, [fetchTree]);

  if (!isLoading && nodeCount === 0) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
        </div>

        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center space-y-4 py-24">
            <TreeDeciduous className="h-16 w-16 text-muted-foreground/30" />
            <div className="space-y-2 text-center">
              <h3 className="text-lg font-semibold">{t('emptyTitle')}</h3>
              <p className="max-w-md text-sm text-muted-foreground">{t('emptyDescription')}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 px-4 py-3 md:px-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
            <p className="text-sm text-muted-foreground">
              {nodeCount} {t('nodes')} &middot; {t('clickHint')}
            </p>
          </div>
          {plan === 'free' && <Badge variant="outline">{t('freePlan')}</Badge>}
        </div>
        {isTruncated && (
          <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-muted-foreground">
            {t('showingLimited', {
              nodeCount,
              totalNodeCount,
              limitText: limit ? t('limitSuffix', { limit }) : '',
            })}
          </div>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div ref={containerRef} className={`flex-1 ${selectedNode ? 'hidden md:block' : ''}`}>
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <Skeleton className="h-64 w-64 rounded-full" />
            </div>
          ) : error ? (
            <div className="flex h-full items-center justify-center text-sm text-destructive">{error}</div>
          ) : layout ? (
            <DestinyTree layout={layout} onNodeClick={(node) => setSelectedNode(node)} />
          ) : null}
        </div>

        {selectedNode && (
          <div className="w-full shrink-0 md:w-80">
            <NodeDetail
              node={selectedNode}
              onClose={() => setSelectedNode(null)}
              onNodeUpdated={(updatedNode) => {
                setSelectedNode((current) => (
                  current && current.id === updatedNode.id ? { ...current, ...updatedNode } : current
                ));
                void fetchTree();
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

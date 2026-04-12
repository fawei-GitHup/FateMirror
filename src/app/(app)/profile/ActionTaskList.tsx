'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ActionTask } from '@/types';

export function ActionTaskList({ initialTasks }: { initialTasks: ActionTask[] }) {
  const t = useTranslations('actionTasks');
  const [tasks, setTasks] = useState(initialTasks);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function updateTask(id: string, status: ActionTask['status']) {
    setLoadingId(id);
    try {
      const response = await fetch('/api/actions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });

      if (!response.ok) {
        throw new Error(t('updateFailed'));
      }

      const { task } = await response.json();
      setTasks((current) =>
        current
          .map((item) => (item.id === task.id ? task : item))
          .filter((item) => item.status !== 'dismissed')
      );
    } finally {
      setLoadingId(null);
    }
  }

  if (tasks.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {tasks
        .filter((task) => task.status !== 'dismissed')
        .map((task) => (
          <div key={task.id} className="rounded-lg border border-border bg-card/50 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-medium">{task.title}</p>
                {task.reason ? (
                  <p className="text-xs text-muted-foreground">{task.reason}</p>
                ) : null}
                <p className="text-sm text-foreground">{task.prompt}</p>
              </div>
              <div className="flex gap-1">
                <Button
                  type="button"
                  size="icon"
                  variant={task.status === 'completed' ? 'default' : 'outline'}
                  disabled={loadingId === task.id}
                  onClick={() => updateTask(task.id, 'completed')}
                  aria-label={t('markComplete')}
                  title={t('markComplete')}
                >
                  {loadingId === task.id ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Check className="size-3.5" />
                  )}
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  disabled={loadingId === task.id}
                  onClick={() => updateTask(task.id, 'dismissed')}
                  aria-label={t('dismiss')}
                  title={t('dismiss')}
                >
                  <X className="size-3.5" />
                </Button>
              </div>
            </div>
          </div>
        ))}
    </div>
  );
}

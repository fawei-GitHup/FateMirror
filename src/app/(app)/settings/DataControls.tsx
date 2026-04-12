'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Download, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';

export function DataControls() {
  const router = useRouter();
  const t = useTranslations('dataControls');
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    setIsExporting(true);
    setError(null);

    try {
      const response = await fetch('/api/account/export');
      if (!response.ok) {
        throw new Error(t('exportFailed'));
      }

      const payload = await response.json();
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `fatemirror-export-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setError(t('exportFailed'));
    } finally {
      setIsExporting(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(t('deleteConfirm'));

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch('/api/account', { method: 'DELETE' });
      if (!response.ok) {
        throw new Error(t('deleteFailed'));
      }

      await createClient().auth.signOut();
      router.replace('/');
      router.refresh();
    } catch {
      setError(t('deleteFailed'));
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={handleExport}
          disabled={isExporting || isDeleting}
        >
          {isExporting ? (
            <Loader2 className="mr-1.5 size-3.5 animate-spin" />
          ) : (
            <Download className="mr-1.5 size-3.5" />
          )}
          {t('export')}
        </Button>
        <Button
          type="button"
          variant="destructive"
          onClick={handleDelete}
          disabled={isExporting || isDeleting}
        >
          {isDeleting ? (
            <Loader2 className="mr-1.5 size-3.5 animate-spin" />
          ) : (
            <Trash2 className="mr-1.5 size-3.5" />
          )}
          {t('delete')}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

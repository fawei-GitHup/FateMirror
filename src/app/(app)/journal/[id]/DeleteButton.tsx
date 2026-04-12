'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DeleteJournalButtonProps {
  journalId: string;
}

export function DeleteJournalButton({ journalId }: DeleteJournalButtonProps) {
  const t = useTranslations('journal');
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmStep, setConfirmStep] = useState(false);

  const handleDelete = async () => {
    if (!confirmStep) {
      setConfirmStep(true);
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/journal/${journalId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        router.push('/journal');
        router.refresh();
      }
    } catch {
      setIsDeleting(false);
      setConfirmStep(false);
    }
  };

  return (
    <Button
      variant={confirmStep ? 'destructive' : 'ghost'}
      size="sm"
      onClick={handleDelete}
      disabled={isDeleting}
      onBlur={() => setConfirmStep(false)}
    >
      {isDeleting ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <Trash2 className="size-3.5" />
      )}
      <span className="ml-1.5">
        {confirmStep ? t('confirmDelete') : t('delete')}
      </span>
    </Button>
  );
}

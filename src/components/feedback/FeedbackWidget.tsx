'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { MessageSquarePlus, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

type FeedbackType = 'bug' | 'feature' | 'general';

export function FeedbackWidget() {
  const t = useTranslations('feedback');
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [type, setType] = useState<FeedbackType>('general');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const feedbackTypes: { value: FeedbackType; labelKey: 'bug' | 'feature' | 'general' }[] = [
    { value: 'bug', labelKey: 'bug' },
    { value: 'feature', labelKey: 'feature' },
    { value: 'general', labelKey: 'general' },
  ];

  function reset() {
    setRating(0);
    setHoverRating(0);
    setType('general');
    setMessage('');
    setSuccess(false);
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          rating,
          message,
          pageUrl: window.location.href,
        }),
      });
      if (res.ok) {
        setSuccess(true);
      }
    } catch {
      // silently fail for now
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    setOpen(false);
    // Reset after animation
    setTimeout(reset, 200);
  }

  return (
    <>
      <Button
        variant="default"
        size="icon"
        className="fixed bottom-6 right-6 z-50 h-12 w-12 rounded-full shadow-lg"
        onClick={() => setOpen(true)}
        aria-label={t('title')}
      >
        <MessageSquarePlus className="size-5" />
      </Button>

      <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : handleClose())}>
        <DialogContent className="sm:max-w-md">
          {success ? (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <p className="text-base font-medium">{t('success')}</p>
              <Button variant="outline" onClick={handleClose}>
                {t('close')}
              </Button>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>{t('title')}</DialogTitle>
                <DialogDescription>{t('rateExperience')}</DialogDescription>
              </DialogHeader>

              {/* Star rating */}
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className="rounded p-0.5 transition-colors hover:bg-muted"
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setRating(star)}
                  >
                    <Star
                      className={`size-6 transition-colors ${
                        star <= (hoverRating || rating)
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-muted-foreground'
                      }`}
                    />
                  </button>
                ))}
              </div>

              {/* Feedback type */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t('feedbackType')}</label>
                <div className="flex gap-2">
                  {feedbackTypes.map((ft) => (
                    <Button
                      key={ft.value}
                      variant={type === ft.value ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setType(ft.value)}
                    >
                      {t(ft.labelKey)}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Message */}
              <Textarea
                placeholder={t('message')}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
              />

              <DialogFooter>
                <Button variant="outline" onClick={handleClose}>
                  {t('close')}
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={submitting || (!message.trim() && rating === 0)}
                >
                  {t('submit')}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

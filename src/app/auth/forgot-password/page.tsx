'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Mail } from 'lucide-react';

export default function ForgotPasswordPage() {
  const t = useTranslations('auth');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSent(true);
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-primary/10">
              <Mail className="size-6 text-primary" />
            </div>
            <CardTitle>{t('checkEmail')}</CardTitle>
            <CardDescription>{t('resetLinkSentTo', { email })}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full" onClick={() => { setSent(false); setEmail(''); }}>
              {t('tryDifferentEmail')}
            </Button>
            <Link href="/auth/login" className="block">
              <Button variant="ghost" className="w-full gap-2">
                <ArrowLeft className="size-4" />
                {t('backToLogin')}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{t('resetPassword')}</CardTitle>
          <CardDescription>{t('resetDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-3">
            <Input type="email" placeholder={t('email')} value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t('sending') : t('sendResetLink')}
            </Button>
          </form>

          <Link href="/auth/login" className="block">
            <Button variant="ghost" className="w-full gap-2">
              <ArrowLeft className="size-4" />
              {t('backToLogin')}
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

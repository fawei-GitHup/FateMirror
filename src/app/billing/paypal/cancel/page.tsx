import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default async function PayPalCancelPage() {
  const t = await getTranslations('billingPages');

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle>{t('checkoutCanceled')}</CardTitle>
          <CardDescription>{t('noPaymentCaptured')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">{t('cancelDescription')}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Link href="/pricing">
              <Button variant="outline" className="w-full">
                {t('backToPricing')}
              </Button>
            </Link>
            <Link href="/settings">
              <Button className="w-full">{t('openSettings')}</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

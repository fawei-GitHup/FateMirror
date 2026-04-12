import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { TooltipProvider } from '@/components/ui/tooltip';
import { StarryBackground } from '@/components/ui/starry-background';
import './globals.css';

export const metadata: Metadata = {
  title: 'FateMirror — Break Your Life Patterns',
  description:
    'AI-powered life pattern recognition engine. See your repeated mistakes, understand why you repeat them, and break the cycle using your own words.',
  keywords: [
    'AI journal',
    'life patterns',
    'self improvement',
    'habit breaking',
    'cognitive behavioral',
    'stoic journal',
  ],
  openGraph: {
    title: 'FateMirror — Break Your Life Patterns',
    description: 'An AI that uses your own past words to stop you from repeating mistakes.',
    type: 'website',
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} className="dark h-full antialiased">
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <StarryBackground />
        <NextIntlClientProvider messages={messages}>
          <TooltipProvider>{children}</TooltipProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

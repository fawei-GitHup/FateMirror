'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import {
  BookOpen,
  TreeDeciduous,
  Layers,
  Settings,
  LogOut,
  PenLine,
  Brain,
  Menu,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useState } from 'react';
import { LocaleToggle } from '@/components/layout/LocaleToggle';

interface AppShellProps {
  user: {
    id: string;
    email: string;
    displayName: string;
    level: number;
    levelName: string;
  };
  children: React.ReactNode;
}

import { LEVEL_BADGE_STYLES } from '@/lib/ui/constants';

function SidebarContent({
  user,
  pathname,
  onLogout,
}: {
  user: AppShellProps['user'];
  pathname: string;
  onLogout: () => void;
}) {
  const t = useTranslations('nav');
  const tLevels = useTranslations('levels');
  const navItems = [
    { href: '/journal', label: t('journal'), icon: BookOpen },
    { href: '/tree', label: t('tree'), icon: TreeDeciduous },
    { href: '/chapters', label: t('chapters'), icon: Layers },
    { href: '/profile', label: t('profile'), icon: Brain },
    { href: '/settings', label: t('settings'), icon: Settings },
  ];

  return (
    <div className="flex h-full flex-col">
      <div className="p-6 pb-4">
        <Link href="/" className="text-xl font-bold tracking-tight">
          <span className="text-primary">Fate</span>
          <span className="text-muted-foreground">Mirror</span>
        </Link>
      </div>

      <div className="px-4 pb-4">
        <Link href="/journal/new">
          <Button className="w-full gap-2" size="sm">
            <PenLine className="h-4 w-4" />
            {t('newJournal')}
          </Button>
        </Link>
      </div>

      <Separator />

      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                isActive
                  ? 'bg-accent font-medium text-accent-foreground'
                  : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <Separator />

      <div className="space-y-3 p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">
              {user.displayName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user.displayName}</p>
            <Badge
              variant="outline"
              className={`px-1.5 py-0 text-[10px] ${LEVEL_BADGE_STYLES[user.level] || ''}`}
            >
              Lv.{user.level} {tLevels(`level${user.level}`)}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 justify-start gap-2 text-muted-foreground"
            onClick={onLogout}
          >
            <LogOut className="h-4 w-4" />
            {t('signOut')}
          </Button>
          <LocaleToggle />
        </div>
      </div>
    </div>
  );
}

export function AppShell({ user, children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="hidden flex-col border-r border-border/40 bg-card/30 md:flex md:w-60 lg:w-64">
        <SidebarContent user={user} pathname={pathname} onLogout={handleLogout} />
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center justify-between border-b border-border/40 px-4 py-3 md:hidden">
          <Link href="/" className="text-lg font-bold tracking-tight">
            <span className="text-primary">Fate</span>
            <span className="text-muted-foreground">Mirror</span>
          </Link>
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger render={<Button variant="ghost" size="icon" />}>
              <Menu className="h-5 w-5" />
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <SidebarContent user={user} pathname={pathname} onLogout={handleLogout} />
            </SheetContent>
          </Sheet>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

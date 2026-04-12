import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { FeedbackWidget } from '@/components/feedback/FeedbackWidget';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Fetch profile for sidebar display
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, level, level_name')
    .eq('user_id', user.id)
    .single();

  return (
    <>
      <AppShell
        user={{
          id: user.id,
          email: user.email || '',
          displayName: profile?.display_name || user.email || 'User',
          level: profile?.level || 0,
          levelName: profile?.level_name || 'Sleeper',
        }}
      >
        {children}
      </AppShell>
      <FeedbackWidget />
    </>
  );
}

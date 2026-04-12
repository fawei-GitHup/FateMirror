'use client';

import { useTranslations } from 'next-intl';
import type { ThinkingLevel as TLevel } from '@/types';

interface ThinkingLevelProps {
  level: TLevel;
  byTheme?: Record<string, TLevel>;
}

const LEVELS: TLevel[] = ['L1', 'L2', 'L3', 'L4'];

export function ThinkingLevel({ level, byTheme }: ThinkingLevelProps) {
  const t = useTranslations('cognition');
  const currentIdx = LEVELS.indexOf(level);

  const levelInfo: Record<TLevel, { label: string; description: string; color: string }> = {
    L1: { label: t('point'), description: t('levelL1'), color: 'bg-red-500' },
    L2: { label: t('linear'), description: t('levelL2'), color: 'bg-yellow-500' },
    L3: { label: t('systemic'), description: t('levelL3'), color: 'bg-blue-500' },
    L4: { label: t('meta'), description: t('levelL4'), color: 'bg-green-500' },
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">
            {level} - {levelInfo[level].label}
          </span>
          <span className="text-xs text-muted-foreground">{levelInfo[level].description}</span>
        </div>
        <div className="flex gap-1">
          {LEVELS.map((currentLevel, index) => (
            <div
              key={currentLevel}
              className={`h-2 flex-1 rounded-full ${index <= currentIdx ? levelInfo[currentLevel].color : 'bg-zinc-800'}`}
            />
          ))}
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground">
          {LEVELS.map((currentLevel) => (
            <span key={currentLevel}>{currentLevel}</span>
          ))}
        </div>
      </div>

      {byTheme && Object.keys(byTheme).length > 0 && (
        <div className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">{t('byTheme')}</span>
          <div className="grid gap-1.5">
            {Object.entries(byTheme).map(([theme, themeLevel]) => (
              <div key={theme} className="flex items-center justify-between rounded-md bg-zinc-900 px-3 py-1.5">
                <span className="text-xs capitalize">{theme}</span>
                <div className="flex items-center gap-1.5">
                  <div className={`size-2 rounded-full ${levelInfo[themeLevel].color}`} />
                  <span className="text-xs text-muted-foreground">
                    {themeLevel} - {levelInfo[themeLevel].label}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

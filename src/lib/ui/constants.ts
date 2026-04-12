/**
 * Shared UI style constants.
 *
 * Centralizes color/style dictionaries that were previously duplicated
 * across HabitLoopCard, PatternAlert, NodeDetail, AppShell, etc.
 */

// --- Habit Loop / Pattern status badge styles ---

export const LOOP_STATUS_STYLES: Record<string, string> = {
  active: 'bg-red-500/10 text-red-400 border-red-500/20',
  observed: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  breaking: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  broken: 'bg-green-500/10 text-green-400 border-green-500/20',
};

export const PATTERN_STATUS_STYLES: Record<string, string> = {
  active: 'bg-destructive/10 text-destructive border-destructive/20',
  breaking: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
  resolved: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
};

// --- Tree node type badge styles ---

export const NODE_TYPE_STYLES: Record<string, string> = {
  milestone: 'bg-green-500/10 text-green-400 border-green-500/20',
  choice: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  insight: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  crisis: 'bg-red-500/10 text-red-400 border-red-500/20',
};

// --- Node type colors for D3.js rendering ---

export const NODE_TYPE_FILL: Record<string, string> = {
  milestone: '#22c55e',
  choice: '#3b82f6',
  insight: '#a855f7',
  crisis: '#ef4444',
};

// --- Level system colors ---

export const LEVEL_BADGE_STYLES: Record<number, string> = {
  0: 'bg-zinc-600',
  1: 'bg-green-600',
  2: 'bg-blue-600',
  3: 'bg-purple-600',
  4: 'bg-orange-600',
  5: 'bg-amber-600',
  6: 'bg-yellow-500',
};

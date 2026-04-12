import type { HabitLoop, Profile, ThinkingLevel } from '@/types';

export interface MicroAction {
  title: string;
  reason: string;
  prompt: string;
}

function actionForThinking(level: ThinkingLevel): MicroAction {
  if (level === 'L1') {
    return {
      title: 'Name Two Other Causes',
      reason: 'Your current lens is still narrow.',
      prompt: 'Before acting, write down two non-obvious factors that could also be shaping this situation.',
    };
  }

  if (level === 'L2') {
    return {
      title: 'Map The Feedback Loop',
      reason: 'You can see the chain, but not yet the system.',
      prompt: 'Sketch A -> B -> C, then add one arrow showing how the situation loops back onto itself.',
    };
  }

  if (level === 'L3') {
    return {
      title: 'Pick The Lever',
      reason: 'You see many factors. You now need one decisive move.',
      prompt: 'Choose the single variable you actually control today and act only on that one.',
    };
  }

  return {
    title: 'Challenge Your Clean Story',
    reason: 'Your analysis is advanced enough to hide behind.',
    prompt: 'Write one sentence about what your current framework might still be missing.',
  };
}

function actionForBehavior(profile: Profile): MicroAction | null {
  switch (profile.behavior_primary) {
    case 'please':
      return {
        title: 'One Honest No',
        reason: 'Your profile still leans toward preserving peace at your own expense.',
        prompt: 'Say one clear no in the next 24 hours without adding apology padding.',
      };
    case 'avoid':
      return {
        title: 'Touch The Real Thing',
        reason: 'Avoidance survives by delay.',
        prompt: 'Spend ten minutes on the exact conversation or task you have been circling around.',
      };
    case 'over-compensate':
      return {
        title: 'Pause Before Paying',
        reason: 'You often try to solve emotional tension with extra output or extra giving.',
        prompt: 'When guilt spikes, wait fifteen minutes before offering money, gifts, or overwork.',
      };
    case 'control':
      return {
        title: 'Leave One Variable Open',
        reason: 'Control can look productive while still being fear-driven.',
        prompt: 'Deliberately leave one low-risk detail unoptimized and notice what happens inside you.',
      };
    case 'prove':
      return {
        title: 'Do One Unimpressive Thing',
        reason: 'Not every move needs to validate your worth.',
        prompt: 'Finish one useful task that nobody will praise you for.',
      };
    case 'victim':
      return {
        title: 'Write Your Move',
        reason: 'External blame shrinks agency.',
        prompt: 'Write one sentence starting with "My move is..." and make it concrete.',
      };
    default:
      return null;
  }
}

function actionForLoop(loop: HabitLoop | null): MicroAction | null {
  if (!loop) {
    return null;
  }

  return {
    title: 'Interrupt The Cue',
    reason: `Your active loop still starts with: ${loop.cue}`,
    prompt: `When that cue appears, do not follow the usual response "${loop.response}". Replace it with one written pause: "What did last time cost me?"`,
  };
}

export function buildMicroActions(
  profile: Profile | null,
  loops: HabitLoop[]
): MicroAction[] {
  if (!profile) {
    return [];
  }

  const actions: MicroAction[] = [];
  actions.push(actionForThinking(profile.thinking_level_overall));

  const behaviorAction = actionForBehavior(profile);
  if (behaviorAction) {
    actions.push(behaviorAction);
  }

  const activeLoop =
    loops.find((loop) => loop.status === 'breaking') ??
    loops.find((loop) => loop.status === 'active') ??
    loops[0] ??
    null;
  const loopAction = actionForLoop(activeLoop);
  if (loopAction) {
    actions.push(loopAction);
  }

  return actions.slice(0, 3);
}

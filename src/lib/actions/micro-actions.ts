import type { HabitLoop, Profile, ThinkingLevel } from '@/types';
import type { Locale } from '@/i18n/config';

export interface MicroAction {
  title: string;
  reason: string;
  prompt: string;
}

const THINKING_ACTIONS: Record<ThinkingLevel, { en: MicroAction; zh: MicroAction }> = {
  L1: {
    en: {
      title: 'Name Two Other Causes',
      reason: 'Your current lens is still narrow.',
      prompt: 'Before acting, write down two non-obvious factors that could also be shaping this situation.',
    },
    zh: {
      title: '写出另外两个原因',
      reason: '你当前的视角还比较窄。',
      prompt: '在行动之前，写下两个不太明显但可能也在影响这个局面的因素。',
    },
  },
  L2: {
    en: {
      title: 'Map The Feedback Loop',
      reason: 'You can see the chain, but not yet the system.',
      prompt: 'Sketch A -> B -> C, then add one arrow showing how the situation loops back onto itself.',
    },
    zh: {
      title: '画出反馈回路',
      reason: '你能看到因果链，但还没看到系统。',
      prompt: '画出 A -> B -> C，然后加一条箭头，标出这个情境是怎么自我循环的。',
    },
  },
  L3: {
    en: {
      title: 'Pick The Lever',
      reason: 'You see many factors. You now need one decisive move.',
      prompt: 'Choose the single variable you actually control today and act only on that one.',
    },
    zh: {
      title: '找到杠杆点',
      reason: '你看到了很多因素。现在需要一个决定性的动作。',
      prompt: '选出你今天真正能控制的那一个变量，只对它采取行动。',
    },
  },
  L4: {
    en: {
      title: 'Challenge Your Clean Story',
      reason: 'Your analysis is advanced enough to hide behind.',
      prompt: 'Write one sentence about what your current framework might still be missing.',
    },
    zh: {
      title: '质疑你的完美叙事',
      reason: '你的分析已经足够精致，精致到可以藏在后面了。',
      prompt: '写一句话，说说你当前的分析框架可能还遗漏了什么。',
    },
  },
};

type BehaviorType = 'please' | 'avoid' | 'over-compensate' | 'control' | 'prove' | 'victim';

const BEHAVIOR_ACTIONS: Record<BehaviorType, { en: MicroAction; zh: MicroAction }> = {
  please: {
    en: {
      title: 'One Honest No',
      reason: 'Your profile still leans toward preserving peace at your own expense.',
      prompt: 'Say one clear no in the next 24 hours without adding apology padding.',
    },
    zh: {
      title: '说一次真诚的"不"',
      reason: '你的画像显示你还是倾向于牺牲自己来维护和平。',
      prompt: '在接下来 24 小时内，说一次清楚的"不"，不加任何道歉的缓冲。',
    },
  },
  avoid: {
    en: {
      title: 'Touch The Real Thing',
      reason: 'Avoidance survives by delay.',
      prompt: 'Spend ten minutes on the exact conversation or task you have been circling around.',
    },
    zh: {
      title: '触碰那个真正的事',
      reason: '回避靠的是拖延。',
      prompt: '花十分钟，去面对你一直在绕圈子的那个对话或任务。',
    },
  },
  'over-compensate': {
    en: {
      title: 'Pause Before Paying',
      reason: 'You often try to solve emotional tension with extra output or extra giving.',
      prompt: 'When guilt spikes, wait fifteen minutes before offering money, gifts, or overwork.',
    },
    zh: {
      title: '付出之前先暂停',
      reason: '你经常用额外的付出或给予来消解情绪张力。',
      prompt: '当内疚感突然升起时，等十五分钟再决定是否要掏钱、送礼或加班。',
    },
  },
  control: {
    en: {
      title: 'Leave One Variable Open',
      reason: 'Control can look productive while still being fear-driven.',
      prompt: 'Deliberately leave one low-risk detail unoptimized and notice what happens inside you.',
    },
    zh: {
      title: '留一个变量不管',
      reason: '控制可以看起来很有生产力，但底下可能还是恐惧在驱动。',
      prompt: '故意留一个低风险的细节不去优化，然后观察你内心的反应。',
    },
  },
  prove: {
    en: {
      title: 'Do One Unimpressive Thing',
      reason: 'Not every move needs to validate your worth.',
      prompt: 'Finish one useful task that nobody will praise you for.',
    },
    zh: {
      title: '做一件不起眼的事',
      reason: '不是每个动作都需要证明你的价值。',
      prompt: '完成一件有用但不会有人表扬你的事。',
    },
  },
  victim: {
    en: {
      title: 'Write Your Move',
      reason: 'External blame shrinks agency.',
      prompt: 'Write one sentence starting with "My move is..." and make it concrete.',
    },
    zh: {
      title: '写下你的行动',
      reason: '把责任推到外部会缩小你的行动力。',
      prompt: '写一句以"我的行动是……"开头的话，并且要具体。',
    },
  },
};

function actionForThinking(level: ThinkingLevel, locale: Locale): MicroAction {
  return THINKING_ACTIONS[level][locale];
}

function actionForBehavior(profile: Profile, locale: Locale): MicroAction | null {
  const key = profile.behavior_primary as BehaviorType | null;
  if (!key || !BEHAVIOR_ACTIONS[key]) return null;
  return BEHAVIOR_ACTIONS[key][locale];
}

function actionForLoop(loop: HabitLoop | null, locale: Locale): MicroAction | null {
  if (!loop) return null;

  if (locale === 'zh') {
    return {
      title: '打断触发点',
      reason: `你的活跃循环仍然从这里开始：${loop.cue}`,
      prompt: `当这个触发点出现时，不要跟随惯常反应"${loop.response}"。换成写一句暂停语："上次这样做的代价是什么？"`,
    };
  }

  return {
    title: 'Interrupt The Cue',
    reason: `Your active loop still starts with: ${loop.cue}`,
    prompt: `When that cue appears, do not follow the usual response "${loop.response}". Replace it with one written pause: "What did last time cost me?"`,
  };
}

export function buildMicroActions(
  profile: Profile | null,
  loops: HabitLoop[],
  locale: Locale = 'en'
): MicroAction[] {
  if (!profile) {
    return [];
  }

  const actions: MicroAction[] = [];
  actions.push(actionForThinking(profile.thinking_level_overall, locale));

  const behaviorAction = actionForBehavior(profile, locale);
  if (behaviorAction) {
    actions.push(behaviorAction);
  }

  const activeLoop =
    loops.find((loop) => loop.status === 'breaking') ??
    loops.find((loop) => loop.status === 'active') ??
    loops[0] ??
    null;
  const loopAction = actionForLoop(activeLoop, locale);
  if (loopAction) {
    actions.push(loopAction);
  }

  return actions.slice(0, 3);
}

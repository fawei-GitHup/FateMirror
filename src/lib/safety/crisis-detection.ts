const CRISIS_PATTERNS = [
  /\bkill myself\b/i,
  /\bend my life\b/i,
  /\bsuicid(?:e|al)\b/i,
  /\bi\s+want\s+to\s+die\b/i,
  /\bdon'?t want to live\b/i,
  /\bself[- ]harm\b/i,
  /\bcommit suicide\b/i,
  /不想活了/,
  /想自杀/,
  /自杀/,
  /想死了/,
  /伤害自己/,
  /结束生命/,
  /结束自己/,
];

// Patterns that negate crisis intent — reduce false positives
const CRISIS_EXCLUSIONS = [
  /\bdon'?t want to die\b/i,
  /\bafraid (?:to|of) die?\b/i,
  /\bnot (?:going to|gonna) (?:kill|hurt) myself\b/i,
  /不想死/,
  /怕死/,
];

const CRISIS_RESPONSE = [
  'Stop.',
  'If you might hurt yourself or someone else, contact emergency help right now.',
  'In the United States or Canada, call or text 988 now.',
  'If you are elsewhere, contact your local emergency number or nearest crisis hotline now.',
  'This is beyond what I can help with. Please talk to a human. Now.',
].join(' ');

export function detectCrisisLanguage(input: string): boolean {
  const content = input.trim();
  if (!content) {
    return false;
  }

  // Check exclusions first to reduce false positives
  if (CRISIS_EXCLUSIONS.some((pattern) => pattern.test(content))) {
    return false;
  }

  return CRISIS_PATTERNS.some((pattern) => pattern.test(content));
}

export function getCrisisSupportMessage(): string {
  return CRISIS_RESPONSE;
}

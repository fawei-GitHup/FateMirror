interface MessageLike {
  role: string;
  content: string;
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

export function buildGuidedTranscript(messages: MessageLike[]): string {
  return messages
    .filter((message) => message.role === 'user')
    .map((message) => message.content.trim())
    .filter(Boolean)
    .join('\n\n');
}

export function buildGuidedJournalPayload(
  extract: Record<string, unknown>,
  transcript: string
) {
  return {
    title: typeof extract.title === 'string' ? extract.title : null,
    content: transcript || (typeof extract.ai_summary === 'string' ? extract.ai_summary : ''),
    mode: 'guided' as const,
    emotions: toStringArray(extract.emotions),
    themes: toStringArray(extract.themes),
    decisions: toStringArray(extract.decisions),
    insights: toStringArray(extract.insights),
    thinking_patterns: toStringArray(extract.thinking_patterns),
    behavior_patterns: toStringArray(extract.behavior_patterns),
    ai_summary: typeof extract.ai_summary === 'string' ? extract.ai_summary : null,
  };
}

function extractValue(tag: string, prefix: string): string | null {
  return tag.startsWith(prefix) ? tag.slice(prefix.length) : null;
}

export function getThinkingLevelLabelKey(tag: string): string | null {
  const value = extractValue(tag, 'thinking:');
  return value ? `thinkingLevelLabels.${value}` : null;
}

export function getDistortionLabelKey(tag: string): string | null {
  const value = extractValue(tag, 'distortion:');
  return value ? `distortionLabels.${value}` : null;
}

export function getBehaviorLabelKey(tag: string): string | null {
  const value = extractValue(tag, 'behavior:');
  return value ? `behaviorLabels.${value}` : null;
}

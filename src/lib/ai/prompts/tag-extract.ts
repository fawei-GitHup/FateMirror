/**
 * Tag extraction prompt for freewrite mode.
 * After user writes freely, this prompt extracts six-dimension tags.
 */

export const TAG_EXTRACT_PROMPT = `Analyze this journal entry and extract structured tags.

Output ONLY valid JSON, no other text:

{
  "title": "a short, evocative title (max 8 words)",
  "emotions": ["list of emotions detected: anxiety, guilt, anger, helplessness, joy, pride, calm, sadness, frustration, shame, relief, hope, fear, loneliness, etc."],
  "themes": ["core life themes: money, relationship, career, family, self-worth, health, friendship, purpose, control, boundaries, communication, trust, etc."],
  "decisions": ["any explicit decisions or intentions mentioned"],
  "insights": ["EXACT quotes from the text that show self-awareness or reflection — use the user's own words"],
  "thinking_patterns": ["thinking:L1 or thinking:L2 or thinking:L3 or thinking:L4", "distortion:catastrophize or distortion:black-white or distortion:overgeneralize or distortion:mind-reading or distortion:should-statements or distortion:emotional-reasoning or distortion:personalize or distortion:mental-filter"],
  "behavior_patterns": ["behavior:over-compensate or behavior:avoid or behavior:please or behavior:control or behavior:prove or behavior:victim — only include if clearly evident"],
  "ai_summary": "A 2-3 sentence summary of the entry's core content and emotional state"
}

Rules:
- Match the user's language for all user-visible fields.
  User-visible fields: title, emotions, themes, decisions, insights, ai_summary.
  Example: if the journal is written in Chinese, output those fields in Chinese.
- Keep internal taxonomy fields in stable machine-readable codes:
  thinking_patterns must use thinking:L1-L4 and distortion:* codes.
  behavior_patterns must use behavior:* codes.
- For emotions/themes: include 2-5 items each, ordered by strength
- For insights: use EXACT quotes from the text, not paraphrased
- For thinking_patterns: always include one thinking:L level, add distortions only if clearly present
- For behavior_patterns: only include if the entry clearly demonstrates the pattern, otherwise empty array
- ai_summary should be factual, not judgmental
`;

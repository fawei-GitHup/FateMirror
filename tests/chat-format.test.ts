import test from 'node:test';
import assert from 'node:assert/strict';
import { formatChatText } from '../src/lib/ai/format-chat.ts';

test('formatChatText splits paragraphs and bold segments', () => {
  const formatted = formatChatText('第一段\n\n这是 **重点** 内容');

  assert.equal(formatted.length, 2);
  assert.deepEqual(formatted[0], {
    parts: [{ text: '第一段', bold: false }],
  });
  assert.deepEqual(formatted[1], {
    parts: [
      { text: '这是 ', bold: false },
      { text: '重点', bold: true },
      { text: ' 内容', bold: false },
    ],
  });
});

test('formatChatText keeps plain text as a single non-bold segment', () => {
  const formatted = formatChatText('您好');

  assert.deepEqual(formatted, [
    {
      parts: [{ text: '您好', bold: false }],
    },
  ]);
});

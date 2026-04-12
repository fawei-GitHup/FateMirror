export interface ChatTextPart {
  text: string;
  bold: boolean;
}

export interface ChatTextParagraph {
  parts: ChatTextPart[];
}

function formatInline(text: string): ChatTextPart[] {
  const parts: ChatTextPart[] = [];
  const pattern = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;

  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0;

    if (index > lastIndex) {
      parts.push({
        text: text.slice(lastIndex, index),
        bold: false,
      });
    }

    parts.push({
      text: match[1],
      bold: true,
    });

    lastIndex = index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push({
      text: text.slice(lastIndex),
      bold: false,
    });
  }

  if (parts.length === 0) {
    parts.push({ text, bold: false });
  }

  return parts;
}

export function formatChatText(content: string): ChatTextParagraph[] {
  return content
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .filter(Boolean)
    .map((paragraph) => ({
      parts: formatInline(paragraph),
    }));
}

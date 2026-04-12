'use client';

import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import type { ChatMessage } from '@/hooks/useChat';
import { formatChatText } from '@/lib/ai/format-chat';

interface ChatBubbleProps {
  message: ChatMessage;
  isStreaming?: boolean;
}

export function ChatBubble({ message, isStreaming = false }: ChatBubbleProps) {
  const t = useTranslations('chat');
  const isUser = message.role === 'user';
  const paragraphs = message.content ? formatChatText(message.content) : [];

  return (
    <div
      className={cn(
        'flex gap-3 px-4 py-2',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {/* Avatar */}
      <Avatar className="mt-0.5 shrink-0">
        <AvatarFallback
          className={cn(
            'text-xs font-medium',
            isUser
              ? 'bg-primary text-primary-foreground'
              : 'bg-zinc-700 text-zinc-200'
          )}
        >
          {isUser ? t('you') : t('mo')}
        </AvatarFallback>
      </Avatar>

      {/* Message content */}
      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
          isUser
            ? 'bg-primary text-primary-foreground rounded-br-md'
            : 'bg-zinc-800 text-zinc-100 rounded-bl-md'
        )}
      >
        {!message.content && isStreaming && (
          <span className="inline-flex items-center gap-1">
            <span className="size-1.5 animate-pulse rounded-full bg-zinc-400" />
            <span className="size-1.5 animate-pulse rounded-full bg-zinc-400 [animation-delay:150ms]" />
            <span className="size-1.5 animate-pulse rounded-full bg-zinc-400 [animation-delay:300ms]" />
          </span>
        )}
        {message.content && (
          <div className="space-y-2 whitespace-pre-wrap break-words">
            {paragraphs.map((paragraph, paragraphIndex) => (
              <p key={`${message.id}-p-${paragraphIndex}`}>
                {paragraph.parts.map((part, partIndex) =>
                  part.bold ? (
                    <strong key={`${message.id}-p-${paragraphIndex}-s-${partIndex}`}>
                      {part.text}
                    </strong>
                  ) : (
                    <span key={`${message.id}-p-${paragraphIndex}-s-${partIndex}`}>
                      {part.text}
                    </span>
                  )
                )}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

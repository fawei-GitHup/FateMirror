'use client';

import { useState, useRef, useEffect, useMemo, type KeyboardEvent } from 'react';
import { useTranslations } from 'next-intl';
import { Send, Square, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ChatBubble } from './ChatBubble';
import { useChat, type ChatMessage } from '@/hooks/useChat';

interface ChatWindowProps {
  mode: 'chat' | 'guided';
  onSessionComplete?: (extract: Record<string, unknown>, transcript: string) => void;
  onMessagesChange?: (messages: ChatMessage[]) => void;
  /** Initial greeting message from Lao Mo */
  greeting?: string;
}

export function ChatWindow({
  mode,
  onSessionComplete,
  onMessagesChange,
  greeting,
}: ChatWindowProps) {
  const t = useTranslations('chat');
  const { messages, isLoading, error, sendMessage, stop, reset } = useChat({
    mode,
    onSessionComplete,
  });
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Build display messages: prepend greeting if provided
  const displayMessages = useMemo<ChatMessage[]>(
    () =>
      greeting
        ? [{ id: 'greeting', role: 'assistant', content: greeting }, ...messages]
        : messages,
    [greeting, messages]
  );

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [displayMessages]);

  useEffect(() => {
    onMessagesChange?.(messages);
  }, [messages, onMessagesChange]);

  // Focus textarea on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    sendMessage(input);
    setInput('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto py-4">
        {displayMessages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            {t('empty')}
          </div>
        ) : (
          <div className="space-y-1">
            {displayMessages.map((msg, i) => (
              <ChatBubble
                key={msg.id}
                message={msg}
                isStreaming={
                  isLoading &&
                  i === displayMessages.length - 1 &&
                  msg.role === 'assistant'
                }
              />
            ))}
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className="mx-4 mt-2 rounded-lg bg-destructive/10 px-4 py-2 text-sm text-destructive">
            {error}
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="border-t border-border bg-background/80 px-4 py-3 backdrop-blur-sm">
        <div className="flex items-end gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              mode === 'guided'
                ? t('guidedPlaceholder')
                : t('freewritePlaceholder')
            }
            className="min-h-10 max-h-32 resize-none"
            disabled={isLoading}
          />
          <div className="flex gap-1">
            {isLoading ? (
              <Button
                size="icon"
                variant="ghost"
                onClick={stop}
                title={t('stop')}
              >
                <Square className="size-4" />
              </Button>
            ) : (
              <Button
                size="icon"
                onClick={handleSend}
                disabled={!input.trim()}
                title={t('send')}
              >
                <Send className="size-4" />
              </Button>
            )}
            {messages.length > 0 && !isLoading && (
              <Button
                size="icon"
                variant="ghost"
                onClick={reset}
                title={t('reset')}
              >
                <RotateCcw className="size-4" />
              </Button>
            )}
          </div>
        </div>
        <p className="mt-1.5 text-center text-xs text-muted-foreground">
          {t('shiftEnter')}
        </p>
      </div>
    </div>
  );
}

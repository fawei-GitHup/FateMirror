'use client';

import { useState, useCallback, useRef } from 'react';
import { loadUserAIConfig } from '@/lib/ai/browser-config';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface UseChatOptions {
  mode?: 'chat' | 'guided';
  onSessionComplete?: (extract: Record<string, unknown>, transcript: string) => void;
}

/**
 * Strip hidden AI blocks from visible content.
 * Handles both complete blocks (<tag>...</tag>) and
 * incomplete blocks mid-stream (<tag>... with no closing tag yet).
 */
function stripHiddenBlocks(content: string) {
  return content
    // Complete blocks
    .replace(/<cognition_tags>[\s\S]*?<\/cognition_tags>/g, '')
    .replace(/<journal_extract>[\s\S]*?<\/journal_extract>/g, '')
    .replace(/<session_complete\s*\/>/g, '')
    // Incomplete blocks still streaming (opening tag present, no closing tag yet)
    .replace(/<cognition_tags>[\s\S]*$/g, '')
    .replace(/<journal_extract>[\s\S]*$/g, '')
    .replace(/<session_complete[\s\S]*$/g, '')
    .trim();
}

export function useChat(options: UseChatOptions = {}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  // Use refs to avoid re-creating sendMessage on every message/loading change
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const loadingRef = useRef(isLoading);
  loadingRef.current = isLoading;
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || loadingRef.current) return;

      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: content.trim(),
      };

      const newMessages = [...messagesRef.current, userMessage];
      setMessages(newMessages);
      setIsLoading(true);
      setError(null);

      // Prepare assistant placeholder
      const assistantId = crypto.randomUUID();
      setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', content: '' }]);

      try {
        abortRef.current = new AbortController();

        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
            mode: optionsRef.current.mode || 'chat',
            aiConfig: loadUserAIConfig(),
          }),
          signal: abortRef.current.signal,
        });

        if (!res.ok) {
          let message = `Chat API error: ${res.status}`;
          try {
            const payload = await res.json();
            if (typeof payload?.error === 'string') {
              message = payload.error;
            }
          } catch {
            // Fall back to status-only error.
          }
          throw new Error(message);
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error('No reader available');

        const decoder = new TextDecoder();
        let fullContent = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                if (parsed.text) {
                  fullContent += parsed.text;
                  const visibleContent = stripHiddenBlocks(fullContent);
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantId ? { ...m, content: visibleContent } : m
                    )
                  );
                }
              } catch {
                // Skip malformed JSON chunks
              }
            }
          }
        }

        // Check for session completion (guided mode)
        if (optionsRef.current.mode === 'guided' && fullContent.includes('<session_complete')) {
          const extractMatch = fullContent.match(
            /<journal_extract>([\s\S]*?)<\/journal_extract>/
          );
          if (extractMatch && optionsRef.current.onSessionComplete) {
            try {
              const extract = JSON.parse(extractMatch[1]);
              const transcript = newMessages
                .filter((message) => message.role === 'user')
                .map((message) => message.content.trim())
                .filter(Boolean)
                .join('\n\n');
              optionsRef.current.onSessionComplete(extract, transcript);
            } catch {
              // Extract parsing failed — not critical
            }
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          setError(err.message);
        }
      } finally {
        setIsLoading(false);
        abortRef.current = null;
      }
    },
    [] // stable: all mutable state accessed via refs
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setIsLoading(false);
  }, []);

  const reset = useCallback(() => {
    setMessages([]);
    setError(null);
    setIsLoading(false);
  }, []);

  return { messages, isLoading, error, sendMessage, stop, reset };
}

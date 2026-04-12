import Anthropic from '@anthropic-ai/sdk';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserAIProvider } from './user-config.ts';
import { recordAIUsageEvent } from './usage.ts';

export interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface GenerateTextOptions {
  system?: string;
  messages: AIMessage[];
  maxTokens?: number;
  model?: string;
  provider?: UserAIProvider;
  apiKey?: string;
  baseUrl?: string;
  usage?: AIUsageContext;
}

export interface AIUsageContext {
  supabase: SupabaseClient;
  userId: string;
  feature: string;
  plan: 'free' | 'pro';
  journalId?: string | null;
  usedUserKey: boolean;
}

let anthropicClient: Anthropic | null = null;

function hasAnthropicConfig(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

function hasOpenAIConfig(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

export function getAnthropicClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not configured');
  }

  if (!anthropicClient) {
    anthropicClient = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return anthropicClient;
}

export function getPrimaryModel(): string {
  return process.env.AI_PRIMARY_MODEL || 'claude-sonnet-4-6';
}

export function getDeepModel(): string {
  return process.env.AI_DEEP_MODEL || 'claude-opus-4-6';
}

/**
 * Light model for pipeline analysis tasks (tag extraction, thinking/behavior detection, etc.)
 * These tasks produce structured JSON and don't need Sonnet-level quality.
 * Saves ~75% on per-journal pipeline costs.
 */
export function getLightModel(): string {
  return process.env.AI_LIGHT_MODEL || 'claude-haiku-4-5-20251001';
}

/**
 * Free-tier model — DeepSeek V3 for near-zero marginal cost.
 * Free users get all AI features powered by DeepSeek instead of Claude.
 */
export function getFreeModel(): string {
  return process.env.AI_FREE_MODEL || 'deepseek-chat';
}

function getDeepSeekBaseUrl(): string {
  return (process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1').replace(/\/$/, '');
}

export function getFallbackModel(): string {
  return process.env.OPENAI_MODEL || 'gpt-4.1-mini';
}

function getOpenAIBaseUrl(): string {
  return (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/$/, '');
}

function hasCustomProviderConfig(options: GenerateTextOptions): boolean {
  return Boolean(options.provider && options.apiKey);
}

function estimateInputTokens(options: GenerateTextOptions): number {
  const systemTokens = options.system ? estimateTokens(options.system) : 0;
  const messageTokens = options.messages.reduce(
    (sum, message) => sum + estimateTokens(message.content),
    0
  );
  return systemTokens + messageTokens;
}

async function persistUsageIfNeeded(
  options: GenerateTextOptions,
  outputText: string,
  override?: Partial<Pick<GenerateTextOptions, 'model' | 'provider'>>
): Promise<void> {
  if (!options.usage) {
    return;
  }

  const model = override?.model || options.model || '';
  if (!model) {
    return;
  }

  try {
    await recordAIUsageEvent(options.usage.supabase, {
      userId: options.usage.userId,
      journalId: options.usage.journalId ?? null,
      feature: options.usage.feature,
      plan: options.usage.plan,
      provider: override?.provider ?? options.provider ?? null,
      model,
      inputTokens: estimateInputTokens(options),
      outputTokens: estimateTokens(outputText),
      cachedInputTokens: 0,
      usedUserKey: options.usage.usedUserKey,
    });
  } catch (error) {
    console.error('[AI usage] failed to persist event:', error);
  }
}

function getConfiguredApiKey(options: GenerateTextOptions, envVar: string): string {
  const apiKey = options.apiKey || process.env[envVar];
  if (!apiKey) {
    throw new Error(`${envVar} is not configured`);
  }
  return apiKey;
}

/**
 * Route model selection based on user plan and task type.
 * Free users → DeepSeek (all tasks)
 * Pro users → Sonnet (chat) / Haiku (pipeline)
 */
export type AITask = 'chat' | 'pipeline' | 'deep';
export function getModelForPlan(plan: 'free' | 'pro', task: AITask = 'chat'): string {
  if (plan === 'free') return getFreeModel();
  if (task === 'deep') return getDeepModel();
  if (task === 'pipeline') return getLightModel();
  return getPrimaryModel();
}

async function generateAnthropicText(
  options: GenerateTextOptions
): Promise<string> {
  const anthropic = getAnthropicClient();
  const response = await anthropic.messages.create({
    model: options.model || getPrimaryModel(),
    max_tokens: options.maxTokens || 512,
    system: options.system,
    messages: options.messages,
  });

  return response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('');
}

function hasDeepSeekConfig(): boolean {
  return Boolean(process.env.DEEPSEEK_API_KEY);
}

/**
 * Generate text via DeepSeek API (OpenAI-compatible).
 * Used for Free-tier users to keep costs near zero.
 */
async function generateDeepSeekText(
  options: GenerateTextOptions
): Promise<string> {
  const response = await fetch(`${getDeepSeekBaseUrl()}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: options.model || getFreeModel(),
      messages: [
        ...(options.system
          ? [{ role: 'system', content: options.system }]
          : []),
        ...options.messages,
      ],
      max_tokens: options.maxTokens || 512,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const status = response.status;
    // Log full body server-side only; never expose raw API error to callers
    const body = await response.text().catch(() => '');
    console.error(`[DeepSeek] ${status} response (truncated):`, body.slice(0, 200));
    throw new Error(`DeepSeek request failed with status ${status}`);
  }

  const payload = await response.json();
  return payload.choices?.[0]?.message?.content || '';
}

async function generateOpenAIText(
  options: GenerateTextOptions
): Promise<string> {
  const response = await fetch(`${getOpenAIBaseUrl()}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: options.model || getFallbackModel(),
      messages: [
        ...(options.system
          ? [{ role: 'system', content: options.system }]
          : []),
        ...options.messages,
      ],
      max_tokens: options.maxTokens || 512,
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const status = response.status;
    const body = await response.text().catch(() => '');
    console.error(`[OpenAI] ${status} response (truncated):`, body.slice(0, 200));
    throw new Error(`OpenAI request failed with status ${status}`);
  }

  const payload = await response.json();
  const content = payload.choices?.[0]?.message?.content;

  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part?.text === 'string' ? part.text : ''))
      .join('');
  }

  return '';
}

async function generateOpenAICompatibleText(
  options: GenerateTextOptions,
  defaultBaseUrl: string
): Promise<string> {
  const apiKey = getConfiguredApiKey(options, 'OPENAI_API_KEY');
  const baseUrl = normalizeBaseUrl(options.baseUrl || defaultBaseUrl);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  };

  if (options.provider === 'openrouter') {
    headers['HTTP-Referer'] = 'https://fatemirror.app';
    headers['X-Title'] = 'FateMirror';
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: options.model || getFallbackModel(),
      messages: [
        ...(options.system
          ? [{ role: 'system', content: options.system }]
          : []),
        ...options.messages,
      ],
      max_tokens: options.maxTokens || 512,
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const status = response.status;
    const body = await response.text().catch(() => '');
    console.error(`[${options.provider || 'openai-compatible'}] ${status} response (truncated):`, body.slice(0, 200));
    throw new Error(`AI request failed with status ${status}`);
  }

  const payload = await response.json();
  const content = payload.choices?.[0]?.message?.content;

  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part?.text === 'string' ? part.text : ''))
      .join('');
  }

  return '';
}

async function generateClaudeText(options: GenerateTextOptions): Promise<string> {
  const apiKey = getConfiguredApiKey(options, 'ANTHROPIC_API_KEY');
  const baseUrl = normalizeBaseUrl(options.baseUrl || 'https://api.anthropic.com/v1');
  const response = await fetch(`${baseUrl}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: options.model || getPrimaryModel(),
      max_tokens: options.maxTokens || 512,
      system: options.system,
      messages: options.messages,
    }),
  });

  if (!response.ok) {
    const status = response.status;
    const body = await response.text().catch(() => '');
    console.error(`[Claude] ${status} response (truncated):`, body.slice(0, 200));
    throw new Error(`Claude request failed with status ${status}`);
  }

  const payload = await response.json();
  return payload.content
    ?.filter((block: { type?: string }) => block.type === 'text')
    .map((block: { text?: string }) => block.text || '')
    .join('') || '';
}

async function generateGeminiText(options: GenerateTextOptions): Promise<string> {
  const apiKey = getConfiguredApiKey(options, 'GEMINI_API_KEY');
  const baseUrl = normalizeBaseUrl(
    options.baseUrl || 'https://generativelanguage.googleapis.com/v1beta'
  );
  const model = options.model || 'gemini-2.5-flash';
  const response = await fetch(
    `${baseUrl}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        systemInstruction: options.system
          ? {
              parts: [{ text: options.system }],
            }
          : undefined,
        contents: options.messages.map((message) => ({
          role: message.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: message.content }],
        })),
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: options.maxTokens || 512,
        },
      }),
    }
  );

  if (!response.ok) {
    const status = response.status;
    const body = await response.text().catch(() => '');
    console.error(`[Gemini] ${status} response (truncated):`, body.slice(0, 200));
    throw new Error(`Gemini request failed with status ${status}`);
  }

  const payload = await response.json();
  return payload.candidates?.[0]?.content?.parts
    ?.map((part: { text?: string }) => part.text || '')
    .join('') || '';
}

async function generateCustomText(options: GenerateTextOptions): Promise<string> {
  switch (options.provider) {
    case 'claude':
      return generateClaudeText(options);
    case 'gemini':
      return generateGeminiText(options);
    case 'openai':
      return generateOpenAICompatibleText(options, 'https://api.openai.com/v1');
    case 'kimi':
      return generateOpenAICompatibleText(options, 'https://api.moonshot.cn/v1');
    case 'deepseek':
      return generateOpenAICompatibleText(options, 'https://api.deepseek.com/v1');
    case 'openrouter':
      return generateOpenAICompatibleText(options, 'https://openrouter.ai/api/v1');
    default:
      throw new Error('Unsupported AI provider');
  }
}

export async function generateText(
  options: GenerateTextOptions
): Promise<string> {
  if (hasCustomProviderConfig(options)) {
    const text = await generateCustomText(options);
    await persistUsageIfNeeded(options, text);
    return text;
  }

  const model = options.model || '';
  let primaryError: unknown;

  // Route DeepSeek models to DeepSeek API
  if (model.startsWith('deepseek') && hasDeepSeekConfig()) {
    try {
      const text = await generateDeepSeekText(options);
      await persistUsageIfNeeded(options, text, { provider: 'deepseek' });
      return text;
    } catch (error) {
      primaryError = error;
      console.error('DeepSeek request failed, trying fallback:', error);
    }
  }

  // Route Claude models to Anthropic API
  if (hasAnthropicConfig() && !model.startsWith('deepseek')) {
    try {
      const text = await generateAnthropicText(options);
      await persistUsageIfNeeded(options, text, { provider: 'claude' });
      return text;
    } catch (error) {
      primaryError = error;
      console.error('Anthropic request failed, trying fallback:', error);
    }
  }

  // Fallback: DeepSeek → OpenAI → error
  if (hasDeepSeekConfig() && !model.startsWith('deepseek')) {
    try {
      const text = await generateDeepSeekText({ ...options, model: getFreeModel() });
      await persistUsageIfNeeded(options, text, {
        provider: 'deepseek',
        model: getFreeModel(),
      });
      return text;
    } catch (error) {
      console.error('DeepSeek fallback failed:', error);
    }
  }

  if (hasOpenAIConfig()) {
    const text = await generateOpenAIText(options);
    await persistUsageIfNeeded(options, text, { provider: 'openai' });
    return text;
  }

  throw primaryError instanceof Error
    ? primaryError
    : new Error('No AI provider is configured');
}

/**
 * Extract JSON from AI response text.
 * Tries multiple strategies: direct parse → fenced code block → balanced brace extraction.
 */
function extractJson(text: string): unknown | null {
  // Strategy 1: direct parse (response is pure JSON)
  try {
    return JSON.parse(text.trim());
  } catch {
    // not pure JSON
  }

  // Strategy 2: fenced code block (```json ... ```)
  const fencedMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
  if (fencedMatch) {
    try {
      return JSON.parse(fencedMatch[1].trim());
    } catch {
      // malformed block
    }
  }

  // Strategy 3: balanced brace extraction (find outermost { ... })
  let depth = 0;
  let start = -1;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '{') {
      if (depth === 0) start = i;
      depth++;
    } else if (text[i] === '}') {
      depth--;
      if (depth === 0 && start !== -1) {
        try {
          return JSON.parse(text.slice(start, i + 1));
        } catch {
          // keep looking
          start = -1;
        }
      }
    }
  }

  return null;
}

export async function generateJson<T>(
  options: GenerateTextOptions
): Promise<T | null> {
  const text = await generateText(options);
  const parsed = extractJson(text);
  if (parsed === null) {
    console.warn('[generateJson] Failed to extract JSON from AI response (length=%d)', text.length);
    return null;
  }
  return parsed as T;
}

async function* streamOpenAICompatibleText(
  options: GenerateTextOptions,
  defaultBaseUrl: string
): AsyncGenerator<string> {
  const apiKey = getConfiguredApiKey(options, 'OPENAI_API_KEY');
  const baseUrl = normalizeBaseUrl(options.baseUrl || defaultBaseUrl);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  };

  if (options.provider === 'openrouter') {
    headers['HTTP-Referer'] = 'https://fatemirror.app';
    headers['X-Title'] = 'FateMirror';
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: options.model || getFallbackModel(),
      messages: [
        ...(options.system
          ? [{ role: 'system', content: options.system }]
          : []),
        ...options.messages,
      ],
      max_tokens: options.maxTokens || 1024,
      temperature: 0.2,
      stream: true,
    }),
  });

  if (!response.ok || !response.body) {
    throw new Error(`AI stream error ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data: ') || trimmed === 'data: [DONE]') continue;
      try {
        const json = JSON.parse(trimmed.slice(6));
        const delta = json.choices?.[0]?.delta?.content;
        if (delta) {
          yield delta;
        }
      } catch {
        // Skip malformed SSE lines.
      }
    }
  }
}

async function* streamCustomText(
  options: GenerateTextOptions
): AsyncGenerator<string> {
  switch (options.provider) {
    case 'claude':
    case 'gemini': {
      const text = await generateCustomText(options);
      yield text;
      await persistUsageIfNeeded(options, text, { provider: options.provider });
      return;
    }
    case 'openai':
      yield* streamOpenAICompatibleText(options, 'https://api.openai.com/v1');
      return;
    case 'kimi':
      yield* streamOpenAICompatibleText(options, 'https://api.moonshot.cn/v1');
      return;
    case 'deepseek':
      yield* streamOpenAICompatibleText(options, 'https://api.deepseek.com/v1');
      return;
    case 'openrouter':
      yield* streamOpenAICompatibleText(options, 'https://openrouter.ai/api/v1');
      return;
    default:
      throw new Error('Unsupported AI provider');
  }
}

export async function* streamText(
  options: GenerateTextOptions
): AsyncGenerator<string> {
  if (hasCustomProviderConfig(options)) {
    let assistantText = '';
    for await (const chunk of streamCustomText(options)) {
      assistantText += chunk;
      yield chunk;
    }
    await persistUsageIfNeeded(options, assistantText);
    return;
  }

  const model = options.model || '';

  // DeepSeek streaming via SSE (OpenAI-compatible)
  if (model.startsWith('deepseek') && hasDeepSeekConfig()) {
    try {
      let assistantText = '';
      const response = await fetch(`${getDeepSeekBaseUrl()}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        },
        body: JSON.stringify({
          model: model || getFreeModel(),
          messages: [
            ...(options.system
              ? [{ role: 'system', content: options.system }]
              : []),
            ...options.messages,
          ],
          max_tokens: options.maxTokens || 1024,
          temperature: 0.3,
          stream: true,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`DeepSeek stream error ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ') || trimmed === 'data: [DONE]') continue;
          try {
            const json = JSON.parse(trimmed.slice(6));
            // Surface API-level errors in the stream
            if (json.error) {
              console.error('[DeepSeek stream] API error in chunk:', json.error);
              continue;
            }
            const delta = json.choices?.[0]?.delta?.content;
            if (delta) {
              assistantText += delta;
              yield delta;
            }
          } catch {
            // Skip malformed SSE lines — non-critical for streaming UX
          }
        }
      }

      await persistUsageIfNeeded(options, assistantText, { provider: 'deepseek' });
      return;
    } catch (error) {
      console.error('DeepSeek stream failed, trying fallback:', error);
    }
  }

  // Claude streaming
  if (hasAnthropicConfig() && !model.startsWith('deepseek')) {
    try {
      const anthropic = getAnthropicClient();
      let assistantText = '';
      const stream = anthropic.messages.stream({
        model: options.model || getPrimaryModel(),
        max_tokens: options.maxTokens || 1024,
        system: options.system,
        messages: options.messages,
      });

      for await (const event of stream) {
        if (
          event.type === 'content_block_delta' &&
          event.delta.type === 'text_delta'
        ) {
          assistantText += event.delta.text;
          yield event.delta.text;
        }
      }

      await persistUsageIfNeeded(options, assistantText, { provider: 'claude' });
      return;
    } catch (error) {
      console.error('Anthropic stream failed, trying fallback:', error);
      if (!hasOpenAIConfig() && !hasDeepSeekConfig()) {
        throw error;
      }
    }
  }

  // Final fallback: non-streaming
  const text = await generateDeepSeekText(options).catch(() => generateOpenAIText(options));
  await persistUsageIfNeeded(options, text, {
    provider: model.startsWith('deepseek') || hasDeepSeekConfig() ? 'deepseek' : 'openai',
    model: model || (hasDeepSeekConfig() ? getFreeModel() : getFallbackModel()),
  });
  yield text;
}

/**
 * Estimate token count.
 * English: ~1 token per 4 chars. Chinese: ~1.4 tokens per character (empirical for Claude/GPT).
 * Intentionally over-estimates to stay within budget limits.
 */
export function estimateTokens(text: string): number {
  const cjkChars = (text.match(/[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/g) || []).length;
  const otherChars = text.length - cjkChars;
  return Math.ceil(otherChars / 4 + cjkChars * 1.4);
}

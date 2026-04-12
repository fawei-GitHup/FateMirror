/**
 * Unified API error handling utilities.
 *
 * Provides consistent error response formatting across all route handlers
 * and prevents leaking internal error details to the client.
 */

import { NextResponse } from 'next/server';

/**
 * Standard API error response format.
 */
interface ApiErrorBody {
  error: string;
  code?: string;
}

/**
 * Return a typed JSON error response with consistent format.
 */
export function apiError(
  message: string,
  status: number,
  code?: string
): NextResponse<ApiErrorBody> {
  const body: ApiErrorBody = { error: message };
  if (code) body.code = code;
  return NextResponse.json(body, { status });
}

/** 400 Bad Request */
export function badRequest(message = 'Bad request', code?: string) {
  return apiError(message, 400, code);
}

/** 401 Unauthorized */
export function unauthorized(message = 'Unauthorized') {
  return apiError(message, 401);
}

/** 403 Forbidden */
export function forbidden(message = 'Forbidden') {
  return apiError(message, 403);
}

/** 404 Not Found */
export function notFound(message = 'Not found') {
  return apiError(message, 404);
}

/** 402 Payment Required */
export function paymentRequired(message = 'Upgrade required', code?: string) {
  return apiError(message, 402, code);
}

/** 500 Internal Server Error — logs the real error server-side */
export function serverError(error: unknown, context?: string): NextResponse<ApiErrorBody> {
  const prefix = context ? `[${context}]` : '';
  console.error(`${prefix} Internal error:`, error);
  return apiError('Internal server error', 500);
}

/**
 * Safely extract a human-readable message from an unknown error.
 * Never exposes stack traces or internal details.
 */
export function safeErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Unknown error';
}

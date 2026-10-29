import { getAccessToken } from '../auth/supabase';
import type { ApiErrorBody, FieldError } from '../types/api';
import { env } from '../utils/env';

/**
 * Every failed request becomes an ApiError. `status` is 0 when the API could not
 * be reached (offline, CORS, DNS). Branch on `code`, which the API keeps stable.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;
  readonly requestId?: string;

  constructor(
    status: number,
    code: string,
    message: string,
    details?: unknown,
    requestId?: string,
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.requestId = requestId;
  }

  /** Per-field problems from VALIDATION_FAILED and INVALID_EVENT, if any. */
  get fieldErrors(): FieldError[] {
    if (!Array.isArray(this.details)) return [];
    return this.details.filter(
      (d): d is FieldError =>
        typeof d === 'object' && d !== null && typeof d.field === 'string' && Array.isArray(d.errors),
    );
  }
}

/** Called when a protected request is refused because the session ended or access was revoked. */
type AuthFailureHandler = (error: ApiError) => void;
let onAuthFailure: AuthFailureHandler | null = null;

export function setAuthFailureHandler(handler: AuthFailureHandler | null): void {
  onAuthFailure = handler;
}

/** 403 codes meaning "this account may not use the portal (any more)". */
const ACCESS_REVOKED_CODES = [
  'INSUFFICIENT_ROLE',
  'ACCOUNT_SUSPENDED',
  'ACCOUNT_DEACTIVATED',
  'USER_NOT_PROVISIONED',
];

export function isAuthFailure(error: unknown): error is ApiError {
  return (
    error instanceof ApiError &&
    (error.status === 401 || (error.status === 403 && ACCESS_REVOKED_CODES.includes(error.code)))
  );
}

/** Messages for responses that don't carry a useful one of their own. */
const FALLBACK_MESSAGES: Record<number, string> = {
  400: 'The request was not valid.',
  401: 'Your session has expired. Please sign in again.',
  403: 'You do not have permission to do that.',
  404: 'Not found.',
  409: 'That conflicts with the current state. Reload and try again.',
  422: 'The request could not be processed.',
  429: 'Too many requests. Wait a minute and try again.',
  500: 'The server ran into a problem. Try again shortly.',
};

/** Readable messages for codes whose API message is too terse for the UI. */
const CODE_MESSAGES: Record<string, string> = {
  AUTH_TOKEN_MISSING: 'Please sign in.',
  AUTH_TOKEN_INVALID: 'Your session is no longer valid. Please sign in again.',
  AUTH_TOKEN_EXPIRED: 'Your session has expired. Please sign in again.',
  INSUFFICIENT_ROLE: 'This account does not have admin access.',
  ACCOUNT_SUSPENDED: 'This account is suspended.',
  ACCOUNT_DEACTIVATED: 'This account is deactivated.',
  USER_NOT_PROVISIONED: 'This account has no Kinnoc profile, so it cannot be an administrator.',
  RATE_LIMITED: 'Too many changes in a short time. Wait a minute and try again.',
  INTERNAL_ERROR: 'The server ran into a problem. Try again shortly.',
};

function isErrorBody(value: unknown): value is ApiErrorBody {
  const error = (value as ApiErrorBody | null)?.error;
  return typeof error === 'object' && error !== null && typeof error.code === 'string';
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  /** Undefined values are skipped. */
  query?: Record<string, string | number | boolean | undefined>;
  /** Send the Supabase access token. Defaults to true. */
  auth?: boolean;
  signal?: AbortSignal;
}

/**
 * Calls the Kinnoc API and returns the unwrapped `data`. Throws ApiError on any
 * failure. 204 responses resolve to undefined.
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, query, auth = true, signal } = options;

  const url = new URL(env.apiBaseUrl + path);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== '') url.searchParams.set(key, String(value));
  }

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth) {
    const token = await getAccessToken();
    if (!token) {
      const error = new ApiError(401, 'AUTH_TOKEN_MISSING', CODE_MESSAGES.AUTH_TOKEN_MISSING);
      onAuthFailure?.(error);
      throw error;
    }
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') throw cause;
    throw new ApiError(
      0,
      'NETWORK_ERROR',
      'Could not reach the Kinnoc API. Check your connection. If this keeps happening, the API may be waking up or may not allow requests from this site (CORS).',
    );
  }

  if (response.status === 204) return undefined as T;

  let payload: unknown = null;
  const text = await response.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const error = isErrorBody(payload)
      ? new ApiError(
          response.status,
          payload.error.code,
          CODE_MESSAGES[payload.error.code] ?? payload.error.message,
          payload.error.details,
          payload.error.requestId,
        )
      : new ApiError(
          response.status,
          response.status >= 500 ? 'INTERNAL_ERROR' : 'HTTP_ERROR',
          FALLBACK_MESSAGES[response.status] ??
            (response.status >= 500 ? FALLBACK_MESSAGES[500] : `Request failed (${response.status}).`),
        );
    if (auth && isAuthFailure(error)) onAuthFailure?.(error);
    throw error;
  }

  return (payload as { data: T } | null)?.data as T;
}

/** A readable message for any thrown value. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Something went wrong.';
}

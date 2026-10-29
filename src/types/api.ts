/**
 * Shapes shared by every Kinnoc API route (see kinnoc-api docs/api-contract.md).
 * Success bodies are `{ data }`; errors are `{ error: { code, message, details?, requestId } }`.
 */

export interface ApiSuccess<T> {
  data: T;
}

/** One entry of `details` on VALIDATION_FAILED and INVALID_EVENT errors. */
export interface FieldError {
  field: string;
  errors: string[];
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
    requestId?: string;
  };
}

/** Cursor pages: `nextCursor` is null on the last page. There are no totals. */
export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

// src/utils/error-handler.ts
// Gmail API error handling utilities

// GaxiosError type available if needed for type checking
import type { GaxiosError as _GaxiosError } from 'googleapis-common';

/**
 * Custom error class for Gmail API errors
 */
export class GmailAPIError extends Error {
  public readonly code: number;
  public readonly originalError?: unknown;

  constructor(message: string, code: number, originalError?: unknown) {
    super(message);
    this.name = 'GmailAPIError';
    this.code = code;
    this.originalError = originalError;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Rate limit error for 429 responses
 */
export class GmailRateLimitError extends GmailAPIError {
  public readonly retryAfter?: number;

  constructor(message: string, retryAfter?: number, originalError?: unknown) {
    super(message, 429, originalError);
    this.name = 'GmailRateLimitError';
    // Only set retryAfter if it's actually a number
    if (retryAfter !== undefined) {
      this.retryAfter = retryAfter;
    }
  }
}

/**
 * Authentication error for 401 responses
 */
export class GmailAuthError extends GmailAPIError {
  constructor(message: string, originalError?: unknown) {
    super(message, 401, originalError);
    this.name = 'GmailAuthError';
  }
}

/**
 * Permission error for 403 responses
 */
export class GmailPermissionError extends GmailAPIError {
  constructor(message: string, originalError?: unknown) {
    super(message, 403, originalError);
    this.name = 'GmailPermissionError';
  }
}

/**
 * Not found error for 404 responses
 */
export class GmailNotFoundError extends GmailAPIError {
  constructor(message: string, originalError?: unknown) {
    super(message, 404, originalError);
    this.name = 'GmailNotFoundError';
  }
}

/**
 * Error message mappings for common Gmail API errors
 */
const ERROR_MESSAGES: Record<number, string> = {
  400: 'Invalid request. Please check your parameters.',
  401: 'Authentication required. Please authenticate with Gmail.',
  403: 'Permission denied. Please check your Gmail API permissions and scopes.',
  404: 'Resource not found. The requested message, thread, or label does not exist.',
  429: 'Rate limit exceeded. Please wait before making more requests.',
  500: 'Gmail API server error. Please try again later.',
  503: 'Gmail API service unavailable. Please try again later.',
};

/**
 * Maps Gmail API errors to user-friendly error messages and typed error classes
 * @param error - The error from the Gmail API
 * @returns A typed GmailAPIError with user-friendly message
 */
export function handleGmailError(error: unknown): GmailAPIError {
  // Type guard for objects
  if (typeof error !== 'object' || error === null) {
    return new GmailAPIError(
      `Unexpected error: ${String(error)}`,
      0,
      error
    );
  }

  // Handle GaxiosError from googleapis
  if ('response' in error && typeof error.response === 'object' && error.response !== null) {
    const response = error.response as {
      status?: number;
      data?: { error?: { message?: string } };
      headers?: Record<string, string>;
    };

    const status = response.status || 0;
    const errorData = response.data?.error;

    // Extract error message from response if available
    const errorMessage = 'message' in error && typeof error.message === 'string' ? error.message : '';
    const apiMessage = errorData?.message || errorMessage;
    const userMessage = ERROR_MESSAGES[status] || `Gmail API error: ${apiMessage}`;

    // Create specific error types based on status code
    switch (status) {
      case 401:
        return new GmailAuthError(
          `${userMessage}\n\nPlease ensure you have valid credentials and the user has granted access.`,
          error
        );

      case 403:
        return new GmailPermissionError(
          `${userMessage}\n\nRequired scopes may be missing. Common scopes:\n` +
          `- gmail.readonly: Read email\n` +
          `- gmail.send: Send email\n` +
          `- gmail.modify: Modify labels and mark as read/unread\n` +
          `- gmail.compose: Create drafts`,
          error
        );

      case 404:
        return new GmailNotFoundError(
          `${userMessage}\n\nThe message, thread, or label ID may be invalid or deleted.`,
          error
        );

      case 429:
        // Extract retry-after header if available
        const retryAfter = response.headers?.['retry-after'];
        const retrySeconds = retryAfter ? parseInt(retryAfter, 10) : undefined;

        return new GmailRateLimitError(
          `${userMessage}\n\n` +
          `Gmail API has rate limits:\n` +
          `- 250 quota units per second per user\n` +
          `- 1 billion quota units per day\n` +
          (retrySeconds ? `Please retry after ${retrySeconds} seconds.` : 'Please implement exponential backoff.'),
          retrySeconds,
          error
        );

      case 500:
      case 503:
        return new GmailAPIError(
          `${userMessage}\n\nThis is a temporary issue with Gmail's servers. ` +
          `Please retry with exponential backoff.`,
          status,
          error
        );

      default:
        return new GmailAPIError(
          `${userMessage}\n\nStatus code: ${status}`,
          status,
          error
        );
    }
  }

  // Handle non-HTTP errors (network errors, etc.)
  if ('code' in error) {
    const code = error.code;
    if (code === 'ENOTFOUND' || code === 'ECONNREFUSED') {
      return new GmailAPIError(
        'Network error: Unable to reach Gmail API. Please check your internet connection.',
        0,
        error
      );
    }
  }

  // Generic error handling
  const message = 'message' in error && typeof error.message === 'string'
    ? error.message
    : 'Unknown error occurred';

  return new GmailAPIError(
    `Unexpected error: ${message}`,
    0,
    error
  );
}

/**
 * Wraps an async function with error handling
 * @param fn - The async function to wrap
 * @returns A wrapped function that converts errors to GmailAPIError
 */
export function wrapGmailCall<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>
): (...args: TArgs) => Promise<TReturn> {
  return async (...args: TArgs): Promise<TReturn> => {
    try {
      return await fn(...args);
    } catch (error) {
      throw handleGmailError(error);
    }
  };
}

/**
 * Checks if an error is a rate limit error
 */
export function isRateLimitError(error: unknown): error is GmailRateLimitError {
  if (error instanceof GmailRateLimitError) {
    return true;
  }
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 429;
}

/**
 * Checks if an error is an authentication error
 */
export function isAuthError(error: unknown): error is GmailAuthError {
  if (error instanceof GmailAuthError) {
    return true;
  }
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 401;
}

/**
 * Checks if an error is a permission error
 */
export function isPermissionError(error: unknown): error is GmailPermissionError {
  if (error instanceof GmailPermissionError) {
    return true;
  }
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 403;
}

/**
 * Checks if an error is a not found error
 */
export function isNotFoundError(error: unknown): error is GmailNotFoundError {
  if (error instanceof GmailNotFoundError) {
    return true;
  }
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 404;
}

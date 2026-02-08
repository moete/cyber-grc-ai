/**
 * Type guard utilities for null/undefined checks.
 * Used across both frontend and backend for safe value handling.
 */

export function isNullish<T>(value: T | null | undefined): value is null | undefined {
  return value === null || value === undefined;
}

export function isNotNullish<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

export const SEARCH_TIMEOUT_MS = 8000;

export type SearchErrorKind = 'abort' | 'timeout' | 'http';

function isDomException(error: unknown, name: string): error is DOMException {
  return error instanceof DOMException && error.name === name;
}

export function classifySearchError(error: unknown): SearchErrorKind {
  if (isDomException(error, 'AbortError')) {
    return 'abort';
  }

  if (isDomException(error, 'TimeoutError')) {
    return 'timeout';
  }

  return 'http';
}

export function combineSearchSignals(
  callerSignal: AbortSignal,
  timeoutSignal: AbortSignal,
): AbortSignal {
  return AbortSignal.any([callerSignal, timeoutSignal]);
}

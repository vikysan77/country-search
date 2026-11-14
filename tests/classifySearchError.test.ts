import { afterEach, describe, expect, it, vi } from 'vitest';
import { HttpError } from '../src/httpError.js';
import { searchCountries } from '../src/searchCountries.js';
import {
  SEARCH_TIMEOUT_MS,
  classifySearchError,
  combineSearchSignals,
} from '../src/classifySearchError.js';

function hangingFetch() {
  return vi.fn((_url: string, init: RequestInit) => {
    return new Promise((_resolve, reject) => {
      const signal = init.signal;

      if (!signal) {
        return;
      }

      if (signal.aborted) {
        reject(signal.reason);
        return;
      }

      signal.addEventListener(
        'abort',
        () => {
          reject(signal.reason);
        },
        { once: true },
      );
    });
  });
}

describe('classifySearchError', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('classifies our own cancellation as abort', () => {
    const error = new DOMException('The operation was aborted.', 'AbortError');

    expect(classifySearchError(error)).toBe('abort');
  });

  it('classifies a timeout separately from cancellation', () => {
    const error = new DOMException(
      'The operation was aborted due to timeout',
      'TimeoutError',
    );

    expect(classifySearchError(error)).toBe('timeout');
  });

  it('classifies HttpError as http', () => {
    expect(classifySearchError(new HttpError(500))).toBe('http');
  });

  it('classifies a network failure as http', () => {
    expect(classifySearchError(new TypeError('Failed to fetch'))).toBe('http');
  });

  it('does not treat a plain Error named AbortError as cancellation', () => {
    const error = new Error('The operation was aborted.');
    error.name = 'AbortError';

    expect(classifySearchError(error)).toBe('http');
  });

  it('keeps the caller reason and the timeout reason apart', () => {
    const caller = new AbortController();
    const timeout = new AbortController();
    const signal = combineSearchSignals(caller.signal, timeout.signal);

    caller.abort(new DOMException('The operation was aborted.', 'AbortError'));
    expect(signal.aborted).toBe(true);
    expect(signal.reason).toMatchObject({ name: 'AbortError' });

    const anotherCaller = new AbortController();
    const anotherTimeout = new AbortController();
    const anotherSignal = combineSearchSignals(
      anotherCaller.signal,
      anotherTimeout.signal,
    );

    anotherTimeout.abort(
      new DOMException(
        'The operation was aborted due to timeout',
        'TimeoutError',
      ),
    );
    expect(anotherSignal.reason).toMatchObject({ name: 'TimeoutError' });
  });

  it('resolves 404 to an empty list instead of throwing', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(new Response('Country not found', { status: 404 })),
    );

    await expect(
      searchCountries('atlantis', new AbortController().signal),
    ).resolves.toEqual([]);
  });

  it('rejects with TimeoutError when the timeout signal aborts', async () => {
    const timeout = new AbortController();
    vi.spyOn(AbortSignal, 'timeout').mockReturnValue(timeout.signal);
    vi.stubGlobal('fetch', hangingFetch());

    const pending = searchCountries('spain', new AbortController().signal);

    expect(AbortSignal.timeout).toHaveBeenCalledWith(SEARCH_TIMEOUT_MS);

    timeout.abort(
      new DOMException(
        'The operation was aborted due to timeout',
        'TimeoutError',
      ),
    );

    await expect(pending).rejects.toMatchObject({ name: 'TimeoutError' });
  });
});

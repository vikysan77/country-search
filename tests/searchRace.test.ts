import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CountryView } from '../src/mapCountryResponse.js';
import { createSearchSession } from '../src/searchSession.js';

type SearchSession = {
  setQuery: (query: string) => void;
  getState: () => {
    query: string;
    countries: CountryView[];
    errorKind: 'timeout' | 'http' | null;
  };
};

type PendingRequest = {
  url: string;
  signal: AbortSignal;
  resolve: (response: Response) => void;
};

const pending: PendingRequest[] = [];

function countryResponse(name: string): Response {
  return new Response(JSON.stringify([{ name }]), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('search race', () => {
  beforeEach(() => {
    pending.length = 0;
    vi.useFakeTimers();
    const timeout = new AbortController();
    vi.spyOn(AbortSignal, 'timeout').mockReturnValue(timeout.signal);
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string, init?: RequestInit) => {
        const signal = init?.signal;

        return new Promise<Response>((resolve, reject) => {
          if (!signal) {
            return;
          }

          const fail = () => {
            reject(signal.reason);
          };

          if (signal.aborted) {
            fail();
            return;
          }

          signal.addEventListener('abort', fail, { once: true });
          pending.push({ url, signal, resolve });
        });
      }),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('keeps only the latest query when the earlier response arrives last', async () => {
    const session = createSearchSession({
      debounceMs: 300,
    }) as SearchSession;

    session.setQuery('sp');
    await vi.advanceTimersByTimeAsync(300);

    expect(pending).toHaveLength(1);
    expect(pending[0]?.url).toBe('https://countries.dev/name/sp');

    session.setQuery('spain');

    expect(pending[0]?.signal.aborted).toBe(true);
    expect(pending[0]?.signal.reason).toMatchObject({ name: 'AbortError' });

    await vi.advanceTimersByTimeAsync(300);

    expect(pending).toHaveLength(2);
    expect(pending[1]?.url).toBe('https://countries.dev/name/spain');

    pending[1]?.resolve(countryResponse('Spain'));
    await vi.waitFor(() => {
      expect(
        session.getState().countries.map((country) => country.name),
      ).toEqual(['Spain']);
    });

    pending[0]?.resolve(countryResponse('Sampleland'));
    await vi.advanceTimersByTimeAsync(0);

    expect(session.getState().query).toBe('spain');
    expect(session.getState().countries.map((country) => country.name)).toEqual(
      ['Spain'],
    );
    expect(session.getState().errorKind).toBeNull();
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import { HttpError } from '../src/httpError.js';
import { searchCountries } from '../src/searchCountries.js';

const spain = {
  name: 'Spain',
  capital: 'Madrid',
  region: 'Europe',
  population: 47351567,
  area: 505992,
  borders: ['AND', 'FRA', 'GIB', 'PRT', 'MAR'],
  flags: { svg: 'https://flagcdn.com/es.svg' },
  languages: [{ name: 'Spanish' }],
  currencies: [{ name: 'Euro', symbol: '€' }],
};

const spainView = {
  name: 'Spain',
  flagUrl: 'https://flagcdn.com/es.svg',
  capital: 'Madrid',
  region: 'Europe',
  population: 47351567,
  languages: ['Spanish'],
  area: 505992,
  borders: ['AND', 'FRA', 'GIB', 'PRT', 'MAR'],
  currencies: ['Euro (€)'],
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('searchCountries', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('does not request anything for a blank query', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      searchCountries('   ', new AbortController().signal),
    ).resolves.toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('requests the encoded name and maps every country', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([spain]));
    vi.stubGlobal('fetch', fetchMock);
    const controller = new AbortController();

    await expect(
      searchCountries('South Africa', controller.signal),
    ).resolves.toEqual([spainView]);

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://countries.dev/name/South%20Africa');
    expect(options.signal).toBeInstanceOf(AbortSignal);

    controller.abort();
    expect(options.signal?.aborted).toBe(true);
  });

  it('returns an empty list when the API responds with 404', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(new Response('Country not found', { status: 404 })),
    );

    await expect(
      searchCountries('nowhere', new AbortController().signal),
    ).resolves.toEqual([]);
  });

  it('throws HttpError with the status for other failed responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('Server error', { status: 500 })),
    );

    const result = searchCountries('spain', new AbortController().signal);

    await expect(result).rejects.toBeInstanceOf(HttpError);
    await expect(result).rejects.toMatchObject({ status: 500 });
  });

  it('lets a network failure reject the promise', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
    );

    await expect(
      searchCountries('spain', new AbortController().signal),
    ).rejects.toBeInstanceOf(TypeError);
  });
});

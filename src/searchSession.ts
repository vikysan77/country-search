import { classifySearchError } from './classifySearchError.js';
import { debounce } from './debounce.js';
import type { CountryView } from './mapCountryResponse.js';
import { searchCountries } from './searchCountries.js';

export type SearchStatus = 'idle' | 'loading' | 'results' | 'empty' | 'error';

export type SearchState = {
  query: string;
  status: SearchStatus;
  countries: CountryView[];
  errorKind: 'timeout' | 'http' | null;
};

type SearchSessionOptions = {
  debounceMs?: number;
};

export function createSearchSession(options: SearchSessionOptions = {}) {
  const debounceMs = options.debounceMs ?? 300;

  let state: SearchState = {
    query: '',
    status: 'idle',
    countries: [],
    errorKind: null,
  };

  let controller: AbortController | undefined;
  let generation = 0;

  const runSearch = debounce((query: string) => {
    if (query !== state.query) {
      return;
    }

    const current = new AbortController();
    controller = current;
    const requestGeneration = ++generation;

    void searchCountries(query, current.signal).then(
      (countries) => {
        if (requestGeneration !== generation) {
          return;
        }

        state = {
          query,
          status: countries.length === 0 ? 'empty' : 'results',
          countries,
          errorKind: null,
        };
      },
      (error: unknown) => {
        const kind = classifySearchError(error);

        if (kind === 'abort' || requestGeneration !== generation) {
          return;
        }

        state = {
          query,
          status: 'error',
          countries: [],
          errorKind: kind,
        };
      },
    );
  }, debounceMs);

  return {
    getState(): SearchState {
      return state;
    },

    setQuery(query: string): void {
      controller?.abort();
      controller = undefined;
      generation += 1;

      if (query.trim() === '') {
        state = {
          query,
          status: 'idle',
          countries: [],
          errorKind: null,
        };
        return;
      }

      state = {
        query,
        status: 'loading',
        countries: [],
        errorKind: null,
      };

      runSearch(query);
    },
  };
}

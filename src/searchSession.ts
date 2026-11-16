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
  const listeners = new Set<() => void>();

  let state: SearchState = {
    query: '',
    status: 'idle',
    countries: [],
    errorKind: null,
  };

  let controller: AbortController | undefined;
  let generation = 0;

  function update(next: SearchState): void {
    state = next;
    for (const listener of listeners) {
      listener();
    }
  }

  function startSearch(query: string): void {
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
        update({
          query,
          status: countries.length === 0 ? 'empty' : 'results',
          countries,
          errorKind: null,
        });
      },
      (error: unknown) => {
        const kind = classifySearchError(error);
        if (kind === 'abort' || requestGeneration !== generation) {
          return;
        }
        update({
          query,
          status: 'error',
          countries: [],
          errorKind: kind,
        });
      },
    );
  }

  const runSearch = debounce(startSearch, debounceMs);

  function setQuery(query: string): void {
    controller?.abort();
    controller = undefined;
    generation += 1;
    if (query.trim() === '') {
      update({
        query,
        status: 'idle',
        countries: [],
        errorKind: null,
      });
      return;
    }
    update({
      query,
      status: 'loading',
      countries: [],
      errorKind: null,
    });
    runSearch(query);
  }

  return {
    getState(): SearchState {
      return state;
    },

    setQuery,

    retry(): void {
      const query = state.query.trim();
      if (query === '') {
        return;
      }
      controller?.abort();
      controller = undefined;
      generation += 1;
      update({
        query: state.query,
        status: 'loading',
        countries: [],
        errorKind: null,
      });
      startSearch(state.query);
    },
    subscribe(listener: () => void): void {
      listeners.add(listener);
    },
  };
}

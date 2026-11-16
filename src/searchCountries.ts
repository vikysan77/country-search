import {
  SEARCH_TIMEOUT_MS,
  combineSearchSignals,
} from './classifySearchError.js';
import { HttpError } from './httpError.js';
import {
  mapCountryResponse,
  type CountryView,
  type RawCountry,
} from './mapCountryResponse.js';

export async function searchCountries(
  query: string,
  signal: AbortSignal,
): Promise<CountryView[]> {
  const trimmed = query.trim();

  if (trimmed === '') {
    return [];
  }

  const response = await fetch(
    `https://countries.dev/name/${encodeURIComponent(trimmed)}`,
    {
      signal: combineSearchSignals(
        signal,
        AbortSignal.timeout(SEARCH_TIMEOUT_MS),
      ),
    },
  );

  if (response.status === 404) {
    return [];
  }

  if (!response.ok) {
    throw new HttpError(response.status);
  }

  const countries = (await response.json()) as RawCountry[];
  return countries.map(mapCountryResponse);
}

type RawLanguage = {
  name: string;
};

type RawCurrency = {
  name: string;
  symbol?: string;
};

export type RawCountry = {
  name: string;
  capital?: string;
  region?: string;
  population?: number;
  area?: number;
  borders?: string[];
  flags?: {
    svg?: string;
  };
  languages?: RawLanguage[];
  currencies?: RawCurrency[];
};

export type CountryView = {
  name: string;
  flagUrl: string;
  capital: string;
  region: string;
  population: number;
  languages: string[];
  area: number | null;
  borders: string[];
  currencies: string[];
};

function formatCurrency(currency: RawCurrency): string {
  if (currency.symbol) {
    return `${currency.name} (${currency.symbol})`;
  }
  return currency.name;
}

export function mapCountryResponse(raw: RawCountry): CountryView {
  const languages = raw.languages ?? [];
  const currencies = raw.currencies ?? [];
  const borders = raw.borders ?? [];
  return {
    name: raw.name,
    flagUrl: raw.flags?.svg ?? '',
    capital: raw.capital ?? '',
    region: raw.region ?? '',
    population: raw.population ?? 0,
    languages: languages.map((language) => language.name),
    area: raw.area ?? null,
    borders: [...borders],
    currencies: currencies.map(formatCurrency),
  };
}

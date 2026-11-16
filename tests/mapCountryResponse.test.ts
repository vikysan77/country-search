import { describe, expect, it } from 'vitest';
import { mapCountryResponse } from '../src/mapCountryResponse.js';

describe('mapCountryResponse', () => {
  it('maps one country into card and detail fields', () => {
    const country = mapCountryResponse({
      name: 'Spain',
      capital: 'Madrid',
      region: 'Europe',
      population: 47351567,
      area: 505992,
      borders: ['AND', 'FRA', 'GIB', 'PRT', 'MAR'],
      flag: '🇪🇸',
      flags: {
        png: 'https://flagcdn.com/w320/es.png',
        svg: 'https://flagcdn.com/es.svg',
      },
      languages: [{ iso639_1: 'es', name: 'Spanish', nativeName: 'Español' }],
      currencies: [{ code: 'EUR', name: 'Euro', symbol: '€' }],
    });

    expect(country).toEqual({
      name: 'Spain',
      flagUrl: 'https://flagcdn.com/es.svg',
      capital: 'Madrid',
      region: 'Europe',
      population: 47351567,
      languages: ['Spanish'],
      area: 505992,
      borders: ['AND', 'FRA', 'GIB', 'PRT', 'MAR'],
      currencies: ['Euro (€)'],
    });
  });

  it('keeps language names in the API order', () => {
    const country = mapCountryResponse({
      name: 'Belgium',
      flags: { svg: 'https://flagcdn.com/be.svg' },
      languages: [{ name: 'Dutch' }, { name: 'French' }, { name: 'German' }],
    });

    expect(country.languages).toEqual(['Dutch', 'French', 'German']);
  });

  it('uses empty values when optional fields are missing', () => {
    const country = mapCountryResponse({
      name: 'Antarctica',
    });

    expect(country).toEqual({
      name: 'Antarctica',
      flagUrl: '',
      capital: '',
      region: '',
      population: 0,
      languages: [],
      area: null,
      borders: [],
      currencies: [],
    });
  });
});

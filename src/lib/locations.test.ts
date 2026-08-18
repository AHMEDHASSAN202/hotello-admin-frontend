import { describe, expect, it } from 'vitest';
import {
  citiesFor,
  COUNTRIES,
  findCountry,
  locationLabel,
  matchCity,
  matchCountry,
} from './locations';

describe('locations catalog', () => {
  it('covers exactly the supported countries', () => {
    expect(COUNTRIES.map((c) => c.nameEn)).toEqual(['Egypt', 'Saudi Arabia']);
  });

  it('every country and city has both language names', () => {
    for (const country of COUNTRIES) {
      expect(country.nameEn).not.toBe('');
      expect(country.nameAr).not.toBe('');
      expect(country.timezone).not.toBe('');
      expect(country.currency).not.toBe('');
      expect(country.cities.length).toBeGreaterThan(0);
      for (const city of country.cities) {
        expect(city.nameEn).not.toBe('');
        expect(city.nameAr).not.toBe('');
      }
    }
  });

  it('city English names are unique within each country', () => {
    for (const country of COUNTRIES) {
      const names = country.cities.map((c) => c.nameEn);
      expect(new Set(names).size).toBe(names.length);
    }
  });

  it('citiesFor returns the country cities and [] for unknown values', () => {
    expect(citiesFor('Egypt').some((c) => c.nameEn === 'Cairo')).toBe(true);
    expect(citiesFor('Saudi Arabia').some((c) => c.nameEn === 'Riyadh')).toBe(
      true,
    );
    expect(citiesFor('France')).toEqual([]);
    expect(citiesFor('')).toEqual([]);
  });

  it('findCountry matches canonical English names only', () => {
    expect(findCountry('Egypt')?.currency).toBe('EGP');
    expect(findCountry('Saudi Arabia')?.timezone).toBe('Asia/Riyadh');
    expect(findCountry('egypt')).toBeUndefined();
  });

  it('locationLabel picks the name for the locale', () => {
    const egypt = findCountry('Egypt')!;
    expect(locationLabel(egypt, 'ar')).toBe('مصر');
    expect(locationLabel(egypt, 'en')).toBe('Egypt');
  });

  it('matchCountry accepts either language, case-insensitively', () => {
    expect(matchCountry('egypt')?.nameEn).toBe('Egypt');
    expect(matchCountry('مصر')?.nameEn).toBe('Egypt');
    expect(matchCountry('المملكة العربية السعودية')?.nameEn).toBe(
      'Saudi Arabia',
    );
    expect(matchCountry('France')).toBeUndefined();
    expect(matchCountry('')).toBeUndefined();
  });

  it('matchCity handles Google address components in both languages', () => {
    const egypt = findCountry('Egypt')!;
    const saudi = findCountry('Saudi Arabia')!;
    expect(matchCity(egypt, 'Cairo')?.nameEn).toBe('Cairo');
    expect(matchCity(egypt, 'Cairo Governorate')?.nameEn).toBe('Cairo');
    expect(matchCity(egypt, 'محافظة القاهرة')?.nameEn).toBe('Cairo');
    expect(matchCity(saudi, 'Riyadh')?.nameEn).toBe('Riyadh');
    expect(matchCity(egypt, 'Paris')).toBeUndefined();
    expect(matchCity(egypt, '')).toBeUndefined();
  });
});

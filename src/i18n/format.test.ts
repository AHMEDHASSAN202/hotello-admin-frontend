import { describe, expect, it } from 'vitest';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber,
  formatRelativeTime,
} from './format';

/** Eastern Arabic numerals must never appear (AC 7.5-1: Latin digits only). */
const EASTERN_ARABIC_DIGITS = /[٠-٩]/;

describe('formatNumber (Story 7.5)', () => {
  it('uses Latin digits and locale grouping in English', () => {
    expect(formatNumber(1500, 'en')).toBe('1,500');
  });

  it('uses Latin digits in Arabic — no Eastern Arabic numerals (AC 7.5-1)', () => {
    const out = formatNumber(1500, 'ar');
    expect(out).not.toMatch(EASTERN_ARABIC_DIGITS);
    expect(out).toMatch(/1.?500/); // grouped, Latin digits
  });

  it('groups large numbers in both locales', () => {
    expect(formatNumber(1234567, 'en')).toBe('1,234,567');
    expect(formatNumber(1234567, 'ar')).not.toMatch(EASTERN_ARABIC_DIGITS);
  });
});

describe('formatCurrency (AC 7.5-3)', () => {
  it('places the EGP code correctly in English', () => {
    const out = formatCurrency(1500, 'en');
    expect(out).toContain('EGP');
    expect(out).toContain('1,500');
  });

  it('renders the Arabic currency symbol with Latin digits', () => {
    const out = formatCurrency(1500, 'ar');
    expect(out).not.toMatch(EASTERN_ARABIC_DIGITS);
    expect(out).toMatch(/ج\.?م/); // ج.م — Egyptian pound symbol
  });
});

describe('formatDate (AC 7.5-2)', () => {
  const march15 = '2026-03-15T10:30:00.000Z';

  it('formats an English date with Latin digits', () => {
    const out = formatDate(march15, 'en');
    expect(out).toMatch(/Mar/);
    expect(out).toContain('2026');
  });

  it('uses Arabic month names but keeps Latin digits (AC 7.5-2)', () => {
    const out = formatDate(march15, 'ar');
    expect(out).not.toMatch(EASTERN_ARABIC_DIGITS);
    expect(out).toContain('2026');
    expect(out).toContain('مارس'); // "March" localized to Arabic
  });

  it('formats date-times without Eastern Arabic numerals', () => {
    expect(formatDateTime(march15, 'ar')).not.toMatch(EASTERN_ARABIC_DIGITS);
  });
});

describe('formatRelativeTime (AC 7.5-4)', () => {
  const now = new Date('2026-07-29T12:00:00.000Z');
  const threeDaysAgo = new Date('2026-07-26T12:00:00.000Z');

  it('localizes "3 days ago" in English', () => {
    expect(formatRelativeTime(threeDaysAgo, 'en', now)).toBe('3 days ago');
  });

  it('localizes relative time in Arabic with Latin digits', () => {
    const out = formatRelativeTime(threeDaysAgo, 'ar', now);
    expect(out).not.toMatch(EASTERN_ARABIC_DIGITS);
    expect(out).toContain('3');
    expect(out).toContain('أيام'); // "days"
  });

  it('handles future times', () => {
    const inTwoHours = new Date('2026-07-29T14:00:00.000Z');
    expect(formatRelativeTime(inTwoHours, 'en', now)).toBe('in 2 hours');
  });
});

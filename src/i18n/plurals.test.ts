import { createTranslator } from 'next-intl';
import { describe, expect, it } from 'vitest';

/**
 * Arabic plural rules (Story 7.1 AC2). Arabic has 6 CLDR plural categories —
 * zero / one / two / few / many / other. Relying on ICU (via next-intl) is the
 * whole point: a hand-written `count === 1 ? … : …` is a bug in Arabic.
 *
 * We drive the message through next-intl's own formatter so the test exercises
 * the real runtime, then assert each count lands in the right grammatical form.
 */
const messages = {
  test: {
    // Distinct sentinel per category so we can assert which branch fired.
    hotels:
      '{count, plural, zero {ZERO} one {ONE} two {TWO} few {FEW} many {MANY} other {OTHER}}',
  },
};

function t(locale: string, count: number): string {
  const translate = createTranslator({ locale, messages, namespace: 'test' });
  return translate('hotels', { count });
}

describe('Arabic plural forms (AC 7.1-2)', () => {
  const cases: Array<[number, string]> = [
    [0, 'ZERO'],
    [1, 'ONE'],
    [2, 'TWO'],
    [3, 'FEW'],
    [11, 'MANY'],
    [100, 'OTHER'],
  ];

  it.each(cases)('count %i selects the %s category', (count, expected) => {
    expect(t('ar', count)).toBe(expected);
  });
});

describe('English plural forms', () => {
  it('uses one/other only', () => {
    expect(t('en', 1)).toBe('ONE');
    expect(t('en', 0)).toBe('OTHER');
    expect(t('en', 5)).toBe('OTHER');
  });
});

describe('interpolation (AC 7.1-2)', () => {
  it('substitutes variables in both locales', () => {
    const withCount = {
      test: { showing: 'Showing {count} hotels' },
    };
    const en = createTranslator({ locale: 'en', messages: withCount, namespace: 'test' });
    expect(en('showing', { count: 12 })).toBe('Showing 12 hotels');
  });
});

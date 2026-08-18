import { describe, expect, it } from 'vitest';
import { defaultLogoDataUrl, defaultLogoSvg, initialsFor } from './default-logo';

describe('default logo generator', () => {
  it('takes the first letters of the first two words', () => {
    expect(initialsFor('Sunrise Hotel')).toBe('SH');
    expect(initialsFor('Sunrise Beach Resort')).toBe('SB');
  });

  it('uses the first two characters of a single-word name', () => {
    expect(initialsFor('Azure')).toBe('AZ');
  });

  it('ignores extra whitespace and symbols', () => {
    expect(initialsFor('  the   ★ grand  ')).toBe('TG');
    expect(initialsFor('')).toBe('');
    expect(initialsFor('  ★ ★  ')).toBe('');
  });

  it('renders the brand colors and the initials into the SVG', () => {
    const svg = defaultLogoSvg('Sunrise Hotel');
    expect(svg).toContain('#0E2A47');
    expect(svg).toContain('#C8A24A');
    expect(svg).toContain('>SH</text>');
  });

  it('produces an inline SVG data URL', () => {
    expect(defaultLogoDataUrl('Sunrise Hotel')).toMatch(
      /^data:image\/svg\+xml;utf8,/,
    );
  });
});

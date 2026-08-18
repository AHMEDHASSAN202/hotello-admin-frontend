/**
 * Auto-generated fallback logo: brand-navy tile with gold initials taken from
 * the hotel's English name. Used by the onboarding wizard when the admin does
 * not upload a logo — the SVG goes through the normal logo-upload endpoint so
 * every surface keeps treating `logo` as an ordinary stored file.
 */

const NAVY = '#0E2A47';
const GOLD = '#C8A24A';

/** "Sunrise Beach Resort" → "SB"; "Azure" → "AZ"; symbols are ignored. */
export function initialsFor(nameEn: string): string {
  const words = nameEn
    .split(/\s+/)
    .map((w) => w.replace(/[^A-Za-z0-9]/g, ''))
    .filter(Boolean);
  if (words.length === 0) return '';
  const initials =
    words.length === 1 ? words[0].slice(0, 2) : words[0][0] + words[1][0];
  return initials.toUpperCase();
}

export function defaultLogoSvg(nameEn: string): string {
  const initials = initialsFor(nameEn);
  // Letters/digits only after initialsFor, but escape defensively anyway.
  const safe = initials
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">` +
    `<rect width="256" height="256" rx="48" fill="${NAVY}"/>` +
    `<text x="128" y="140" text-anchor="middle" dominant-baseline="middle" ` +
    `font-family="Sora, 'IBM Plex Sans', sans-serif" font-size="96" font-weight="600" ` +
    `letter-spacing="2" fill="${GOLD}">${safe}</text>` +
    `</svg>`
  );
}

export function defaultLogoFile(nameEn: string): File {
  return new File([defaultLogoSvg(nameEn)], 'logo.svg', {
    type: 'image/svg+xml',
  });
}

/** Inline preview source for the wizard's logo section. */
export function defaultLogoDataUrl(nameEn: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(defaultLogoSvg(nameEn))}`;
}

import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';
import { defaultLocale, isLocale, LOCALE_COOKIE, type Locale } from './config';
import { loadMessages } from './messages';

/**
 * Locale strategy is cookie/profile-based — no locale URL prefix (Epic 07,
 * note 1), so routes are untouched. The layout re-reads this on every
 * `router.refresh()`, which is how switching applies instantly without a
 * full navigation.
 */
export default getRequestConfig(async () => {
  const cookieLocale = cookies().get(LOCALE_COOKIE)?.value;
  const locale: Locale = isLocale(cookieLocale) ? cookieLocale : defaultLocale;

  return {
    locale,
    messages: loadMessages(locale),
    // AC 7.5-2: consistent timezone handling — Africa/Cairo platform default.
    timeZone: 'Africa/Cairo',
  };
});

/**
 * Static catalog of supported countries and their cities.
 *
 * The platform currently operates in Egypt and Saudi Arabia only, so this is
 * code-versioned reference data (same rationale as the permission catalog) —
 * promote to a DB table only if cities ever need runtime management. Stored
 * values are the canonical English names, which keeps existing hotel rows and
 * every surface that displays `hotel.city` / `hotel.country` compatible.
 */

export interface CityOption {
  nameEn: string;
  nameAr: string;
}

export interface CountryOption {
  nameEn: string;
  nameAr: string;
  /** Sensible defaults applied when the country is picked in the wizard. */
  timezone: string;
  currency: string;
  cities: CityOption[];
}

export const COUNTRIES: CountryOption[] = [
  {
    nameEn: 'Egypt',
    nameAr: 'مصر',
    timezone: 'Africa/Cairo',
    currency: 'EGP',
    cities: [
      { nameEn: 'Cairo', nameAr: 'القاهرة' },
      { nameEn: 'Giza', nameAr: 'الجيزة' },
      { nameEn: 'Alexandria', nameAr: 'الإسكندرية' },
      { nameEn: 'Sharm El Sheikh', nameAr: 'شرم الشيخ' },
      { nameEn: 'Hurghada', nameAr: 'الغردقة' },
      { nameEn: 'Luxor', nameAr: 'الأقصر' },
      { nameEn: 'Aswan', nameAr: 'أسوان' },
      { nameEn: 'Marsa Alam', nameAr: 'مرسى علم' },
      { nameEn: 'El Gouna', nameAr: 'الجونة' },
      { nameEn: 'Dahab', nameAr: 'دهب' },
      { nameEn: 'Nuweiba', nameAr: 'نويبع' },
      { nameEn: 'Taba', nameAr: 'طابا' },
      { nameEn: 'Safaga', nameAr: 'سفاجا' },
      { nameEn: 'Ain Sokhna', nameAr: 'العين السخنة' },
      { nameEn: 'Marsa Matruh', nameAr: 'مرسى مطروح' },
      { nameEn: 'Siwa', nameAr: 'سيوة' },
      { nameEn: 'Port Said', nameAr: 'بورسعيد' },
      { nameEn: 'Suez', nameAr: 'السويس' },
      { nameEn: 'Ismailia', nameAr: 'الإسماعيلية' },
      { nameEn: 'Damietta', nameAr: 'دمياط' },
      { nameEn: 'Mansoura', nameAr: 'المنصورة' },
      { nameEn: 'Tanta', nameAr: 'طنطا' },
      { nameEn: 'Zagazig', nameAr: 'الزقازيق' },
      { nameEn: 'Banha', nameAr: 'بنها' },
      { nameEn: 'Shibin El Kom', nameAr: 'شبين الكوم' },
      { nameEn: 'Kafr El Sheikh', nameAr: 'كفر الشيخ' },
      { nameEn: 'Damanhur', nameAr: 'دمنهور' },
      { nameEn: 'Faiyum', nameAr: 'الفيوم' },
      { nameEn: 'Beni Suef', nameAr: 'بني سويف' },
      { nameEn: 'Minya', nameAr: 'المنيا' },
      { nameEn: 'Asyut', nameAr: 'أسيوط' },
      { nameEn: 'Sohag', nameAr: 'سوهاج' },
      { nameEn: 'Qena', nameAr: 'قنا' },
      { nameEn: 'El Arish', nameAr: 'العريش' },
      { nameEn: 'El Kharga', nameAr: 'الخارجة' },
    ],
  },
  {
    nameEn: 'Saudi Arabia',
    nameAr: 'المملكة العربية السعودية',
    timezone: 'Asia/Riyadh',
    currency: 'SAR',
    cities: [
      { nameEn: 'Riyadh', nameAr: 'الرياض' },
      { nameEn: 'Jeddah', nameAr: 'جدة' },
      { nameEn: 'Mecca', nameAr: 'مكة المكرمة' },
      { nameEn: 'Medina', nameAr: 'المدينة المنورة' },
      { nameEn: 'Dammam', nameAr: 'الدمام' },
      { nameEn: 'Khobar', nameAr: 'الخبر' },
      { nameEn: 'Dhahran', nameAr: 'الظهران' },
      { nameEn: 'Taif', nameAr: 'الطائف' },
      { nameEn: 'AlUla', nameAr: 'العلا' },
      { nameEn: 'Tabuk', nameAr: 'تبوك' },
      { nameEn: 'Buraidah', nameAr: 'بريدة' },
      { nameEn: 'Unaizah', nameAr: 'عنيزة' },
      { nameEn: 'Hail', nameAr: 'حائل' },
      { nameEn: 'Abha', nameAr: 'أبها' },
      { nameEn: 'Khamis Mushait', nameAr: 'خميس مشيط' },
      { nameEn: 'Najran', nameAr: 'نجران' },
      { nameEn: 'Jazan', nameAr: 'جازان' },
      { nameEn: 'Al Bahah', nameAr: 'الباحة' },
      { nameEn: 'Sakaka', nameAr: 'سكاكا' },
      { nameEn: 'Arar', nameAr: 'عرعر' },
      { nameEn: 'Yanbu', nameAr: 'ينبع' },
      { nameEn: 'Jubail', nameAr: 'الجبيل' },
      { nameEn: 'Al Ahsa', nameAr: 'الأحساء' },
      { nameEn: 'Qatif', nameAr: 'القطيف' },
      { nameEn: 'Hafr Al Batin', nameAr: 'حفر الباطن' },
      { nameEn: 'Al Kharj', nameAr: 'الخرج' },
    ],
  },
];

export function findCountry(nameEn: string): CountryOption | undefined {
  return COUNTRIES.find((c) => c.nameEn === nameEn);
}

export function citiesFor(countryNameEn: string): CityOption[] {
  return findCountry(countryNameEn)?.cities ?? [];
}

/** Localized display label; values sent to the API stay `nameEn`. */
export function locationLabel(
  option: { nameEn: string; nameAr: string },
  locale: string,
): string {
  return locale === 'ar' ? option.nameAr : option.nameEn;
}

/* ------------------------------------------------- Google Places matching */

/**
 * Maps a Google address component (either language — the Maps script loads in
 * the UI locale, so components arrive in Arabic under AR) onto a catalog
 * country.
 */
export function matchCountry(text: string): CountryOption | undefined {
  const q = text.trim();
  if (!q) return undefined;
  return COUNTRIES.find(
    (c) => c.nameEn.toLowerCase() === q.toLowerCase() || c.nameAr === q,
  );
}

/**
 * Maps a locality / admin-area component onto a catalog city. Containment is
 * checked both ways so "Cairo Governorate" and "محافظة القاهرة" match "Cairo".
 */
export function matchCity(
  country: CountryOption,
  text: string,
): CityOption | undefined {
  const q = text.trim().toLowerCase();
  if (!q) return undefined;
  return country.cities.find((c) => {
    const en = c.nameEn.toLowerCase();
    return en === q || c.nameAr === text.trim() || q.includes(en) || text.includes(c.nameAr);
  });
}

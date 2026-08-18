'use client';

import { useEffect, useRef, useState } from 'react';
import { matchCity, matchCountry } from '@/lib/locations';

/**
 * Google Places search box (the new `PlaceAutocompleteElement` web component —
 * the legacy `Autocomplete` widget is closed to new API keys). Renders above a
 * regular address field: picking a suggestion reports the formatted address
 * plus the catalog-canonical country/city derived from the address components.
 *
 * Entirely optional — without `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (or if the
 * script fails to load) the component renders nothing and manual entry stays
 * the only path.
 */

export interface PlaceSelection {
  address: string;
  latitude: number | null;
  longitude: number | null;
  /** Canonical catalog `nameEn` values, when the place maps onto the catalog. */
  country?: string;
  city?: string;
}

/** Search is limited to the countries the platform operates in. */
const REGION_CODES = ['eg', 'sa'];

declare global {
  interface Window {
    google?: {
      maps: { importLibrary: (name: string) => Promise<Record<string, unknown>> };
    };
    __gxpMapsReady?: () => void;
  }
}

interface AddressComponent {
  types: string[];
  longText?: string;
}

let mapsLoader: Promise<boolean> | null = null;

function loadMapsScript(locale: string): Promise<boolean> {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (typeof window === 'undefined' || !key) return Promise.resolve(false);
  if (!mapsLoader) {
    mapsLoader = new Promise((resolve) => {
      window.__gxpMapsReady = () => resolve(true);
      const script = document.createElement('script');
      script.src =
        `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}` +
        `&v=weekly&loading=async&language=${encodeURIComponent(locale)}` +
        `&callback=__gxpMapsReady`;
      script.onerror = () => resolve(false);
      document.head.appendChild(script);
    });
  }
  return mapsLoader;
}

export function AddressAutocomplete({
  label,
  hint,
  locale,
  onPlace,
}: {
  label: string;
  hint?: string;
  locale: string;
  onPlace: (selection: PlaceSelection) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  // The callback changes every render; keep the element's listener stable.
  const onPlaceRef = useRef(onPlace);
  onPlaceRef.current = onPlace;

  useEffect(() => {
    let cancelled = false;
    let element: HTMLElement | null = null;

    (async () => {
      const loaded = await loadMapsScript(locale);
      if (!loaded || cancelled || !window.google) return;
      const { PlaceAutocompleteElement } =
        await window.google.maps.importLibrary('places');
      if (cancelled || !containerRef.current) return;

      element = new (PlaceAutocompleteElement as new (options: {
        includedRegionCodes: string[];
      }) => HTMLElement)({ includedRegionCodes: REGION_CODES });
      element.addEventListener('gmp-select', async (event) => {
        try {
          const prediction = (
            event as unknown as {
              placePrediction: {
                toPlace: () => {
                  fetchFields: (o: { fields: string[] }) => Promise<void>;
                  formattedAddress?: string;
                  addressComponents?: AddressComponent[];
                  location?: { lat: unknown; lng: unknown } | null;
                };
              };
            }
          ).placePrediction;
          const place = prediction.toPlace();
          await place.fetchFields({
            fields: ['formattedAddress', 'addressComponents', 'location'],
          });

          const components = place.addressComponents ?? [];
          const component = (type: string) =>
            components.find((c) => c.types.includes(type))?.longText ?? '';
          const country = matchCountry(component('country'));
          const city = country
            ? (matchCity(country, component('locality')) ??
              matchCity(country, component('administrative_area_level_1')))
            : undefined;

          // `location` is a LatLng (lat/lng are methods) in the JS SDK but a
          // plain {lat, lng} object after toJSON — accept both.
          const coord = (v: unknown): number | null =>
            typeof v === 'function'
              ? (v as () => number).call(place.location)
              : typeof v === 'number'
                ? v
                : null;

          onPlaceRef.current({
            address: place.formattedAddress ?? '',
            latitude: coord(place.location?.lat),
            longitude: coord(place.location?.lng),
            country: country?.nameEn,
            city: city?.nameEn,
          });
        } catch {
          // A failed lookup just leaves the form untouched.
        }
      });
      containerRef.current.replaceChildren(element);
      setReady(true);
    })();

    return () => {
      cancelled = true;
      element?.remove();
    };
  }, [locale]);

  // No API key / script blocked → no search box at all.
  return (
    <div className={ready ? 'block' : 'hidden'}>
      <span className="mb-1 block text-sm font-medium text-ink">{label}</span>
      <div ref={containerRef} />
      {hint && <span className="mt-1 block text-xs text-ink-soft">{hint}</span>}
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { api } from './api';
import { MeResponse } from './types';

/**
 * Client-side permission info for UX gating (hide nav items, buttons).
 * The backend is the real gatekeeper — every route is guarded server-side.
 */
let mePromise: Promise<MeResponse> | null = null;

function fetchMe(): Promise<MeResponse> {
  mePromise ??= api<MeResponse>('/auth/me').catch((err) => {
    mePromise = null;
    throw err;
  });
  return mePromise;
}

export function useMe() {
  const [me, setMe] = useState<MeResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchMe()
      .then((data) => !cancelled && setMe(data))
      .catch(() => {
        // Unauthenticated flows are handled by api()'s 401 logout.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const permissions = me?.role.permissions ?? [];
  const hasPermission = (key: string) =>
    permissions.includes('*') || permissions.includes(key);

  return { me, loaded: me !== null, permissions, hasPermission };
}

import { useCallback, useEffect, useState } from 'react';
import { sanitizeSkin, type PancakeSkin } from './skinEngine';

const STORAGE_KEY = 'pancakeStack.skin';

function loadSkin(): PancakeSkin | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return sanitizeSkin(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function useSkin() {
  const [skin, setSkinState] = useState<PancakeSkin | null>(() => loadSkin());

  useEffect(() => {
    try {
      if (skin) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(skin));
      } else {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // ignore quota / privacy errors
    }
  }, [skin]);

  const setSkin = useCallback((next: PancakeSkin | null) => {
    setSkinState(next ? sanitizeSkin(next) : null);
  }, []);

  const resetSkin = useCallback(() => setSkinState(null), []);

  return { skin, setSkin, resetSkin };
}

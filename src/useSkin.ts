import { useCallback, useEffect, useState } from 'react';
import { sanitizeSkin, type PancakeSkin } from './skinEngine';

const STORAGE_KEY = 'pancakeStack.skin';
const OWNED_KEY = 'pancakeStack.ownedSkins';

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

function loadOwned(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(OWNED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(x => typeof x === 'string');
  } catch {
    return [];
  }
}

export function useSkin() {
  const [skin, setSkinState] = useState<PancakeSkin | null>(() => loadSkin());
  const [ownedSkinIds, setOwnedSkinIds] = useState<string[]>(() => loadOwned());

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

  useEffect(() => {
    try {
      window.localStorage.setItem(OWNED_KEY, JSON.stringify(ownedSkinIds));
    } catch {
      // ignore
    }
  }, [ownedSkinIds]);

  const setSkin = useCallback((next: PancakeSkin | null) => {
    setSkinState(next ? sanitizeSkin(next) : null);
  }, []);

  const resetSkin = useCallback(() => setSkinState(null), []);

  const addOwnedSkin = useCallback((id: string) => {
    setOwnedSkinIds(prev => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  return { skin, setSkin, resetSkin, ownedSkinIds, addOwnedSkin };
}

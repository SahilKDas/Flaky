"use client";

import { useCallback, useEffect, useState } from "react";
import { createSeedStore } from "./seed";
import type { Store } from "./types";

const STORAGE_KEY = "flaky-demo-store-v2";

function readSavedStore(fallback: Store) {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Store;
    if (!Array.isArray(parsed.testCases) || !Array.isArray(parsed.runs) || !Array.isArray(parsed.diagnoses)) return fallback;
    return parsed;
  } catch {
    return fallback;
  }
}

export function useDemoStore(initialStore: Store) {
  const [store, setStoreState] = useState(initialStore);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setStoreState(readSavedStore(initialStore));
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [initialStore]);

  const setStore = useCallback((updater: Store | ((current: Store) => Store)) => {
    setStoreState((current) => {
      const next = typeof updater === "function" ? updater(current) : updater;
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const resetStore = useCallback(() => {
    const seed = createSeedStore();
    window.localStorage.removeItem(STORAGE_KEY);
    setStoreState(seed);
  }, []);

  return { store, setStore, resetStore, hydrated };
}

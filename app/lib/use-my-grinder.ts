"use client";

/* ============================================================================
   The reader's own grinder, stored on the device.

   Read through useSyncExternalStore rather than an effect, for three reasons:
     - no setState-in-effect, so no cascading render on every mount
     - no hydration mismatch: the server snapshot is always ""
     - every component using the hook updates together, so choosing a grinder
       on a recipe page immediately re-translates the card next to it

   One key, deliberately. No account, no sync, no server copy.
   ========================================================================== */

import { useCallback, useSyncExternalStore } from "react";

export const MY_GRINDER_KEY = "bloom.setup.grinder.v1";

/** Fired on ourselves, because `storage` only fires in *other* tabs. */
const CHANGE_EVENT = "bloom:my-grinder";

const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === MY_GRINDER_KEY) onChange();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

function getSnapshot(): string {
  try {
    return window.localStorage.getItem(MY_GRINDER_KEY) ?? "";
  } catch {
    // Private mode / storage disabled — translation simply stays off.
    return "";
  }
}

/** Nothing is known on the server, so it always renders the untranslated view. */
function getServerSnapshot(): string {
  return "";
}

export function setMyGrinder(name: string) {
  try {
    if (name) window.localStorage.setItem(MY_GRINDER_KEY, name);
    else window.localStorage.removeItem(MY_GRINDER_KEY);
  } catch {
    // ignore — the value just won't persist
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
  emit();
}

export function useMyGrinder(): [string, (name: string) => void] {
  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const set = useCallback((name: string) => setMyGrinder(name), []);
  return [value, set];
}

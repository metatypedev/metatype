// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { useAtom, atom } from "jotai";
import { atomWithStorage, createJSONStorage } from "jotai/utils";
import { atomWithLocation } from "jotai-location";
import { useCallback, useEffect } from "react";

export type SDK = "typescript" | "python";
const defaultValue = "typescript" as SDK;
const key = "sdk";

const locationAtom = atomWithLocation();

const sdkQueryAtom = atom(
  (get) => get(locationAtom).searchParams?.get(key) as SDK | null,
  (get, set, value: SDK) => {
    const searchParams =
      get(locationAtom).searchParams ?? new URLSearchParams();
    searchParams.set(key, value);
    set(locationAtom, (prev) => ({
      ...prev,
      searchParams,
    }));
  }
);

const sdkSessionAtom = atomWithStorage(
  key,
  defaultValue,
  createJSONStorage(() => sessionStorage)
);

export function useSDK() {
  const [query, setQuery] = useAtom(sdkQueryAtom);
  const [session, setSession] = useAtom(sdkSessionAtom);

  useEffect(() => {
    if (query && query !== session) {
      setSession(query);
    }
  }, [query, setSession]);

  const set = useCallback(
    (value: SDK) => {
      setQuery(value);
      setSession(value);
    },
    [setQuery, setSession]
  );

  return [query ?? session, set] as const;
}

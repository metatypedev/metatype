// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { atom, useAtom } from "jotai";
import { atomWithLocation } from "jotai-location";
import { atomWithStorage, createJSONStorage } from "jotai/utils";
import { useCallback, useEffect } from "react";

export type TsPackageManager = "pnpm" | "deno" | "npm" | "jsr" | "yarn" | "bun";
const defaultTsValue = "npm" as TsPackageManager;
const tsKey = "tsPackageManager";

export type PythonPackageManager = "pip" | "poetry";
const defaultPythonValue = "poetry" as PythonPackageManager;
const pythonKey = "pythonPackageManager";

const locationAtom = atomWithLocation();

const tsPmQueryAtom = atom(
  (get) =>
    get(locationAtom).searchParams?.get(tsKey) as TsPackageManager | null,
  (get, set, value: TsPackageManager) => {
    const searchParams = get(locationAtom).searchParams ??
      new URLSearchParams();
    searchParams.set(tsKey, value);
    set(locationAtom, (prev) => ({
      ...prev,
      searchParams,
    }));
  },
);

const pythonPmQueryAtom = atom(
  (get) =>
    get(locationAtom).searchParams?.get(
      pythonKey,
    ) as PythonPackageManager | null,
  (get, set, value: TsPackageManager) => {
    const searchParams = get(locationAtom).searchParams ??
      new URLSearchParams();
    searchParams.set(pythonKey, value);
    set(locationAtom, (prev) => ({
      ...prev,
      searchParams,
    }));
  },
);

const tsPmSessionAtom = atomWithStorage(
  tsKey,
  defaultTsValue,
  createJSONStorage(() => sessionStorage),
);

const pythonPmSessionAtom = atomWithStorage(
  pythonKey,
  defaultPythonValue,
  createJSONStorage(() => sessionStorage),
);

export function useTsPackageManager() {
  const [query, setQuery] = useAtom(tsPmQueryAtom);
  const [session, setSession] = useAtom(tsPmSessionAtom);

  useEffect(() => {
    if (query && query !== session) {
      setSession(query);
    }
  }, [query, setSession]);

  const set = useCallback(
    (value: TsPackageManager) => {
      setQuery(value);
      setSession(value);
    },
    [setQuery, setSession],
  );

  return [query ?? session, set] as const;
}

export function usePythonPackageManager() {
  const [query, setQuery] = useAtom(pythonPmQueryAtom);
  const [session, setSession] = useAtom(pythonPmSessionAtom);

  useEffect(() => {
    if (query && query !== session) {
      setSession(query);
    }
  }, [query, setSession]);

  const set = useCallback(
    (value: PythonPackageManager) => {
      setQuery(value);
      setSession(value);
    },
    [setQuery, setSession],
  );

  return [query ?? session, set] as const;
}

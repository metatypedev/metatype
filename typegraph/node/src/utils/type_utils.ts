// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { PerEffect } from "../effects";

type RequiredKeys<T> = {
  [K in keyof T]-?: {} extends { [P in K]: T[K] } ? never : K;
}[keyof T];

type OptionalKeys<T> = {
  [K in keyof T]-?: {} extends { [P in K]: T[K] } ? K : never;
}[keyof T];

type PickRequired<T> = Pick<T, RequiredKeys<T>>;
type PickOptional<T> = Pick<T, OptionalKeys<T>>;

type Nullable<T> = { [P in keyof T]: T[P] | null };

export type NullableOptional<T> = PickRequired<T> & Nullable<PickOptional<T>>;

export type InjectionSource =
  | "dynamic"
  | "static"
  | "context"
  | "parent"
  | "secret";
export type InjectionValue<T> = T | PerEffect;

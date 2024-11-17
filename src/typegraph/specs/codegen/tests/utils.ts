// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

const typeAliasCase = `
  type Foo = Bar;
`;

const recordCase = `
  type RecordLike = {
    num: UInt;
    key: string;
    str_arr: string[];
    tup: [Float, Float];
    opt?: boolean;
    comp?: [UInt, Something][];
  };
`;

const unionCase = `
  type EnumLike =
  | "simple"
  | { composite: Something }
  | { snake_case: boolean }
`;

const funcCase = `
  type func = (param: string, opt?: boolean) => UInt;
`;

const importCase = `
  import { Foo, Bar } from "./foobar.ts";
`;

export { typeAliasCase, recordCase, unionCase, funcCase, importCase };

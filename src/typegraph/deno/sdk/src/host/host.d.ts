// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

export function listAllFilesHelper(
  root: string,
  list: Array<string>,
  exclude?: Array<string>,
): void;

export function expandPath(root: string, exclude: Array<string>): Array<string>;

export function print(msg: string): void;

export function eprint(msg: string): void;

export function getCwd(): string;

export function pathExists(filePath: string): boolean;

export function readFile(filePath: string): Uint8Array;

export function writeFile(filePath: string, data: Uint8Array): void;

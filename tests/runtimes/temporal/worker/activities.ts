// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

export function greet(name: string): Promise<string> {
  return Promise.resolve(`Hello, ${name}!`);
}

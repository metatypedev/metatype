// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

export function greet(name: string): Promise<string> {
  return Promise.resolve(`Hello, ${name}!`);
}

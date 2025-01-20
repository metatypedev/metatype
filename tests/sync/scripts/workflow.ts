// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

interface Context {
  kwargs: {
    name: string;
  };
}

export function sayHello(ctx: Context) {
  return `Hello ${ctx.kwargs.name}`;
}

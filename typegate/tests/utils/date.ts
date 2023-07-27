// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

const OriginalDate = Date;

export function freezeDate() {
  const date = OriginalDate.now();

  class FakeDate extends Date {
    constructor() {
      super(date);
    }
  }

  globalThis.Date = FakeDate as DateConstructor;
}

export function unfreezeDate() {
  globalThis.Date = OriginalDate;
}

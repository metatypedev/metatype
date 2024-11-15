// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { basicTestTemplate } from "./common.ts";

basicTestTemplate("memory", {
  secrets: { MY_SECRET: "Hello" },
  delays: { awaitSleepCompleteSec: 10 },
});

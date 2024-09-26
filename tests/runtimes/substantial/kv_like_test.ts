// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { basicTestTemplate, concurrentWorkflowTestTemplate } from "./common.ts";

basicTestTemplate("memory", {
  delays: { awaitSleepCompleteSec: 7 },
});

basicTestTemplate("fs", {
  delays: { awaitSleepCompleteSec: 7 },
});

concurrentWorkflowTestTemplate("fs", {
  delays: { awaitEmailCompleteSec: 10 },
});

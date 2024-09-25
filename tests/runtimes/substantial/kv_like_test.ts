// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { basicTestTemplate, concurrentWorkflowTestTemplate } from "./common.ts";

basicTestTemplate("memory", {
  awaitSleepCompleteSec: 10,
});

basicTestTemplate("fs", {
  awaitSleepCompleteSec: 10,
});

concurrentWorkflowTestTemplate("fs", {
  awaitEmailCompleteSec: 10,
});

// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import {
  basicTestTemplate,
  childWorkflowTestTemplate,
  concurrentWorkflowTestTemplate,
  retrySaveTestTemplate,
} from "./common.ts";

basicTestTemplate("memory", {
  delays: { awaitSleepCompleteSec: 7 },
});

concurrentWorkflowTestTemplate("memory", {
  delays: { awaitEmailCompleteSec: 8 },
});

retrySaveTestTemplate("memory", {
  delays: {
    awaitCompleteAll: 12,
  },
});

basicTestTemplate("fs", {
  delays: { awaitSleepCompleteSec: 7 },
});

concurrentWorkflowTestTemplate("fs", {
  delays: { awaitEmailCompleteSec: 8 },
});

retrySaveTestTemplate("fs", {
  delays: {
    awaitCompleteAll: 12,
  },
});

childWorkflowTestTemplate("fs", {
  delays: {
    awaitCompleteSec: 15,
  },
});

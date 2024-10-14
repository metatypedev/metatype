// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import {
  basicTestTemplate,
  childWorkflowTestTemplate,
  concurrentWorkflowTestTemplate,
  retrySaveTestTemplate,
} from "./common.ts";

// FIXME: start does not occur properly
// 1. internal metadata from are set into a record when #startResolver is called
//  - it is missing considering what triggerStart failure suggests
// 2. This record is not populated on the CI, and is impossible to reproduce locally (michael) but is failing on the CI
// It seems to only occur on the memory backend on this particular test(?)
// basicTestTemplate("memory", {
//   delays: { awaitSleepCompleteSec: 7 },
// });

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

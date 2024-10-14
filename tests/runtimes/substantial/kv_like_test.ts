// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import {
  basicTestTemplate,
  childWorkflowTestTemplate,
  concurrentWorkflowTestTemplate,
  retrySaveTestTemplate,
} from "./common.ts";

basicTestTemplate("fs", {
  delays: { awaitSleepCompleteSec: 8 },
});

concurrentWorkflowTestTemplate("fs", {
  delays: { awaitEmailCompleteSec: 12 },
});

retrySaveTestTemplate("fs", {
  delays: {
    awaitCompleteAll: 14,
  },
});

childWorkflowTestTemplate("fs", {
  delays: {
    awaitCompleteSec: 15,
  },
});

// FIXME: memory backend is always failing on CI
// basicTestTemplate("memory", {
//   delays: { awaitSleepCompleteSec: 7 },
// });
// concurrentWorkflowTestTemplate("memory", {
//   delays: { awaitEmailCompleteSec: 8 },
// });

// retrySaveTestTemplate("memory", {
//   delays: {
//     awaitCompleteAll: 12,
//   },
// });

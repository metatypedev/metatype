// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import {
  basicTestTemplate,
  // childWorkflowTestTemplate,
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

// FIXME: "error sending request from 127.0.0.1:39520 for http://localhost:38413/substantial-child-workflow (127.0.0.1:38413): client error (SendRequest): connection closed before message
// childWorkflowTestTemplate("fs", {
//   delays: {
//     awaitCompleteSec: 10,
//   },
// });

// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import {
  basicNonDeterministicTestTemplate,
  basicTestTemplate,
  childWorkflowTestTemplate,
  concurrentWorkflowTestTemplate,
  retrySaveTestTemplate,
} from "./common.ts";

basicTestTemplate("fs", {
  delays: { awaitSleepCompleteSec: 12 },
});

concurrentWorkflowTestTemplate("fs", {
  delays: { awaitEmailCompleteSec: 12 },
});

retrySaveTestTemplate("fs", {
  delays: {
    awaitCompleteAll: 17,
  },
});

childWorkflowTestTemplate("fs", {
  delays: {
    awaitCompleteSec: 20,
  },
});

basicTestTemplate("memory", {
  delays: { awaitSleepCompleteSec: 12 },
});
concurrentWorkflowTestTemplate("memory", {
  delays: { awaitEmailCompleteSec: 8 },
});

retrySaveTestTemplate("memory", {
  delays: {
    awaitCompleteAll: 17,
  },
});

basicNonDeterministicTestTemplate("memory", {
  delays: {
    awaitSleepCompleteSec: 10,
  },
});

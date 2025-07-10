// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import {
  basicNonDeterministicTestTemplate,
  basicTestTemplate,
  childWorkflowTestTemplate,
  concurrentWorkflowTestTemplate,
  redisCleanup,
  retrySaveTestTemplate,
  SUB_REDIS,
} from "./common.ts";

basicTestTemplate(
  "redis",
  {
    delays: { awaitSleepCompleteSec: 16 },
    secrets: { SUB_REDIS },
  },
  redisCleanup(SUB_REDIS),
);

concurrentWorkflowTestTemplate(
  "redis",
  {
    delays: { awaitEmailCompleteSec: 12 },
    secrets: { SUB_REDIS },
  },
  redisCleanup(SUB_REDIS),
);

retrySaveTestTemplate(
  "redis",
  {
    delays: {
      awaitCompleteAll: 17,
    },
    secrets: { SUB_REDIS },
  },
  redisCleanup(SUB_REDIS),
);

childWorkflowTestTemplate(
  "redis",
  {
    delays: {
      awaitCompleteSec: 20,
    },

    secrets: { SUB_REDIS },
  },
  redisCleanup(SUB_REDIS),
);

basicNonDeterministicTestTemplate("redis", {
  delays: {
    awaitSleepCompleteSec: 10,
  },
  secrets: { SUB_REDIS },
}, redisCleanup(SUB_REDIS));

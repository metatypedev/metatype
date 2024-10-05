// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import {
  SUB_REDIS,
  basicTestTemplate,
  concurrentWorkflowTestTemplate,
  redisCleanup,
  retrySaveTestTemplate,
} from "./common.ts";

basicTestTemplate(
  "redis",
  {
    delays: { awaitSleepCompleteSec: 8 },
    secrets: { SUB_REDIS },
  },
  redisCleanup(SUB_REDIS)
);

concurrentWorkflowTestTemplate(
  "redis",
  {
    delays: { awaitEmailCompleteSec: 18 },
    secrets: { SUB_REDIS },
  },
  redisCleanup(SUB_REDIS)
);

retrySaveTestTemplate(
  "redis",
  {
    delays: {
      awaitCompleteAll: 18,
    },
    secrets: { SUB_REDIS },
  },

  redisCleanup(SUB_REDIS)
);

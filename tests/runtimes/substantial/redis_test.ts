// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import {
  SUB_REDIS,
  basicTestTemplate,
  concurrentWorkflowTestTemplate,
  redisCleanup,
} from "./common.ts";

basicTestTemplate(
  "redis",
  { awaitSleepCompleteSec: 10 },
  {
    SUB_REDIS,
  },
  redisCleanup(SUB_REDIS)
);

concurrentWorkflowTestTemplate(
  "redis",
  { awaitEmailCompleteSec: 20 }, // 2/3 will complete at <15s
  { SUB_REDIS },
  redisCleanup(SUB_REDIS)
);

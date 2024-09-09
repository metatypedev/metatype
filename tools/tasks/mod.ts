import type { DenoTaskDefArgs } from "../deps.ts";

import tasksBuild from "./build.ts";
import tasksDev from "./dev.ts";
import tasksFetch from "./fetch.ts";
import tasksInstall from "./install.ts";
import tasksLint from "./lint.ts";
import tasksLock from "./lock.ts";
import tasksTest from "./test.ts";

export default {
    ...tasksBuild,
    ...tasksDev,
    ...tasksFetch,
    ...tasksInstall,
    ...tasksLint,
    ...tasksLock,
    ...tasksTest,
} satisfies Record<string, DenoTaskDefArgs>;

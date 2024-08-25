import { DenoTaskDefArgs } from "./deps.ts";

import tasksBuild from "./tasks-build.ts";
import tasksDev from "./tasks-dev.ts";
import tasksFetch from "./tasks-fetch.ts";
import tasksInstall from "./tasks-install.ts";
import tasksLint from "./tasks-lint.ts";
import tasksLock from "./tasks-lock.ts";
import tasksTest from "./tasks-test.ts";

export default {
    ...tasksBuild,
    ...tasksDev,
    ...tasksFetch,
    ...tasksInstall,
    ...tasksLint,
    ...tasksLock,
    ...tasksTest,
} satisfies Record<string, DenoTaskDefArgs>;

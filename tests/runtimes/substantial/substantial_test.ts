import { basicTestTemplate } from "./common.ts";

basicTestTemplate("memory", {
  secrets: { MY_SECRET: "Hello" },
  delays: { awaitSleepCompleteSec: 10 },
});

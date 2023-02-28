// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { handlers, LevelName, Logger } from "std/log/mod.ts";
import { basename, extname, fromFileUrl } from "std/path/mod.ts";
import { z } from "zod";

import { configOrExit } from "./utils.ts";

if (!Deno.env.has("VERSION")) {
  // set version for config and workers, only running in main engine
  const { get_version } = await import("native");
  Deno.env.set("VERSION", await get_version());
}

export const zBooleanString = z.preprocess(
  (a: unknown) => z.coerce.string().parse(a) === "true",
  z.boolean(),
);

// Those envs are split from the config as only a subset of them are shared with the workers
const schema = {
  debug: zBooleanString,
  log_level: z.enum([
    "NOTSET",
    "DEBUG",
    "INFO",
    "WARNING",
    "ERROR",
    "CRITICAL",
  ]).optional(),
  rust_log: z.string().optional(),
  version: z.string(),
};

export const envSharedWithWorkers = Object.keys(schema).map((
  k,
) => k.toUpperCase());

const config = await configOrExit([
  {
    sentry_sample_rate: 1,
    sentry_traces_sample_rate: 1,
    log_level: "INFO",
  },
  Object.fromEntries(
    envSharedWithWorkers
      .map((k) => [k.toLocaleLowerCase(), Deno.env.get(k)])
      .filter(([_, v]) => v !== undefined),
  ),
], schema);

// set rust log level is not explicit set
if (!config.rust_log) {
  const set = (level: string) => Deno.env.set("RUST_LOG", level);
  switch (config.log_level) {
    case "NOTSET":
      set("off");
      break;
    case "DEBUG":
      set("debug");
      break;
    case "WARNING":
      set("warn");
      break;
    case "ERROR":
    case "CRITICAL":
      set("error");
      break;
    case "INFO":
    default:
      set("info");
      break;
  }
}

const consoleHandler = new handlers.ConsoleHandler(
  config.log_level as LevelName,
  {
    formatter: (log) =>
      `${log.datetime.toISOString()} ${log.levelName.padEnd(5)} ${
        log.loggerName.padEnd(12)
      } ${log.msg}`,
  },
);

const loggers = new Map<string, Logger>();
const defaultLogger = new Logger("default", "NOTSET", {
  handlers: [consoleHandler],
});

export function getLogger(
  name: ImportMeta | string | null = null,
  levelName: LevelName = "NOTSET",
): Logger {
  if (!name) {
    return defaultLogger;
  }
  if (typeof name === "object") {
    name = basename(fromFileUrl(name.url));
    name = name.replace(extname(name), "");
  }
  let logger = loggers.get(name);
  if (!logger) {
    logger = new Logger(name, levelName, { handlers: [consoleHandler] });
    loggers.set(name, logger);
  }
  return logger;
}

// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { handlers, LevelName, Logger } from "std/log/mod.ts";
import { basename, extname, fromFileUrl } from "std/path/mod.ts";
import { z } from "zod";
import { deepMerge } from "std/collections/deep_merge.ts";

export const configOrExit = async <T extends z.ZodRawShape>(
  sources: Record<string, unknown>[],
  schema: T,
) => {
  const parsing = await z.object(schema).safeParse(
    sources.reduce((a, b) => deepMerge(a, b), {}),
  );

  if (!parsing.success) {
    console.error(parsing.error);
    Deno.exit(1);
  }

  return parsing.data;
};

if (!Deno.env.has("VERSION")) {
  // set version for config and workers, only running in main engine
  const { get_version } = await import("native");
  Deno.env.set("VERSION", get_version());
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
  deno_testing: zBooleanString,
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
      set("info,native=trace");
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
    formatter: (log) => {
      let msg = log.msg;
      for (const arg of log.args) {
        msg = msg.replace(
          "{}",
          typeof arg === "string" ? arg : JSON.stringify(arg),
        );
      }
      return `${log.datetime.toISOString()} ${log.levelName.padEnd(5)} ${
        log.loggerName.padEnd(16)
      } ${msg}`;
    },
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

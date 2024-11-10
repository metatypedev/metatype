// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { ConsoleHandler, type LevelName, Logger } from "@std/log";
import { basename, dirname } from "@std/url";
import { extname } from "@std/path";
import { sharedConfig } from "./config/shared.ts";

// set rust log level is not explicit set
if (!sharedConfig.rust_log) {
  const set = (level: string) => Deno.env.set("RUST_LOG", level);
  switch (sharedConfig.log_level) {
    case "NOTSET":
      set("off");
      break;
    case "DEBUG":
      set(
        "info,native=trace,sql_schema_connector=warn,tracing=warn,schema_core=warn",
      );
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

const consoleHandler = new ConsoleHandler(sharedConfig.log_level as LevelName, {
  formatter: (log) => {
    let msg = log.msg;
    for (const arg of log.args) {
      msg = msg.replace(
        "{}",
        typeof arg === "string" ? arg : JSON.stringify(arg),
      );
    }
    return `${log.datetime.toISOString()} [${log.levelName} ${log.loggerName}] ${msg}`;
  },
});

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
    const bname = basename(name.url);
    const dname = basename(dirname(name.url));
    name = `${dname}/${bname.replace(extname(bname), "")}`;
  }
  let logger = loggers.get(name);
  if (!logger) {
    logger = new Logger(name, levelName, { handlers: [consoleHandler] });
    loggers.set(name, logger);
  }
  return logger;
}

export { Logger };

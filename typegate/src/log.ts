// Copyright Metatype under the Elastic License 2.0.

import { handlers, LevelName, Logger } from "std/log/mod.ts";
import { basename, extname, fromFileUrl } from "std/path/mod.ts";

const console = new handlers.ConsoleHandler("DEBUG", {
  formatter: "{levelName} [{loggerName}] {msg}",
});

const loggers = new Map<string, Logger>();
const defaultLogger = new Logger("default", "NOTSET", { handlers: [console] });

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
    logger = new Logger(name, levelName, { handlers: [console] });
    loggers.set(name, logger);
  }
  return logger;
}

export function getRequestLogger(name: string): Logger {
  const handler = new handlers.FileHandler("INFO", {
    filename: "logs/requests.log",
    formatter: "[{loggerName}] {msg}",
  });
  handler.setup();
  return new Logger(
    `req:${name}`,
    "NOTSET",
    {
      handlers: [handler],
    },
  );
}

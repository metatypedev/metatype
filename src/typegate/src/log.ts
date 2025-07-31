// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import * as std_log from "@std/log";
export { Logger } from "@std/log";
import * as std_fmt_colors from "@std/fmt/colors";
import { basename, dirname, extname } from "@std/path";
import {
  ADDRESSED_DEFAULT_LEVEL,
  MAIN_DEFAULT_LEVEL,
  sharedConfig,
} from "./config/shared.ts";

// set rust log level is not explicit set
if (!sharedConfig.rust_log) {
  const set = (level: string) => Deno.env.set("RUST_LOG", level);
  switch (sharedConfig.log_level?.default) {
    case "NOTSET":
      set("off");
      break;
    case "DEBUG":
      set(
        "info,native=trace,sql_schema_connector=warn,tracing=warn,schema_core=warn,quaint=warn",
      );
      break;
    case "WARN":
      set("warn");
      break;
    case "ERROR":
    case "CRITICAL":
      set("error");
      break;
    case "INFO":
    default:
      set("info,quaint=warn");
      break;
  }
}

function formatter(lr: std_log.LogRecord) {
  const loggerName = lr.loggerName !== "default" ? " " + lr.loggerName : "";
  let msg =
    `${lr.datetime.toISOString()} [${lr.levelName}${loggerName}] ${lr.msg}`;

  lr.args.forEach((arg, _index) => {
    msg += `, ${
      Deno.inspect(arg, {
        colors: isColorfulTty(),
        depth: 10,
        strAbbreviateSize: 1024,
        iterableLimit: 1000,
        breakLength: Infinity,
      })
    }`;
  });

  return msg;
}

class ConsoleErrHandler extends std_log.BaseHandler {
  constructor(
    levelName: std_log.LevelName,
    options: std_log.BaseHandlerOptions = { formatter },
  ) {
    super(levelName, options);
  }
  override log(msg: string): void {
    // deno-lint-ignore no-console
    console.log(msg);
  }
  override format(logRecord: std_log.LogRecord): string {
    let msg = super.format(logRecord);

    switch (logRecord.level) {
      case std_log.LogLevels.INFO:
        msg = std_fmt_colors.blue(msg);
        break;
      case std_log.LogLevels.WARN:
        msg = std_fmt_colors.yellow(msg);
        break;
      case std_log.LogLevels.ERROR:
        msg = std_fmt_colors.red(msg);
        break;
      case std_log.LogLevels.CRITICAL:
        msg = std_fmt_colors.bold(std_fmt_colors.red(msg));
        break;
      case std_log.LogLevels.DEBUG:
        msg = std_fmt_colors.dim(msg);
        break;
      default:
        break;
    }

    return msg;
  }
}

class TestConsoleErrHandler extends ConsoleErrHandler {
  constructor(
    public throwLevel: number,
    levelName: std_log.LevelName,
    options: std_log.BaseHandlerOptions = { formatter },
  ) {
    super(levelName, options);
  }

  override handle(lr: std_log.LogRecord): void {
    if (lr.level >= this.throwLevel) {
      throw new Error(`detected ${lr.levelName} log record:`, { cause: lr });
    }
    super.handle(lr);
  }
}

const panicLevelName = Deno.env.get("META_LOG_PANIC_LEVEL");
const consoleHandler = panicLevelName
  ? new TestConsoleErrHandler(
    std_log.getLevelByName(
      panicLevelName.toUpperCase() as std_log.LevelName,
    ),
    sharedConfig.log_level?.default ?? MAIN_DEFAULT_LEVEL,
  )
  : new ConsoleErrHandler(
    sharedConfig.log_level?.default ?? MAIN_DEFAULT_LEVEL,
  );

const loggers = new Map<string, std_log.Logger>([
  [
    "",
    new std_log.Logger("default", "NOTSET", {
      handlers: [consoleHandler],
    }),
  ],
]);

export function getLogger(
  name: ImportMeta | string = self.name, // use name of worker by default
  levelName?: std_log.LevelName,
): std_log.Logger {
  if (typeof name === "object") {
    const bname = basename(name.url);
    const dname = basename(dirname(name.url));
    name = `${dname}/${bname.replace(extname(bname), "")}`;
  }
  let logger = loggers.get(name);
  if (!logger) {
    const level = sharedConfig.log_level?.[name] ?? levelName ?? "NOTSET";
    logger = new std_log.Logger(name, level, {
      handlers: [consoleHandler],
    });
    loggers.set(name, logger);
  }
  return logger;
}

let colorEnvFlagSet = false;
Deno.permissions.query({
  name: "env",
  variable: "CLICOLOR_FORCE",
})
  // do the check lazily to improve starts
  .then((perm) => {
    if (perm.state == "granted") {
      const val = Deno.env.get("CLICOLOR_FORCE");
      colorEnvFlagSet = !!val && val != "0" && val != "false";
    }
  });

export function isColorfulTty(outFile = Deno.stderr) {
  if (colorEnvFlagSet) {
    return true;
  }
  if (outFile.isTerminal()) {
    const { columns } = Deno.consoleSize();
    return columns > 0;
  }
  return false;
}

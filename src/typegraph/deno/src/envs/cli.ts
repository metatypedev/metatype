// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0
import process from "node:process";

const requiredCliEnvs = [
  "version",
  "command",
  "typegraph_path",
  "filter",
  "config_dir",
  "working_dir",
  "migrations_dir",
  "artifact_resolution",
] as const;

const optionalCliEnvs = ["prefix"] as const;

const COMMANDS = ["serialize", "deploy", "list"] as const;
type Command = typeof COMMANDS extends ReadonlyArray<infer C> ? C : never;

export interface CliEnv {
  version: string;
  command: Command;
  typegraph_path: string;
  filter: string[] | null;
  config_dir: string;
  working_dir: string;
  migrations_dir: string;
  artifact_resolution: boolean;
  prefix?: string;
}

export function loadCliEnv(): CliEnv | null {
  const record: Partial<CliEnv> = {};
  const env = process.env;
  const missing: string[] = [];

  for (const key of requiredCliEnvs) {
    const name = `MCLI_${key.toLocaleUpperCase()}`;
    const envValue = env[name];
    if (envValue == null) {
      missing.push(name);
    } else {
      switch (key) {
        case "command":
          if (!(COMMANDS as readonly string[]).includes(envValue)) {
            throw new Error(
              `${name} env value should be one of: serialize, deploy`,
            );
          }
          record[key] = envValue as Command;
          break;

        case "filter":
          if (envValue === "all") {
            record[key] = null;
          } else {
            const prefix = "typegraphs=";
            if (!envValue.startsWith(prefix)) {
              throw new Error(`invalid ${name} env value: ${envValue}`);
            } else {
              record[key] = envValue.slice(prefix.length).split(",");
            }
          }
          break;

        case "artifact_resolution":
          record[key] = envValue === "true";
          break;

        default:
          record[key] = envValue;
          break;
      }
    }
  }

  for (const key of optionalCliEnvs) {
    const name = `MCLI_${key.toLocaleUpperCase()}`;
    const envValue = env[name];
    if (envValue != null) {
      record[key] = envValue;
    }
  }

  if (missing.length > 0) {
    if (Object.keys(record).length === 0) {
      return null;
    }
    throw new Error(`required environment variables: ${missing.join(", ")}`);
  }

  return record as CliEnv;
}

export const CLI_ENV: CliEnv | null = loadCliEnv();

/** check if running in the meta cli */
export function hasCliEnv(): boolean {
  return CLI_ENV != null;
}

/** get the envs from meta cli */
export function getCliEnv(): CliEnv {
  if (CLI_ENV == null) {
    throw new Error("cannot be called in this context");
  }
  return CLI_ENV;
}

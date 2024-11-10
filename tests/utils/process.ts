// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { TextLineStream } from "@local/tools/deps.ts";
import { deadline } from "@std/async/deadline";

export type Consumer = {
  (line: string): boolean | Promise<boolean>; // return false to stop
};

export class Lines {
  #stream: ReadableStream<string>;
  #reader: ReadableStreamDefaultReader<string>;

  constructor(raw_stream: ReadableStream<Uint8Array>) {
    this.#stream = raw_stream
      .pipeThrough(new TextDecoderStream())
      .pipeThrough(new TextLineStream());
    this.#reader = this.#stream.getReader();
  }

  // return true if the stream is exhausted
  async readWhile(
    check: Consumer,
    timeoutMs: number | null = 30_000
  ): Promise<boolean> {
    const next =
      timeoutMs == null
        ? () => this.#reader.read()
        : () => deadline(this.#reader.read(), timeoutMs);
    let shouldContinue = true;
    while (shouldContinue) {
      const { value: line, done } = await next();
      if (done) return true;
      shouldContinue = await check(line);
    }
    return false;
  }

  async close() {
    await this.#reader.cancel();
  }
}

export class LineWriter {
  #stream: WritableStream<Uint8Array>;

  constructor(raw_stream: WritableStream<Uint8Array>) {
    this.#stream = raw_stream;
  }

  async writeLine(line: string) {
    const writer = this.#stream.getWriter();
    await writer.write(new TextEncoder().encode(`${line}\n`));
    writer.releaseLock();
  }

  async close() {
    await this.#stream.close();
  }
}

export async function killProcess(proc: Deno.ChildProcess) {
  proc.kill("SIGKILL");
  return await proc.status;
}

export async function termProcess(proc: Deno.ChildProcess) {
  proc.kill("SIGTERM");
  return await proc.status;
}

export async function ctrlcProcess(proc: Deno.ChildProcess) {
  proc.kill("SIGINT");
  return await proc.status;
}

export async function enumerateAllChildUNIX(pid: number) {
  const command = new Deno.Command("bash", {
    args: ["-c", `ps --ppid ${pid} -o pid=`],
    stderr: "piped",
    stdout: "piped",
  });

  const child = command.spawn();
  const output = await child.output();
  const decoder = new TextDecoder();
  const result = decoder.decode(output.stdout).trim();

  const directChildren = result
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line != "")
    .map((pid) => parseInt(pid));

  const all = [...directChildren];

  for (const childPID of directChildren) {
    const childChildPIDs = await enumerateAllChildUNIX(childPID);
    all.push(...childChildPIDs);
  }

  return all;
}

export async function isPIDAliveUNIX(pid: number) {
  const command = new Deno.Command("bash", {
    args: ["-c", `kill -0 ${pid}`], // no-op
    stderr: "piped",
    stdout: "piped",
  });

  const child = command.spawn();
  const output = await child.output();

  return output.success;
}

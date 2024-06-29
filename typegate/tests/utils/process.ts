// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { TextLineStream } from "@dev/deps.ts";
import { deadline } from "std/async/mod.ts";

export type FetchOutputLineParam = {
  (line: string): boolean | Promise<boolean>; // return false to stop
};

export class ProcessOutputLines {
  #process: Deno.ChildProcess;
  #stdinStream: WritableStream<Uint8Array>;
  #stdoutStream: ReadableStream<string>;
  #stderrStream: ReadableStream<string>;
  #stdout: ReadableStreamDefaultReader<string>;
  #stderr: ReadableStreamDefaultReader<string>;

  constructor(process: Deno.ChildProcess) {
    this.#process = process;
    this.#stdinStream = this.#process.stdin;
    this.#stdoutStream = this.#process.stdout
      .pipeThrough(new TextDecoderStream())
      .pipeThrough(new TextLineStream());
    this.#stderrStream = this.#process.stderr
      .pipeThrough(new TextDecoderStream())
      .pipeThrough(new TextLineStream());
    this.#stdout = this.#stdoutStream.getReader();
    this.#stderr = this.#stderrStream.getReader();
  }

  async #fetchOutputLines(
    reader: ReadableStreamDefaultReader<string>,
    param: FetchOutputLineParam,
    timeoutMs: number | null = 10_000,
  ) {
    const next = timeoutMs == null
      ? () => reader.read()
      : () => deadline(reader.read(), timeoutMs);
    let shouldContinue = true;
    while (shouldContinue) {
      const { value: line, done } = await next();
      if (done) break;
      shouldContinue = await param(line);
    }

    console.log("end of iteration");
  }

  fetchStdoutLines(param: FetchOutputLineParam) {
    return this.#fetchOutputLines(this.#stdout, param, null);
  }

  fetchStderrLines(param: FetchOutputLineParam) {
    return this.#fetchOutputLines(this.#stderr, param, null);
  }

  async writeLine(line: string) {
    const writer = this.#stdinStream.getWriter();
    await writer.write(new TextEncoder().encode(`${line}\n`));
    writer.releaseLock();
  }

  async close() {
    await this.#stdinStream.close();
    await this.#stdout.cancel();
    await this.#stderr.cancel();
    this.#process.kill("SIGKILL");
    const status = await this.#process.status;
    return status;
  }
}

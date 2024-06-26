// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { testDir } from "test-utils/dir.ts";
import { TextLineStream } from "../../../dev/deps.ts";
import { deadline } from "std/async/mod.ts";

export type MetaDevOptions = {
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
};

export type FetchOutputLineParam = {
  (line: string): boolean | Promise<boolean>; // return false to stop
};

export class MetaDev {
  #process: Deno.ChildProcess;
  #stdinStream: WritableStream<Uint8Array>;
  #stdoutStream: ReadableStream<string>;
  #stderrStream: ReadableStream<string>;
  #stdout: ReadableStreamDefaultReader<string>;
  #stderr: ReadableStreamDefaultReader<string>;

  private constructor(
    metaBin: string,
    public options: MetaDevOptions,
  ) {
    this.#process = new Deno.Command(metaBin, {
      cwd: options.cwd ?? testDir,
      args: [...(options.args ?? [])],
      env: options.env ?? {},
      stdout: "piped",
      stderr: "piped",
      stdin: "piped",
    }).spawn();

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

  static start(options: MetaDevOptions = {}): MetaDev {
    return new MetaDev("meta", options);
  }

  async #fetchOutputLines(
    reader: ReadableStreamDefaultReader<string>,
    param: FetchOutputLineParam,
    timeoutMs: number = 5_000,
  ) {
    const next = timeoutMs == null ? () => reader.read() : () =>
      deadline(
        reader.read(),
        timeoutMs,
      );
    let shouldContinue = true;
    while (shouldContinue) {
      const { value: line, done } = await next();
      if (done) break;
      shouldContinue = await param(line);
    }

    console.log("end of iteration");
  }

  fetchStdoutLines(param: FetchOutputLineParam) {
    return this.#fetchOutputLines(this.#stdout, param);
  }

  fetchStderrLines(param: FetchOutputLineParam) {
    return this.#fetchOutputLines(this.#stderr, param);
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

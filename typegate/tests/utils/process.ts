// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { TextLineStream } from "@dev/deps.ts";
import { deadline } from "std/async/mod.ts";

export type Consumer = {
  (line: string): boolean | Promise<boolean>; // return false to stop
};

export class ProcessOutputLines {
  #stream: ReadableStream<string>;
  #reader: ReadableStreamDefaultReader<string>;

  constructor(raw_stream: ReadableStream<Uint8Array>) {
    this.#stream = raw_stream
      .pipeThrough(new TextDecoderStream())
      .pipeThrough(new TextLineStream());
    this.#reader = this.#stream.getReader();
  }

  // return true if the stream is exhausted
  async fetchUntil(
    check: Consumer,
    timeoutMs: number | null = 10_000,
  ): Promise<boolean> {
    const next = timeoutMs == null
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

import { readline } from "https://deno.land/x/readline@v1.1.0/mod.ts";
import { testDir } from "test_utils/dir.ts";

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
  #writer: WritableStreamDefaultWriter<Uint8Array>;
  #stdoutReader: ReadableStream<Uint8Array>;
  #stderrReader: ReadableStream<Uint8Array>;
  #stdout: AsyncIterableIterator<Uint8Array>;
  #stderr: AsyncIterableIterator<Uint8Array>;

  constructor(metaBin: string, public options: MetaDevOptions) {
    this.#process = new Deno.Command(metaBin, {
      cwd: options.cwd ?? testDir,
      args: options.args ?? [],
      env: options.env ?? {},
      stdout: "piped",
      stderr: "piped",
      stdin: "piped",
    }).spawn();

    this.#writer = this.#process.stdin.getWriter();
    this.#stdoutReader = this.#process.stdout;
    this.#stderrReader = this.#process.stderr;
    this.#stdout = readline(this.#stdoutReader);
    this.#stderr = readline(this.#stderrReader);
  }

  // TODO timeout
  async #fetchOutputLines(
    iterator: AsyncIterableIterator<Uint8Array>,
    param: FetchOutputLineParam,
  ) {
    for await (const line of iterator) {
      const text = new TextDecoder().decode(line);
      const shouldContinue = await param(text);
      if (!shouldContinue) break;
    }
  }

  fetchStdoutLines(param: FetchOutputLineParam) {
    return this.#fetchOutputLines(this.#stdout, param);
  }

  fetchStderrLines(param: FetchOutputLineParam) {
    return this.#fetchOutputLines(this.#stderr, param);
  }

  writeLine(line: string) {
    this.#writer.write(new TextEncoder().encode(`${line}\n`));
  }
}

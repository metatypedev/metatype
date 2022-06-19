import { Deferred, deferred } from "std/async/deferred.ts";
import { ComputeStage } from "../engine.ts";
import type { TypeGraphDS, TypeMaterializer } from "../typegraph.ts";
import { Resolver, Runtime, RuntimeConfig } from "./Runtime.ts";
import { sha1 } from "../crypto.ts";
import { getLogger } from "../log.ts";
import { basename } from "std/path/mod.ts";

const logger = getLogger(import.meta);

const writeWorker = async (
  name: string,
  codes: Record<string, string>
): Promise<string> => {
  await Deno.mkdir("./workers", { recursive: true, mode: 0o777 });
  const calls = Object.entries(codes)
    .map(([call, code]) => `${call}: ${code}`.replace(/^(?!\s*$)/gm, "  "))
    .join(",\n");
  const content = `
import { getLogger } from "../src/log.ts";

const logger = getLogger("${name}");
logger.info("start webworker");

const map = {
${calls}
};

self.onmessage = (event) => {
  const [n, call, buffer] = event.data;
  const input = JSON.parse(new TextDecoder().decode(buffer));
  const resolver = map[call];
  const output = input.map(resolver);
  const ret = new TextEncoder().encode(JSON.stringify(output)).buffer;
  self.postMessage([n, ret], [ret]);
};
  `;
  const file = new URL(`../workers/${name}`, Deno.mainModule);
  logger.info(`flush ${name}`);
  await Deno.writeTextFile(file, content);
  const hash = await sha1(content);
  return `${file.href}#${hash}`;
};

export class WorkerRuntime extends Runtime {
  w: OnDemandWorker;

  private constructor(file: string, lazy: boolean) {
    super();
    this.w = new OnDemandWorker(file, lazy);
  }

  static async init(
    typegraph: TypeGraphDS,
    materializers: TypeMaterializer[],
    args: Record<string, unknown>,
    config: RuntimeConfig
  ): Promise<Runtime> {
    const codes = materializers.reduce(
      (agg, mat) => ({ ...agg, [mat.name]: mat.data.code }),
      {}
    );
    const name = `${typegraph.types[0].name}.js`;
    const file = await writeWorker(name, codes);
    return new WorkerRuntime(file, config.lazy as boolean);
  }

  deinit(): Promise<void> {
    return this.w.terminate();
  }

  materialize(
    stage: ComputeStage,
    waitlist: ComputeStage[],
    verbose: boolean
  ): ComputeStage[] {
    if (!stage.props.materializer) {
      throw new Error("No materializer specified for WorkerRuntime.");
    }
    return [
      new ComputeStage({
        ...stage.props,
        resolver: this.delegate(stage.props.materializer.name),
      }),
    ];
  }

  delegate(name: string): Resolver {
    return async (args: any) => {
      return await this.w.passPayload(name, [args]).then((v) => v[0]);
    };
  }
}

const resetModulus = 1_000_000;
const inactivityThreshold = 1;
const inactivityIntervalMs = 15_000;

class OnDemandWorker {
  name: string;
  module: string;

  lazyWorker?: Worker;

  promises: Map<number, Deferred<ArrayBuffer>> = new Map();
  counter = 0;

  gcState = 0;
  gcInterval?: number;

  constructor(module: string, lazy: boolean) {
    this.name = basename(new URL(module).pathname);
    this.module = module;
    if (lazy) {
      this.enableLazyWorker();
    } else {
      this.worker();
    }
  }

  enableLazyWorker() {
    logger.info(`enable laziness ${this.name}`);
    clearInterval(this.gcInterval);
    this.gcInterval = setInterval(
      () => this.checkJobLess(),
      inactivityIntervalMs
    );
  }

  disableLazyWorker() {
    logger.info(`disable laziness ${this.name}`);
    clearInterval(this.gcInterval);
    this.worker();
  }

  checkJobLess(): void {
    if (!this.lazyWorker) {
      return;
    }

    const activity =
      (this.counter - this.gcState + resetModulus) % resetModulus;
    this.gcState = this.counter;

    if (activity <= inactivityThreshold && this.promises.size < 1) {
      logger.info(`lazy close ${this.name}`);
      this.lazyWorker.terminate();
      this.lazyWorker = undefined;
    }
  }

  async terminate(): Promise<void> {
    clearInterval(this.gcInterval);
    await Promise.all(this.promises.values());
    logger.info(`close ${this.name}`);
    if (this.lazyWorker) {
      this.lazyWorker.terminate();
      this.lazyWorker = undefined;
    }
  }

  worker(): Worker {
    if (!this.lazyWorker) {
      logger.info(`spawn ${this.name}`);
      this.lazyWorker = new Worker(this.module, {
        type: "module",
        deno: {
          namespace: false,
          permissions: "none",
        },
      } as WorkerOptions);
      this.lazyWorker.onmessage = (event) => {
        const [n, res] = event.data;
        this.promises.get(n)!.resolve(res);
        this.promises.delete(n);
      };
      this.lazyWorker.onerror = (error) => {
        console.error(error);
      };
    }
    return this.lazyWorker;
  }

  private passBuffer(call: string, buffer: Transferable): Promise<ArrayBuffer> {
    const n = this.counter++;
    this.counter %= resetModulus;
    const promise = deferred<ArrayBuffer>();
    this.worker().postMessage([n, call, buffer], [buffer]);
    this.promises.set(n, promise);
    return promise;
  }

  async passPayload(call: string, payload: any): Promise<any> {
    const json = JSON.stringify(payload);
    const encoded = new TextEncoder().encode(json);
    const res = await this.passBuffer(call, encoded.buffer);
    const decoded = new TextDecoder().decode(res);
    //logger.debug(`call ${this.name} ${call} ${json} ${decoded}`);
    return JSON.parse(decoded);
  }
}

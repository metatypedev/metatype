// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0
import { inspect } from "node:util";
import { createInterface, Interface } from "node:readline";

/**
 * see: module level documentation `meta-cli/src/deploy/actors/task.rs`
 */

function getOutput(args: any[]) {
  return args
    .map((arg) => {
      if (typeof arg === "string") return arg;
      return inspect(arg, {
        colors: process.stdout.isTTY,
        depth: 10,
        maxStringLength: 1000,
        maxArrayLength: 20,
      });
    })
    .join(" ");
}

export const log = {
  debug(...args: any[]) {
    const output = getOutput(args);
    process.stdout.write(`debug: ${output}\n`);
  },
  info(...args: any[]) {
    const output = getOutput(args);
    process.stdout.write(`info: ${output}\n`);
  },
  warn(...args: any[]) {
    const output = getOutput(args);
    process.stdout.write(`warning: ${output}\n`);
  },
  error(...args: any[]) {
    const output = getOutput(args);
    process.stdout.write(`error: ${output}\n`);
  },

  failure(data: any) {
    process.stdout.write(`failure: ${JSON.stringify(data)}\n`);
  },
  success(data: any, noEncode = false) {
    const encoded = noEncode ? data : JSON.stringify(data);
    process.stdout.write(`success: ${encoded}\n`);
  },
};

class RpcResponseReader {
  private resolvers: Map<number, (data: any) => void> = new Map();
  // private readline: Interface;
  private buffer: string = "";
  // private listening = false;
  // private handler: (line: string) => void;

  constructor() {
    log.debug("creating readline interface");
    process.stdin.setEncoding("utf-8");
    // this.readline = createInterface({
    //   input: process.stdin,
    // });

    // const handler = (line: string) => {
    //   log.debug("got line", line);
    //   const message = JSON.parse(line);
    //   const resolver = this.resolvers.get(message.id);
    //   if (resolver) {
    //     log.debug("rpc response", message);
    //     resolver(message.result);
    //     this.resolvers.delete(message.id);

    //     if (this.resolvers.size === 0) {
    //       this.readline.pause();
    //       log.debug("paused");
    //     }
    //   }
    // };

    // log.debug("adding line handler");
    // this.readline.on("line", handler);

    // log.debug("unref stdin");
    // process.stdin.unref();
    // log.debug("unreffed stdin");
  }

  // async open() {
  //   if (this.readline) { //     return;
  //   }
  //   this.readline = createInterface({
  //     input: process.stdin,
  //   });
  //   log.debug("opened");

  //   for await (const line of this.readline) {
  //     const message = JSON.parse(line);
  //     const resolver = this.resolvers.get(message.id);
  //     if (resolver) {
  //       log.debug("rpc response", message);
  //       resolver(message.result);
  //       this.resolvers.delete(message.id);
  //       if (this.resolvers.size === 0) {
  //         this.readline.close();
  //         log.debug("closed");
  //       }
  //     }
  //   }
  // }

  // TODO implement timeout
  // async loop() {
  //   log.debug("loop: on");
  //   for await (const line of this.readline) {
  //     log.debug("resolvers", this.resolvers.size, line);
  //     try {
  //       const message = JSON.parse(line);
  //       const resolver = this.resolvers.get(message.id);
  //       if (resolver) {
  //         log.debug("rpc response", message);
  //         resolver(message.result);
  //         this.resolvers.delete(message.id);
  //         if (this.resolvers.size === 0) {
  //           break;
  //         }
  //       }
  //     } catch (e) {
  //       // pass
  //     }
  //   }
  //   this.running = false;
  //   log.debug("loop: off");
  // }

  read(id: number) {
    return new Promise((resolve, reject) => {
      const handler = () => {
        while (true) {
          const chunk = process.stdin.read();
          if (chunk == null) {
            break;
          }
          this.buffer += chunk;
          const lines = this.buffer.split(/\r\n|\n/);
          if (lines.length > 2) {
            reject(new Error("not sequential"));
          } else if (lines.length <= 1) {
            continue;
          }
          this.buffer = lines.pop()!;

          try {
            const message = JSON.parse(lines[0]);
            if (message.id === id) {
              resolve(message.result);
              break;
            }
          } catch (e) {
            reject("invalid message");
          }
        }
        process.stdin.off("readable", handler);
      };
      process.stdin.on("readable", handler);
    });

    // if (!this.listening) {
    //   this.readline.resume();
    //   log.debug("listening: on");
    //   this.listening = true;
    //   this.readline.on("line", this.handler);
    // }
    // if (!this.running) {
    //   this.running = true;
    //   this.loop();
    // }
    // this.open(); // no await
    // this.readline.resume();
    // return new Promise((resolve) => {
    //   this.resolvers.set(id, resolve);
    // });

    // return new Promise((resolve, reject) => {
    //   this.readline.resume();
    //   this.readline.once("line", (line) => {
    //     try {
    //       const message = JSON.parse(line);
    //       if (message.id !== id) {
    //         reject("required sequential read");
    //       } else {
    //         this.readline.pause();
    //         resolve(message.result);
    //       }
    //     } catch (e) {
    //       reject(e);
    //     }
    //   });
    // });
  }
}

let rpcCall = (() => {
  const responseReader = new RpcResponseReader();
  let latestRpcId = 0;

  return (method: string, params: any = null) => {
    const rpcId = latestRpcId++;
    const rpcMessage = JSON.stringify({
      jsonrpc: "2.0",
      id: rpcId,
      method,
      params,
    });

    process.stdout.write(`jsonrpc: ${rpcMessage}\n`);
    return responseReader.read(rpcId);
  };
})();

export interface TypegateConfig {
  endpoint: string;
  auth: {
    username: string;
    password: string;
  };
}

export interface GlobalConfig {
  typegate: TypegateConfig | null; // null for serialize
  prefix: string | null;
  // TODO codegen
  // TODO base migration directory
}

export interface MigrationAction {
  apply: boolean;
  create: boolean;
  reset: boolean;
}

export interface TypegraphConfig {
  secrets: Record<string, string>;
  artifactResolution: boolean;
  migrationActions: Record<string, MigrationAction>;
  defaultMigrationAction: MigrationAction;
  migrationsDir: string;
}

export const rpc = {
  getGlobalConfig: () => rpcCall("queryGlobalConfig") as Promise<GlobalConfig>,
  getTypegraphConfig: (typegraph: string) =>
    rpcCall("queryTypegraphConfig", { typegraph }) as Promise<TypegraphConfig>,
};

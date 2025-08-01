// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import fs from "node:fs";
import process from "node:process";

const BUFFER_SIZE = 1024;

const state = { id: 0 };
const isDeno = !Deno.version.v8.includes("node");
const encoder = new TextEncoder();
const decoder = new TextDecoder();
const { platform } = process;

if (platform === "darwin" || platform === "linux") {
  const ffi = await import("npm:ffi-rs@1.2.10");

  const F_GETFL = 3;
  const F_SETFL = 4;
  const O_NONBLOCK = platform === "darwin" ? 0x0004 : 0x800;

  ffi.open({
    library: "libc",
    path: platform === "darwin" ? "/usr/lib/libSystem.B.dylib" : "libc.so.6",
  });

  const { fcntl } = ffi.define({
    fcntl: {
      library: "libc",
      retType: ffi.DataType.I32,
      paramsType: [ffi.DataType.I32, ffi.DataType.I32, ffi.DataType.I32],
    },
  });

  const flags = fcntl([process.stdin.fd, F_GETFL, 0]);
  const result = fcntl([process.stdin.fd, F_SETFL, flags & ~O_NONBLOCK]);

  ffi.close("libc");

  if (result !== 0) {
    throw new Error("Failed to disable non-blocking fd flag");
  }
}

type RpcResponse<R, E = null> = {
  jsonrpc: "2.0";
  result?: R;
  error?: {
    code: number;
    message: string;
    data?: E;
  };
  id: number | string;
};

function toCamelCase(str: string) {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

function toSnakeCase(str: string) {
  return str.replace(/([A-Z])/g, "_$1").toLowerCase();
}

// deno-lint-ignore no-explicit-any
function transformKeys(obj: any, convertKey: (key: string) => string): any {
  if (Array.isArray(obj)) {
    return obj.map((item) => transformKeys(item, convertKey));
  } else if (obj && typeof obj === "object") {
    // deno-lint-ignore no-explicit-any
    const result: Record<string, any> = {};

    for (const [key, value] of Object.entries(obj)) {
      const newKey = convertKey(key);
      result[newKey] = transformKeys(value, convertKey);
    }

    return result;
  }

  return obj;
}

function readResponse() {
  const buffer = new Uint8Array(BUFFER_SIZE);
  let bytesRead = null;
  let content = new Uint8Array(0);

  do {
    if (isDeno) {
      bytesRead = Deno.stdin.readSync(buffer) ?? 0;
    } else {
      bytesRead = fs.readSync(process.stdin.fd, buffer) ?? 0;
    }
    if (bytesRead === 0) {
      continue;
    }
    const newContent = new Uint8Array(content.length + bytesRead);
    newContent.set(content);
    newContent.set(buffer.subarray(0, bytesRead), content.length);
    content = newContent;
  } while (content[content.length - 1] != 0x0a);

  return decoder.decode(content);
}

function rpcRequest<R, P>(method: string, params?: P, transform = true): R {
  const request = {
    jsonrpc: "2.0",
    method,
    params: params && transformKeys(params, toSnakeCase),
    id: state.id,
  };

  const jsonRequest = JSON.stringify(request);
  const message = encoder.encode("jsonrpc$: " + jsonRequest + "\n");

  Deno.stdout.writeSync(message);
  state.id += 1;

  const response = readResponse();
  const jsonResponse: RpcResponse<R> = JSON.parse(response);

  if (jsonResponse.error) {
    throw new Error(jsonResponse.error.message);
  }

  if (transform) {
    return transformKeys(jsonResponse.result, toCamelCase) as R;
  } else {
    return jsonResponse.result as R;
  }
}

function rpcNotify<P>(method: string, params?: P): void {
  const request = {
    jsonrpc: "2.0",
    method,
    params: params && transformKeys(params, toSnakeCase),
  };

  const jsonRequest = JSON.stringify(request);
  const message = encoder.encode("jsonrpc$: " + jsonRequest + "\n");

  Deno.stdout.writeSync(message);
}

export { rpcNotify, rpcRequest };

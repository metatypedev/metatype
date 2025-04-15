// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import fs from "node:fs";
import process from "node:process";
import { Buffer } from "node:buffer";

const BUFFER_SIZE = 1024;

const state = { id: 0 };
const isDeno = !Deno.version.v8.includes("node");
const encoder = new TextEncoder();
const decoder = new TextDecoder();
const { platform } = process;

if (platform === "darwin" || platform === "linux") {
  const ffi = await import("npm:ffi-rs");

  const F_GETFL = 3;
  const F_SETFL = 4;
  const O_NONBLOCK = platform === "darwin" ? 0x0004 : 0x800;

  ffi.open({
    library: "libc",
    path: platform === "darwin" ? "usr/lib/libSystem.B.dylib" : "libc.so.6",
  });

  const { fcntl } = ffi.define({
    fcntl: {
      library: "libc",
      retType: ffi.DataType.U8,
      paramsType: [ffi.DataType.I32, ffi.DataType.I32, ffi.DataType.I32],
    },
  });

  const flags = fcntl([process.stdin.fd, F_GETFL, 0]);
  const result = fcntl([process.stdin.fd, F_SETFL, flags & ~O_NONBLOCK]);

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

function transformKeys(obj: any, convertKey: (key: string) => string): any {
  if (Array.isArray(obj)) {
    return obj.map((item) => transformKeys(item, convertKey));
  } else if (obj && typeof obj === "object") {
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
  const buffer = Buffer.alloc(BUFFER_SIZE);

  let bytesRead = null;
  let content = Buffer.alloc(0);

  if (isDeno) {
    do {
      bytesRead = Deno.stdin.readSync(buffer) ?? 0;
      content = Buffer.concat([content, buffer.subarray(0, bytesRead)]);
    } while (content[content.length - 1] != 0x0a);
  } else {
    do {
      bytesRead = fs.readSync(process.stdin.fd, buffer) ?? 0;
      content = Buffer.concat([content, buffer.subarray(0, bytesRead)]);
    } while (content[content.length - 1] != 0x0a);
  }

  return decoder.decode(content);
}

function rpcRequest<R, P>(method: string, params?: P, transform = true) {
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

function rpcNotify<P>(method: string, params?: P) {
  const request = {
    jsonrpc: "2.0",
    method,
    params: params && transformKeys(params, toSnakeCase),
  };

  const jsonRequest = JSON.stringify(request);
  const message = encoder.encode("jsonrpc$: " + jsonRequest + "\n");

  Deno.stdout.writeSync(message);
}

export { rpcRequest, rpcNotify };

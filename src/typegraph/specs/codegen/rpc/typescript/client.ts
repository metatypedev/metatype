import { toCamelCase, toSnakeCase } from "@std/text";

const BUFFER_SIZE = 1024;

const state = { id: 0 };
const encoder = new TextEncoder();
const decoder = new TextDecoder();

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

function rpcRequest<R, P>(method: string, params?: P) {
  const request = {
    jsonrpc: "2.0",
    method,
    params: params && transformKeys(params, toSnakeCase),
    id: state.id,
  };

  const jsonRequest = JSON.stringify(request);
  const message = encoder.encode("jsonrpc: " + jsonRequest + "\n");

  Deno.stdout.writeSync(message);
  state.id += 1;

  const buffer = new Uint8Array(BUFFER_SIZE);

  let bytesRead = null;
  let content = new Uint8Array(0);

  do {
    bytesRead = Deno.stdin.readSync(buffer) ?? 0;
    content = new Uint8Array([...content, ...buffer.subarray(0, bytesRead)]);
  } while (bytesRead == BUFFER_SIZE);

  const decoded = decoder.decode(content);
  const response: RpcResponse<R> = JSON.parse(decoded);

  if (response.error) {
    throw new Error(response.error.message);
  }

  return transformKeys(response.result, toCamelCase) as R;
}

export { rpcRequest };

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

function camelToSnakeCase(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};

  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();

    if (value && typeof value === "object" && !Array.isArray(value)) {
      result[snakeKey] = camelToSnakeCase(value);
    } else {
      result[snakeKey] = value;
    }
  }

  return result;
}

function rpcRequest<R, P>(method: string, params?: P) {
  const request = {
    jsonrpc: "2.0",
    method,
    params: params && camelToSnakeCase(params),
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

  return response.result as R;
}

export { rpcRequest };

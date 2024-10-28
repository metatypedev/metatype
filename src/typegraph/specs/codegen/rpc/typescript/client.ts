import { Buffer } from "node:buffer";
import process from "node:process";
import fs from "node:fs";

const BUFFER_SIZE = 1024;

const state = { id: 0 };

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

function rpcRequest<R, P>(method: string, params?: P) {
  const request = {
    jsonrpc: "2.0",
    method,
    params,
    id: state.id,
  };

  const jsonRequest = JSON.stringify(request);

  process.stdout.write("jsonrpc: " + jsonRequest + "\n");
  state.id += 1;

  const buffer = Buffer.alloc(BUFFER_SIZE);

  let bytesRead = null;
  let content = Buffer.alloc(0);

  do {
    bytesRead = fs.readSync(process.stdin.fd, buffer);
    content = Buffer.concat([content, buffer.subarray(0, bytesRead)]);
  } while (bytesRead == BUFFER_SIZE);

  const response: RpcResponse<R> = JSON.parse(content.toString());

  if (response.error) {
    throw new Error(response.error.message);
  }

  return response.result as R;
}

export { rpcRequest };

import { rpcRequest } from "./client.ts";

const first = rpcRequest("hello", { name: "world" });
const second = rpcRequest("foo");

console.log(JSON.stringify({ first, second }));

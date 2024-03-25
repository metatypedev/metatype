import { LspServer } from "./server/index.ts";

const server = new LspServer(["deno", "lsp"]);
server.start();

import { LspServer } from "./server/mod.ts";

const server = new LspServer(["deno", "lsp"]);
server.start();

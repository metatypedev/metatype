# Metatype Dev Tools: Contribution Guide

## TypeScript Language Server

### Prerequisites
- Install emcc through [emsdk](https://emscripten.org/docs/getting_started/downloads.html#installation-instructions-using-the-emsdk-recommended) (_TODO: ghjk plugin_)

### Setup
```bash
cd dev-tools/ts-language-server
deno run -A dev/generate-grammar-wasm.ts
```

### Testing
```bash
# still in dev-tools/ts-language-server
deno test -A
```

## VSCode extension: vscode-metatype-support

### Setup
```bash
cd dev-tools/vscode-metatype-support
pnpm install
```

### Testing
- Open the repo in VSCode
- In "Run and Debug", launch "Launch Client"

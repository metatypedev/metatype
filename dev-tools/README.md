# Metatype Dev Tools: Contribution Guide

## TypeScript Language Server

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

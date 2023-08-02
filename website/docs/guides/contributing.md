# Contributing

## Prerequisites

Install:

- [Rust](https://www.rust-lang.org/tools/install)
- [Python](https://www.python.org/downloads/)
- [pipx](https://pypa.github.io/pipx/installation/)
- [PNPM](https://pnpm.io/installation)
- [Deno](https://deno.com/manual/getting_started/installation)
- [Node](https://nodejs.org/en/download/)

### Essential packages for Linux / WSL

```
sudo apt install build-essential unzip pkg-config libssl-dev protobuf-compiler
```

## Getting started

### Toolkit

```bash
# manage rust dependencies
cargo install cargo-edit
# task runner
cargo install whiz
# enforce style and good practice
pipx install pre-commit
# maange python dependencies
pipx install poetry
# clang
sudo apt-get install libclang-dev
# wasm runtime
curl -sSf https://raw.githubusercontent.com/WasmEdge/WasmEdge/master/utils/install.sh | bash
```

### Initiate workspace

```bash
# install git hooks
pre-commit install
# prepare python virtual environment
python3 -m venv .venv
source .venv/bin/activate # depends on your shell
# run the task runner and it will install the remaining dependencies
whiz
```

## Testing

```bash
deno run -A dev/env.ts all # or only the env required (e.g. base prisma s3)
cargo test
deno run -A dev/test.ts
cd typegraph/python && pytest -s
deno run -A dev/env.ts # shutdown all env
```

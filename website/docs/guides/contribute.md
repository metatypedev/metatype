# How-to contribute

## Prerequisites

Install:

- [Rust](https://www.rust-lang.org/tools/install)
- [Python](https://www.python.org/downloads/)
- [pipx](https://pypa.github.io/pipx/installation/)
- [PNPM](https://pnpm.io/installation)
- [Deno](https://deno.land/manual@v1.29.1/getting_started/installation)
- [Node](https://nodejs.org/en/download/)

## Getting started

### Essential packages for Linux / WSL

```
sudo apt install build-essential
sudo apt install unzip
sudo apt install pkg-config libssl-dev
```

### Toolset

```bash
cargo install cargo-watch
cargo install cargo-edit
cargo install --git https://github.com/zifeo/whiz --locked

apt install -y protobuf-compiler

pipx install pre-commit
pipx install poetry

deno install -Afq -n deno_bindgen https://deno.land/x/deno_bindgen/cli.ts

# wasmedge
curl -sSf https://raw.githubusercontent.com/WasmEdge/WasmEdge/master/utils/install.sh | bash
```

### Init workspace

```
pre-commit install

python3 -m venv .venv
python3 -m venv examples/.venv

cd typegraph
source ../.venv/bin/activate
poetry install
deactivate
cd ..

cd examples
poetry install
cd ..

cd website
pnpm install
cd ..

cd typegate
cp .env.sample .env
cd ..

whiz
```

## Tests

```
deno run -A dev/env.ts all
cargo test
deno run -A dev/test.ts
cd typegraph && pytest -s
deno run -A dev/env.ts
```

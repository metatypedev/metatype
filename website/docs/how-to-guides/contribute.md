# How-to contribute

## Prerequisite

Install [Rust](https://www.rust-lang.org/tools/install),
[python](https://www.python.org/downloads/)
[pipx](https://pypa.github.io/pipx/installation/) and
[pnpm](https://pnpm.io/installation).

## Getting started

### Toolset

```
cargo install cargo-watch
cargo install cargo-edit
cargo install --force --git https://github.com/zifeo/whiz

pipx install pre-commit
pipx install poetry

deno install -Afq -n deno_bindgen https://deno.land/x/deno_bindgen/cli.ts
```

### Init workspace

```
pre-commit install

python3 -m venv typegraph/.venv
python3 -m venv examples/.venv

cd typegraph
poetry install
cd ..

cd examples
poetry install
cd ..

cd website
pnpm install
cd ..

whiz
```

## Tests

```
typegate/test.sh --quiet
typegate/test-all.sh --quiet # on Linux (otherwise segfaulting)
```

# How-to contribute

## Prerequisite

Install:

- [Rust](https://www.rust-lang.org/tools/install)
- [Python](https://www.python.org/downloads/)
- [pipx](https://pypa.github.io/pipx/installation/)
- [pNpm](https://pnpm.io/installation)
- [Deno](https://deno.land/manual@v1.29.1/getting_started/installation)

## Getting started

### Toolset

```bash
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
docker compose -f dev/docker-compose.yml up -d
cargo test
cd typegate && deno run -A test.ts
cd typegraph && pytest -s

docker compose -f dev/docker-compose.yml down
```

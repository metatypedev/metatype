# Metatype

## Getting started

We use submodules

```
git clone https://github.com/metatypedev/metatype --recursive --shallow-submodules
```

/!\ Python >=3.10 required and Poetry >= 1.2.0.

### macOS

```
brew install rustup pipx python3 pnpm

rustup-init
rustup component add rustfmt

pipx install pre-commit
pipx install poetry
pipx install maturin

cargo install cargo-watch
cargo install cargo-edit

npm install --global concurrently

deno install -Afq -n deno_bindgen https://deno.land/x/deno_bindgen/cli.ts
```

### Debian

```
python3.10 → https://computingforgeeks.com/how-to-install-python-on-debian-linux/

# pipx
pip install --user pipx
pipx ensurepath

pipx install pre-commit
pipx install poetry
pipx install maturin

cargo install cargo-watch
cargo install cargo-edit

npm install --global concurrently

deno install -Afq -n deno_bindgen https://deno.land/x/deno_bindgen/cli.ts
```

### Common

```
pre-commit install
python3 -m venv typegraph/.venv
python3 -m venv example/.venv
./dev.sh
```

### Tests

```
bash -c 'cd typegate && ./test.sh --quiet --watch'
bash -c 'cd typegraph && poetry run pytest -s tests'
```

## Codesign debug

```
cargo update
codesign --force --verify --verbose --sign - native/target/debug/libnative.dylib
rm -rf ~/Library/Caches/deno/plug/file
```

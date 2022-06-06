# Metatype

## Getting started

### macOS

```
brew install rustup pipx python3 pnpm
rustup-initpnpm
rustup component add rustfmt
pipx install pre-commit
pipx install poetry
pipx install maturin
cargo install cargo-watch
cargo install cargo-edit
npm install --global concurrently
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

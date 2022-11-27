# Metatype

Running the platform requires Python >= 3.8 and Docker.

## Getting started

### 1. `meta`-cli

You can download the binary executable from
[releases](https://github.com/metatypedev/metatype/releases/), make it
executable and add it to your `$PATH` or use
[eget](https://github.com/zyedidia/eget) to automate that step.

```bash
eget metatypedev/metatype --to /usr/local/bin

meta --help
meta upgrade
```

### 2. `typegraph` package

```bash
python3 -m venv .venv
.venv/bin/activate
pip3 install typegraph --upgrade

python3 -c 'import typegraph; print(typegraph.version)'
```

### 3. Typegate node

```bash
curl https://raw.githubusercontent.com/metatypedev/metatype/main/examples/docker-compose.yml -o docker-compose.yml
docker compose up -d

curl -X POST http://localhost:7890/typegate \
    -H 'Authorization: Basic YWRtaW46cGFzc3dvcmQ=' \
    --data-binary '{"query":"query list { typegraphs { name  }}"}'
```

And head up to our [documentation](https://metatype.dev) or run directly your
[first typegraph with Metatype](https://metatype.dev/docs/tutorials/quickstart)!

### Alternatively, install from source

```
pip3 install --upgrade git+https://github.com/metatypedev/metatype#subdirectory=typegraph
cargo install --force meta --git https://github.com/metatypedev/metatype
```

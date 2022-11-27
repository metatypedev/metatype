# Metatype

[![Typegate version](https://ghcr-badge.deta.dev/metatypedev/typegate/latest_tag?trim=major&label=typegate)](https://github.com/metatypedev/metatype/pkgs/container/typegate)
[![Meta-cli version](https://img.shields.io/github/v/release/metatypedev/metatype?include_prereleases&label=meta-cli)](https://github.com/metatypedev/metatype/releases)
[![Typegraph version](https://img.shields.io/pypi/v/typegraph?label=typegraph)](https://pypi.org/project/typegraph/)
[![Typegraph Python version](https://img.shields.io/pypi/pyversions/typegraph)](https://pypi.org/project/typegraph/)

Running the platform requires Python >= 3.8 and Docker.

> Metatype is on its first release track and does not have all components
> complete & stabilized yet. However it is already successfully used in
> production in open-source and commercial solutions. Enough features are
> available for you to build a complete API composition even though the
> experience may not be as smooth as desired. All interfaces changes will be
> outlined in the [changelog](https://github.com/metatypedev/metatype/releases)
> (watch/subscribe to this repository to be notified).

Support Metatype by starring ⭐ this repository,
[discussing](https://github.com/metatypedev/metatype/discussions)
functionalities, watching new releases ➰, reporting
[issues](https://github.com/metatypedev/metatype/issues) 🐛 or even contributing
back :octocat: fixing an issue, improving clarity or adding new features.

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

### 3. `typegate` node

```bash
curl https://raw.githubusercontent.com/metatypedev/metatype/main/examples/docker-compose.yml -o docker-compose.yml
docker compose up -d

curl -X POST http://localhost:7890/typegate \
    -H 'Authorization: Basic YWRtaW46cGFzc3dvcmQ=' \
    --data-binary '{"query":"query list { typegraphs { name  }}"}'
```

And head up to our [documentation](https://metatype.dev) or start directly your
[first typegraph with Metatype](https://metatype.dev/docs/tutorials/quickstart)!

### Alternatively, install from source

```
pip3 install --upgrade git+https://github.com/metatypedev/metatype#subdirectory=typegraph
cargo install --force meta --git https://github.com/metatypedev/metatype
```

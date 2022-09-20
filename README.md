# Metatype

## Getting started

```
pip3 install --upgrade git+https://github.com/metatypedev/metatype#subdirectory=typegraph
cargo install --force meta --git https://github.com/metatypedev/metatype

curl -X POST http://localhost:7890/typegate \
    -H 'Authorization: Basic YWRtaW46cGFzc3dvcmQ=' \
    --data-binary '{"query":"query c { typegraphs { name  }}"}'
```

Note: requires Python >= 3.10.

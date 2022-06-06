# Typegate

## Codesign

```
cargo update
codesign --force --verify --verbose --sign - native/target/debug/libnative.dylib
rm -rf ~/Library/Caches/deno/plug/file
```

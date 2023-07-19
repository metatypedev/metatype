#!/usr/bin/sh

CMD='/^import .* from \047.*\047;$/ { sub(/\/imports\//, "/exports/metatype-typegraph-") } { if (!/\.d\.ts\047;$/) sub(/\047;$/, ".d.ts\047;") } { print }'

SCRIPT_DIR="$(cd -- "$(dirname "$0")" >/dev/null 2>&1 ; pwd -P)"
GEN_DIR="$(realpath "$SCRIPT_DIR/../gen")"

for file in $(ls $GEN_DIR/exports) 
do
    path="$GEN_DIR/exports/$file"
    awk "$CMD" "$path" > "$path.tmp"
    mv "$path.tmp" "$path"
done

file="typegraph_core.d.ts"
path="$GEN_DIR/$file"
awk "$CMD" "$path" > "$path.tmp"
mv "$path.tmp" "$path"

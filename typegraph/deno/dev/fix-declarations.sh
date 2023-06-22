#!/usr/bin/sh

SCRIPT_DIR="$(cd -- "$(dirname "$0")" >/dev/null 2>&1 ; pwd -P)"

IMPORTS_DIR="$(realpath "$SCRIPT_DIR/../gen/exports")"

REGEX='/^import .* from \047.*\047;$/'
CMD='$REGEX { sub(/\/imports\//, "/exports/") } { if (!/\.d\.ts\047;$/) sub(/\047;$/, ".d.ts\047;") } { print }'

for file in $(ls "$IMPORTS_DIR")
do
    path="$IMPORTS_DIR/$file"
    awk "$CMD" "$path" > "$path.tmp"
    mv "$path.tmp" "$path"
done

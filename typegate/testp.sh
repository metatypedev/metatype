#!/bin/bash

set -e
SCRIPT_PATH=$(dirname $(realpath -s $0))

i=$(printf "%s\n" "$@" | sed -n '/^--$/{=;q}')

if [ -z "$i" ]; then
    test_names=$@
else
    test_names=${@:1:$((i - 1))}
    opts=${@:$((i + 1))}
fi

for p in $test_names; do
  ${SCRIPT_PATH}/test.sh ${opts[@]} "tests/${p}_test.ts"
done

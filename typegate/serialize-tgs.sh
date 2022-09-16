#!/bin/sh

set -e

SCRIPT_PATH=$(dirname $(realpath -s $0))

export VIRTUAL_ENV=$SCRIPT_PATH/../typegraph/.venv
export PATH=$VIRTUAL_ENV/bin:$PATH

for tg_file in $SCRIPT_PATH/../typegraph/typegraph/dist/*.py; do
  name="${tg_file##*/}"
  name="${name%.py}"
  $SCRIPT_PATH/../target/debug/meta serialize -f $tg_file -1 -o $SCRIPT_PATH/src/typegraphs/$name.json
done

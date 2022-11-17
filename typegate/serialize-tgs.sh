#!/bin/sh

set -e

SCRIPT_PATH=$(dirname $(realpath -s $0))

export VIRTUAL_ENV=$SCRIPT_PATH/../typegraph/.venv
export PATH=$VIRTUAL_ENV/bin:$PATH

for tg_file in $SCRIPT_PATH/src/typegraphs/*.py; do
  name="${tg_file##*/}"
  name="${name%.py}"
  target=$SCRIPT_PATH/src/typegraphs/$name.json
  echo "Serializing typegraph $name ..."
  cargo run -p meta -q --color always -- serialize -f $tg_file -1 -o $target
  echo "  Done"
done

#!/bin/sh

set -e

SCRIPT_PATH=$(dirname $(realpath -s $0))

cd $SCRIPT_PATH

export VIRTUAL_ENV=$(realpath ../typegraph/.venv)
export PATH=$VIRTUAL_ENV/bin:$PATH

cd src/typegraphs

for tg_file in ./*.py; do
  name="${tg_file##*/}"
  name="${name%.py}"
  target=$name.json
  echo "Serializing typegraph $name ..."
  cargo run -p meta-cli -q --color always -- serialize -f $tg_file -1 -o $target
  echo "  Done"
done

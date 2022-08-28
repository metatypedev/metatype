#!/bin/sh

# This is a temporary alternative to `./test.sh --quiet`
# which currently triggers a segmentation fault, until the issue is solved
# https://github.com/denoland/deno_bindgen/issues/79

set -e
SCRIPT_PATH=$(dirname $(realpath -s $0))

for test in $(find ${SCRIPT_PATH} -name '*_test.ts'); do
  ${SCRIPT_PATH}/test.sh "${@}" $test
done

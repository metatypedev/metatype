#!/bin/sh

# This is a temporary alternative to `./test.sh --quiet`
# which currently triggers a segmentation fault, until the issue is solved
# https://github.com/denoland/deno_bindgen/issues/79

for test in `find . -name '*_test.ts'`; do
  ./test.sh --quiet $test
done

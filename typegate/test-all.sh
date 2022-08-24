#!/bin/sh

clear

for test in `ls tests/*_test.ts`; do
  ./test.sh --quiet $test
done

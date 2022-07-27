#!/usr/bin/env bash

set -e

maturin build --release --manifest-path native/Cargo.toml --no-sdist --strip
ls ./native/target/wheels/*310*.whl

poetry build --format wheel
ls ./dist

# blocked at https://github.com/jazzband/pip-tools/pull/1650
exit 0

folder=./libs

rm -rf $folder ./dist
mkdir $folder

for wheel_abs in ./native/target/wheels/*310*.whl
do
    wheel=$(basename $wheel_abs)
    echo $wheel

    mv $wheel_abs $folder/$wheel
    
    poetry add $folder/$wheel
    poetry build --format wheel
    mv dist/typegraph-0.1.0-py3-none-any.whl dist/typegraph${wheel/#native}
    
    poetry add --editable ./native
    mv $folder/$wheel $wheel_abs
done

rm -rf ./wheels

# pip debug --verbose

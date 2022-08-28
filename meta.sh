#!/bin/sh

set -e

exec cargo run --package meta -- ${@}

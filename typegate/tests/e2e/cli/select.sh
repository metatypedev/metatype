#!/bin/bash

# select option
# usage:
# > ./select.sh <IN-PATH> <OPTION> <OUT-PATH>
#
# e.g.: ./select.sh templates/migration_failure.py 1 migration_failure.py

cat $1 | sed  -e "s/# \([^\#]\+\)\(\# option:$2\)/\1\2/" > $3

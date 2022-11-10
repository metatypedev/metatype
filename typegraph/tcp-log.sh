#!/bin/sh

while true
do
    echo "Waiting for client connection..."
    nc -l $PORT
    echo
done

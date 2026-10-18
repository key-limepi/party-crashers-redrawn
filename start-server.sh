#!/usr/bin/env bash

cd "$(dirname "$(readlink -f "$0")")"
python3 server.py
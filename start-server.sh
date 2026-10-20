#!/usr/bin/env bash
# starts the server, pulls updates on start and every day at UPDATE_TIME (see .env)

cd "$(dirname "$(readlink -f "$0")")"
python3 autoupdate.py "$@"

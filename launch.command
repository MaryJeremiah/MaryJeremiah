#!/bin/sh
cd "$(dirname "$0")" || exit 1
if ! command -v node >/dev/null 2>&1; then
  echo 'Install Node.js 22 or newer from https://nodejs.org, then open this launcher again.'
  read answer
  exit 1
fi
node launch.mjs

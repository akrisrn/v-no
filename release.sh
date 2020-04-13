#!/bin/sh

set -e
. ./.env.sh
yarn run build
dist_path=$(pwd)/dist
cd "$RELEASE_PATH"
git rm -rf assets hash
cp -r "$dist_path/assets" "$dist_path/hash" .
git add assets hash

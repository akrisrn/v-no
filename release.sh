#!/bin/sh

set -e
. ./.env.sh
yarn run build
dist_path=$(pwd)/dist
cd "$RELEASE_PATH"
git rm -rf css hash js
cp -r "$dist_path/css" "$dist_path/hash" "$dist_path/js" .
git add css hash js

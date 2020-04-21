#!/bin/sh

set -e
. ./.env.sh
yarn run build
dist_path=$(pwd)/dist
cd "$RELEASE_PATH"
git rm -rf assets/css assets/js hash
cp -r "$dist_path/assets/css" "$dist_path/assets/js" "$dist_path/hash" .
git add assets/css assets/js hash

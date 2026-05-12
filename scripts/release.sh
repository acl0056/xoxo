#!/bin/bash
set -e

if [ -z "$1" ]; then
	echo "Usage: ./scripts/release.sh <version>"
	echo "Example: ./scripts/release.sh 0.0.6"
	exit 1
fi

VERSION="$1"
TAG="v$VERSION"

# Update version in package.json
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.version = '$VERSION';
fs.writeFileSync('package.json', JSON.stringify(pkg, null, '\t') + '\n');
"

# Commit, tag, and push
git add package.json
git commit -m "$TAG"
git tag "$TAG"
git push
git push origin "$TAG"

echo "Released $TAG"

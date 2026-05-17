#!/bin/sh

set -e

REPO_ROOT="${CI_PRIMARY_REPOSITORY_PATH:-$(cd "$(dirname "$0")/../../.." && pwd)}"

echo "==> Installing Node.js dependencies"
cd "$REPO_ROOT"
npm install

echo "==> Installing CocoaPods dependencies"
cd "$REPO_ROOT/ios/App"
pod install

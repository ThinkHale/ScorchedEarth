#!/bin/sh

set -e

# Xcode Cloud runs on Apple Silicon; Homebrew lives here
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

# Node.js is not pre-installed in Xcode Cloud
if ! command -v node > /dev/null 2>&1; then
  echo "==> Installing Node.js"
  brew install node
fi

# CocoaPods is usually present but guard just in case
if ! command -v pod > /dev/null 2>&1; then
  echo "==> Installing CocoaPods"
  gem install cocoapods
fi

REPO_ROOT="${CI_PRIMARY_REPOSITORY_PATH:-$(cd "$(dirname "$0")/../../.." && pwd)}"

echo "==> node $(node --version), npm $(npm --version)"

echo "==> Installing Node.js dependencies"
cd "$REPO_ROOT"
npm install

echo "==> Building web app"
npm run build

echo "==> Copying web assets to iOS project"
npx cap copy ios

echo "==> Installing CocoaPods dependencies"
cd "$REPO_ROOT/ios/App"
pod install

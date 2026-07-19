#!/usr/bin/env bash
set -e

# FuelStats Server Release Script
# Usage:
#   npm run release             # Releases current package.json version
#   npm run release -- 1.1.0    # Bumps version to 1.1.0 and releases
#   npm run release -- minor    # Bumps minor version and releases

TARGET_VERSION="$1"

if [ -n "$TARGET_VERSION" ]; then
  echo "🔢 Bumping version to $TARGET_VERSION..."
  npm version "$TARGET_VERSION" --no-git-tag-version
  NEW_VER=$(node -p "require('./package.json').version")
  git add package*.json
  git commit -m "chore(release): bump version to $NEW_VER" || true
fi

VERSION=$(node -p "require('./package.json').version")

echo "=========================================="
echo " Releasing FuelStats Server v$VERSION"
echo "=========================================="

# 1. Check working directory status
if [ -n "$(git status --porcelain)" ]; then
  echo "❌ Error: Working tree has uncommitted changes. Please commit or stash them first."
  exit 1
fi

# 2. Run Test Suite
echo "🧪 Running unit & integration test suite..."
npm test

# 3. Compile Production TypeScript
echo "🔨 Compiling TypeScript build..."
npm run build

# 4. Create Git Tag if not tagged
TAG_NAME="v$VERSION"
if git rev-parse "$TAG_NAME" >/dev/null 2>&1; then
  echo "⚠️ Tag $TAG_NAME already exists."
else
  echo "🏷️ Creating Git Tag $TAG_NAME..."
  git tag -a "$TAG_NAME" -m "FuelStats Server $TAG_NAME"
  echo "✅ Tag $TAG_NAME created."
fi

echo "=========================================="
echo " 🎉 FuelStats Server v$VERSION release ready!"
echo " Run 'git push origin master --tags' to push tags."
echo "=========================================="

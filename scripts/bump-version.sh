#!/bin/bash

# Version Bump Script
# This script reads APP_VERSION from app.js (source of truth) and updates all documentation files
# Usage: ./scripts/bump-version.sh [major|minor|build] (default: build)

set -e

# Get the script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Get the version bump type (default: build)
BUMP_TYPE=${1:-build}

# Extract current version from app.js (source of truth)
APP_JS="$PROJECT_ROOT/assets/js/app.js"

if [ ! -f "$APP_JS" ]; then
    echo "Error: $APP_JS not found"
    exit 1
fi

MAJOR=$(grep -oP 'major:\s*\K\d+' "$APP_JS")
MINOR=$(grep -oP 'minor:\s*\K\d+' "$APP_JS")
BUILD=$(grep -oP 'build:\s*\K\d+' "$APP_JS")

echo "Current version: v${MAJOR}.${MINOR}.${BUILD}"
echo "Bump type: $BUMP_TYPE"

# Calculate new version based on bump type
case $BUMP_TYPE in
    major)
        MAJOR=$((MAJOR + 1))
        MINOR=0
        BUILD=0
        ;;
    minor)
        MINOR=$((MINOR + 1))
        BUILD=0
        ;;
    build)
        BUILD=$((BUILD + 1))
        ;;
    *)
        echo "Invalid bump type. Use: major, minor, or build"
        exit 1
        ;;
esac

NEW_VERSION="v${MAJOR}.${MINOR}.${BUILD}"
echo "New version: $NEW_VERSION"

# Update app.js (source of truth)
sed -i "s/major: [0-9]\+/major: $MAJOR/" "$APP_JS"
sed -i "s/minor: [0-9]\+/minor: $MINOR/" "$APP_JS"
sed -i "s/build: [0-9]\+/build: $BUILD/" "$APP_JS"

echo "✓ Updated $APP_JS"

# Update documentation files (relative to project root)
cd "$PROJECT_ROOT"

FILES=(
    "USER_MANUAL.md"
    "README.md"
    "APP_SPEC.md"
    "DEVELOPMENT.md"
    "TO-DO.txt"
    "tests/test-utils.html"
    "tests/test.html"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        # Update version pattern vX.Y.Z
        sed -i "s/v[0-9]\+\.[0-9]\+\.[0-9]\+/$NEW_VERSION/g" "$file"
        
        # Special handling for README.md version badge
        if [ "$file" = "README.md" ]; then
            # Update version badge: version-X.Y.Z-blue.svg
            sed -i "s/version-[0-9]\+\.[0-9]\+\.[0-9]\+-blue\.svg/version-${MAJOR}.${MINOR}.${BUILD}-blue.svg/g" "$file"
        fi
        
        echo "✓ Updated $file"
    else
        echo "⚠ Skipped $file (not found)"
    fi
done

# Update TO-DO.txt date
if [ -f "TO-DO.txt" ]; then
    TODAY=$(date '+%B %d, %Y')
    sed -i "s/Last Updated: [A-Za-z]\+ [0-9]\+, [0-9]\+/Last Updated: $TODAY/" TO-DO.txt
    echo "✓ Updated TO-DO.txt date"
fi

# Add changelog entry for build bumps
if [ "$BUMP_TYPE" = "build" ]; then
    TODAY=$(date '+%Y-%m-%d')
    # Find the latest version section and add entry after it
    if [ -f "CHANGE_LOG.md" ]; then
        # Add new entry at the top after the first version section
        sed -i "/^## \[${MAJOR}\.${MINOR}\.0\]/a\\
\\
## [$NEW_VERSION] - $TODAY - Build Update\\
\\
### Changed\\
- Bumped build number to $BUILD\\
" CHANGE_LOG.md
        echo "✓ Updated CHANGE_LOG.md"
    fi
fi

echo ""
echo "Version bump complete: $NEW_VERSION"
echo "Please review the changes and commit:"
echo "  git add ."
echo "  git commit -m \"chore: bump version to $NEW_VERSION\""
echo "  git push"

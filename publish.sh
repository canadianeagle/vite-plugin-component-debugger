#!/bin/bash
# publish.sh - Quick publish script for vite-plugin-component-debugger

set -e  # Exit on error

echo "🚀 Vite Plugin Component Debugger - Quick Publish"
echo "================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed${NC}"
    exit 1
fi

# Check if logged in to npm
echo -n "Checking npm login... "
NPM_USER=$(npm whoami 2>/dev/null || echo "")
if [ -z "$NPM_USER" ]; then
    echo -e "${RED}❌ Not logged in${NC}"
    echo ""
    echo "Please login to npm first:"
    echo "  npm login"
    exit 1
else
    echo -e "${GREEN}✅ Logged in as: $NPM_USER${NC}"
fi

# Check package name availability
PACKAGE_NAME=$(node -p "require('./package.json').name" 2>/dev/null || echo "")
if [ -z "$PACKAGE_NAME" ]; then
    echo -e "${RED}❌ Could not read package.json${NC}"
    exit 1
fi

echo -n "Checking package name availability... "
if npm view "$PACKAGE_NAME" version &>/dev/null; then
    CURRENT_VERSION=$(npm view "$PACKAGE_NAME" version)
    echo -e "${YELLOW}⚠️  Package exists (v$CURRENT_VERSION)${NC}"
    echo ""
    echo "This will update the existing package."
    read -p "Continue? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 0
    fi
else
    echo -e "${GREEN}✅ Package name available${NC}"
fi

# Clean and install
echo ""
echo "📦 Preparing package..."
echo "----------------------"

echo "Cleaning previous builds..."
rm -rf dist node_modules package-lock.json

echo "Installing dependencies..."
npm install

echo "Running tests..."
if npm test; then
    echo -e "${GREEN}✅ Tests passed${NC}"
else
    echo -e "${RED}❌ Tests failed${NC}"
    exit 1
fi

echo "Building package..."
if npm run build; then
    echo -e "${GREEN}✅ Build successful${NC}"
else
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi

# Check git status
echo ""
echo "📋 Git Status"
echo "-------------"
if [ -d .git ]; then
    if [ -n "$(git status --porcelain)" ]; then
        echo -e "${YELLOW}⚠️  You have uncommitted changes${NC}"
        git status --short
        echo ""
        read -p "Commit these changes first? (y/n) " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            read -p "Commit message: " COMMIT_MSG
            git add .
            git commit -m "$COMMIT_MSG"
            echo -e "${GREEN}✅ Changes committed${NC}"
        fi
    else
        echo -e "${GREEN}✅ Working directory clean${NC}"
    fi
else
    echo "Not a git repository (optional)"
fi

# Show what will be published
echo ""
echo "📄 Files to be published:"
echo "------------------------"
npm pack --dry-run 2>&1 | grep -A 100 "Tarball Contents" | grep -B 100 "Tarball Details" | grep "📦" || npm pack --dry-run

# Get current version
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo ""
echo "📌 Current version: $CURRENT_VERSION"

# Ask for version bump
echo ""
echo "Choose version bump:"
echo "  1) Patch (bug fixes)           - $CURRENT_VERSION → $(npm version patch --no-git-tag-version --silent && node -p "require('./package.json').version" && git checkout package.json)"
echo "  2) Minor (new features)         - $CURRENT_VERSION → $(npm version minor --no-git-tag-version --silent && node -p "require('./package.json').version" && git checkout package.json)"
echo "  3) Major (breaking changes)     - $CURRENT_VERSION → $(npm version major --no-git-tag-version --silent && node -p "require('./package.json').version" && git checkout package.json)"
echo "  4) Keep current version"
echo ""
read -p "Select (1-4): " VERSION_CHOICE

case $VERSION_CHOICE in
    1)
        npm version patch
        echo -e "${GREEN}✅ Version bumped to $(node -p "require('./package.json').version")${NC}"
        ;;
    2)
        npm version minor
        echo -e "${GREEN}✅ Version bumped to $(node -p "require('./package.json').version")${NC}"
        ;;
    3)
        npm version major
        echo -e "${GREEN}✅ Version bumped to $(node -p "require('./package.json').version")${NC}"
        ;;
    4)
        echo "Keeping current version"
        ;;
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

NEW_VERSION=$(node -p "require('./package.json').version")

# Final confirmation
echo ""
echo "======================================"
echo "Ready to publish:"
echo "  Package: $PACKAGE_NAME"
echo "  Version: $NEW_VERSION"
echo "  User: $NPM_USER"
echo "======================================"
echo ""

# Check if it's a scoped package
if [[ "$PACKAGE_NAME" == @* ]]; then
    echo -e "${YELLOW}Note: This is a scoped package${NC}"
    echo "It will be published with --access public"
    echo ""
fi

read -p "🚀 Publish now? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "Publishing to npm..."
    
    if [[ "$PACKAGE_NAME" == @* ]]; then
        npm publish --access public
    else
        npm publish
    fi
    
    if [ $? -eq 0 ]; then
        echo ""
        echo -e "${GREEN}✅ Successfully published $PACKAGE_NAME@$NEW_VERSION${NC}"
        echo ""
        echo "View your package at:"
        echo "  https://www.npmjs.com/package/$PACKAGE_NAME"
        echo ""
        
        # Push to git if it exists
        if [ -d .git ]; then
            echo "Pushing to git..."
            git push 2>/dev/null || echo "Could not push to git (no remote?)"
            git push --tags 2>/dev/null || echo "Could not push tags"
        fi
        
        echo ""
        echo "🎉 Congratulations! Your package is now live!"
        echo ""
        echo "Next steps:"
        echo "  - Share on social media"
        echo "  - Create a demo repository"
        echo "  - Add badges to your README"
        echo ""
    else
        echo -e "${RED}❌ Publishing failed${NC}"
        exit 1
    fi
else
    echo "Publishing cancelled"
fi
# Commit Convention for Auto-Release

This repository uses automatic releases based on commit messages. Every push to `main` will trigger a new release.

## Version Bumping Rules

The auto-release workflow determines the version bump type based on your commit message:

### Major Version (1.0.0 → 2.0.0)
Use when making breaking changes:
- `BREAKING CHANGE: removed deprecated API`
- `major: complete rewrite of plugin architecture`

### Minor Version (1.0.0 → 1.1.0)
Use when adding new features:
- `feat: add new configuration option`
- `feature: support for TypeScript 5.0`
- `minor: add custom exclude patterns`

### Patch Version (1.0.0 → 1.0.1)
Default for bug fixes and small changes:
- `fix: resolve memory leak in transformer`
- `docs: update README examples`
- `chore: update dependencies`
- Any other commit message

## Examples

```bash
# Will create a patch release (1.0.0 → 1.0.1)
git commit -m "fix: handle edge case in JSX parsing"

# Will create a minor release (1.0.0 → 1.1.0)
git commit -m "feat: add support for Vue SFC files"

# Will create a major release (1.0.0 → 2.0.0)
git commit -m "BREAKING CHANGE: remove deprecated options"
```

## Skip Auto-Release

To push without creating a release, add `[skip ci]` to your commit message:

```bash
git commit -m "docs: fix typo [skip ci]"
```

## What Happens on Each Push

1. **Tests Run**: Full test suite, linting, and build
2. **Version Bump**: Automatic based on commit message
3. **GitHub Release**: Created with changelog
4. **NPM Publish**: Package published to npm registry
5. **Tags**: Git tags pushed to repository

## Required Secrets

Make sure these secrets are configured in your repository:
- `NPM_TOKEN`: Your npm access token for publishing
- `GITHUB_TOKEN`: Automatically provided by GitHub Actions
# Release Notes

## Requirement

Every release MUST include human-written release notes in `CHANGELOG.md`. These notes must summarize what changed, why it matters, and what users should know before upgrading.

## Format

Use [Keep a Changelog](https://keepachangelog.com/) format:

```markdown
## [version] - YYYY-MM-DD

### Added
- New features

### Changed
- Changes to existing functionality

### Fixed
- Bug fixes

### Security
- Vulnerability fixes (reference CVEs or GHSAs if applicable)

### Removed
- Removed features
```

## Rules

- Release notes MUST NOT be raw git log output
- Each entry should be understandable by a user who hasn't read the code
- Security fixes should reference the advisory ID when available
- The release script should remind the developer to update CHANGELOG.md before tagging

## When Releasing

1. Update `CHANGELOG.md` with the new version section
2. Commit the changelog update as part of the release PR
3. The GitHub Release can reference or duplicate the changelog entry

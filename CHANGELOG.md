# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/).

## [0.1.3] - 2026-07-12

### Security
- Upgraded Electron from v26 to v43, resolving 18 known vulnerabilities (GHSA-6r2x-8pq8-9489, GHSA-vmqv-hx8q-j7mg, GHSA-5rqw-r77c-jp79, and others)
- Updated server dependencies (hono, ws, qs) to fix 12 additional vulnerabilities
- Updated root dependencies (vite, tar, tmp, ws) to resolve known CVEs

### Added
- OpenSSF Scorecard workflow for automated security health scoring
- CodeQL static analysis workflow for JavaScript security scanning
- CI test workflow running on every push and pull request
- Dependabot configuration for automated dependency updates
- SECURITY.md with vulnerability reporting instructions
- Provenance attestation for release artifacts
- CHANGELOG.md for human-readable release notes

### Changed
- Pinned all GitHub Actions to commit SHAs for supply chain security
- Tightened workflow permissions to follow principle of least privilege
- Updated Node.js requirement from 18 to 22.12.0 (required by Electron 43)
- Release workflow no longer auto-publishes from electron-builder; uses separate publish job

### Fixed
- Fixed crash in OAuth token endpoint when request headers are undefined
- Fixed flaky property-based test for speaker impedance admittance threshold

## [0.1.2] - 2026-06-13

Initial public release.

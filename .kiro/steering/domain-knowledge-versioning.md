---
inclusion: fileMatch
fileMatchPattern: "server/domain-knowledge*"
---

# Domain Knowledge Resource Versioning

When modifying the domain knowledge resource file (e.g., `server/domain-knowledge.md`), you MUST increment the version string at the top of the file.

## Rules

- The version uses semver format (e.g., `1.0.0`)
- Increment the PATCH version for small additions or corrections (e.g., `1.0.0` → `1.0.1`)
- Increment the MINOR version for new guidance sections or significant content additions (e.g., `1.0.1` → `1.1.0`)
- Increment the MAJOR version for structural reorganization or removal of existing guidance (e.g., `1.1.0` → `2.0.0`)
- The version string should be on the first line of the file in the format: `<!-- version: X.Y.Z -->`

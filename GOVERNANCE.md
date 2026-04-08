# Governance

This repository is governed by the Conxian Sovereign Autonomous Business (SAB).

This repository is public. Governance rules must be documented without leaking privileged operational details.

## Ownership

- **Repo owners:** defined by `CODEOWNERS`.
- **Policy owners:** changes to governance/security/policy docs must be reviewed by the relevant entries in `CODEOWNERS`. Enforcement depends on branch protection settings (for example, requiring CODEOWNER review).

## Change approval model

All changes land via pull request and require review by the appropriate `CODEOWNERS`.

If GitHub branch protection is configured to require CODEOWNER review, this requirement is enforced by GitHub.

Changes to `CODEOWNERS` itself should be reviewed by the owners defined in the target branch's existing `CODEOWNERS` (or handled via SAB governance for emergency ownership changes).

## Branching

- **`main` branch**: Production branch for the public website.

## Documentation confidentiality (ZSE)

Conxian operates under a Zero Secret Egress (ZSE) mandate.

- Public-safe documentation may live in Git.
- Strategic, legal, operational, and administrative documents that are internal-only must be stored outside of Git (for example: in the Conxian Linear workspace) and referenced from Git with a pointer when needed.

## Policies

- Contributing guidelines: [`CONTRIBUTING.md`](./CONTRIBUTING.md)
- Security policy: [`SECURITY.md`](./SECURITY.md)
- License: [`LICENSE`](./LICENSE) (MIT)

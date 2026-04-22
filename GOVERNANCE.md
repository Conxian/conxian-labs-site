# Governance

This repository is governed by the Conxian Sovereign Autonomous Business (SAB).

This repository is public. Governance rules must be documented without leaking privileged operational details.

## Ownership

- **Repo owners:** defined by `CODEOWNERS`.
- **Policy owners:** changes to governance, security, and documentation-policy files (such as `GOVERNANCE.md`, `SECURITY.md`, and `CONTRIBUTING.md`) must be reviewed by the relevant entries in `CODEOWNERS`. Enforcement depends on branch protection settings (for example, requiring CODEOWNER review).
- **`CODEOWNERS` changes:** updates to `CODEOWNERS` itself should be reviewed by the owners defined in the target branch's existing `CODEOWNERS`.

## Change approval model

All changes land via pull request and require review by the appropriate `CODEOWNERS`.

If GitHub branch protection is configured to require CODEOWNER review, GitHub will enforce this requirement.

## Branching

- **`main` branch**: Production branch for the public website.

## Documentation confidentiality (ZSE)

Conxian operates under a Zero Secret Egress (ZSE) mandate.

- Public-safe documentation may live in Git.
- Strategic, legal, operational, and administrative documents that are internal-only must be stored outside of Git (for example: in the sovereign coordination layer) and referenced from Git with a pointer when needed.

## Policies

- Contributing guidelines: [`CONTRIBUTING.md`](./CONTRIBUTING.md)
- Security policy: [`SECURITY.md`](./SECURITY.md)
- License: [`LICENSE`](./LICENSE) (MIT)

# Governance

This repository is maintained through public GitHub governance for the Conxian Labs site.

This repository is public. Governance rules here are limited to public contribution, review, and policy expectations.

This repository does not define execution authority or lifecycle governance for other Conxian repositories.

## Ownership

- **Repo owners:** defined by `CODEOWNERS`.
- **Policy owners:** changes to governance, security, and documentation-policy files (such as `GOVERNANCE.md`, `SECURITY.md`, and `CONTRIBUTING.md`) must be reviewed by the relevant entries in `CODEOWNERS`. Enforcement depends on branch protection settings (for example, requiring CODEOWNER review).
- **`CODEOWNERS` changes:** updates to `CODEOWNERS` itself should be reviewed by the owners defined in the target branch's existing `CODEOWNERS`.

## Change approval model

All changes land via pull request and require review by the appropriate `CODEOWNERS`.

If GitHub branch protection is configured to require CODEOWNER review, GitHub will enforce this requirement.

## Branching

- **`main` branch**: Production branch for the public website.

## Public documentation boundary

- Public-safe documentation may live in Git.
- Strategic, legal, operational, and administrative material that is internal-only must remain in approved private systems and should not be committed to this repository.

## Policies

- Contributing guidelines: [`CONTRIBUTING.md`](./CONTRIBUTING.md)
- Security policy: [`SECURITY.md`](./SECURITY.md)
- License: [`LICENSE`](./LICENSE) (MIT)

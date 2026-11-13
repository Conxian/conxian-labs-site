# Contributing to Conxian Labs Site

We welcome community contributions that improve the public Conxian Labs site and documentation.

This repository contains the dynamic Node.js/Express web service and public policy documents for Conxian Labs.

## Issue Workflow

1. Find or open a GitHub issue describing the proposed change.
2. Comment on the issue if you plan to work on it to reduce duplicate effort.
3. Submit a pull request with a clear description and linked issue.

## Standards

- Maintain the "Ivory Foundation" aesthetic.
- Ensure WCAG AAA compliance.
- Use 'JetBrains Mono' for all typography.

## Pull Request Process

1. Create a descriptive branch for your change.
2. Link your pull request to the relevant GitHub issue.
3. Request review from the appropriate owners (see `CODEOWNERS`).
4. Ensure the change does not introduce secrets, private keys, or privileged operational details.


## Promotion and release controls

- Feature, fix, documentation, and maintenance PRs target `dev`.
- Only `dev` may promote to `staged`; only `staged` may promote to `main`. Do not retarget or update immutable promotion branches.
- The Branch Promotion Policy check runs from the trusted default branch on PRs to `dev`, `staged`, and `main`. It validates branch route and exact promotion metadata; staged-to-main requires a complete Mainnet Acceptance Evidence Pack.
- Before any staged-to-main merge, confirm the required `Enforce branch promotion rules` status check is green on the exact head (it is configured in the `main` ruleset), a genuine independent review is recorded, and the Mainnet Acceptance Evidence Pack is complete. A green local test run is not a substitute for the required check.
- A deployment signal, HTTP 200, draft conversion, or green build does not constitute production acceptance. Record the exact source, artifact, deployment, health, runtime journey, and independent acceptance evidence.

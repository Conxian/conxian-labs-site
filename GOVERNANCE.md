# Governance

This repository is governed by the Conxian Sovereign Autonomous Business (SAB) framework.

## Ownership & Review

- **Code Ownership:** Defined in `CODEOWNERS`. All changes require a pass from at least one primary owner.
- **Policy Enforcement:** Changes to `GOVERNANCE.md`, `SECURITY.md`, and `CONTRIBUTING.md` are treated as high-impact and require consensus from the SAB lead.
- **Sovereign Controls:** Repository settings, branch protections, and CI gate logic are audited weekly for alignment with the Mainnet-Ready standard.

## Change Approval Model

1. **Proposal:** Issues are tracked in the sovereign coordination layer (Linear).
2. **Implementation:** Via descriptive pull requests linking to the relevant issue.
3. **Verification:** All PRs must pass the institutional design compliance suite (`npm test`).
4. **Finality:** Merges to `main` signify production-ready state.

## Branching Standard

- **main:** Production stable. Strictly protected.
- **feature/*:** Development paths.
- **release/*:** Candidate cutovers for mainnet alignment.

---
*CONXIAN-LABS // 2026 // SOVEREIGN AUTONOMOUS BUSINESS (SAB)*

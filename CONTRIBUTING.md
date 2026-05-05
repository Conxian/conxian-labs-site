# Contributing to Conxian Labs Site

We welcome community contributions that align with our sovereign infrastructure ethos.

This repository contains the static landing page and navigational hub for Conxian Labs.

## Bounty Workflow

Many issues in the Conxian ecosystem are open for community claiming via the sovereign coordination layer or GitHub.

1. Locate an issue with a bounty or community-open status.
2. Follow the claiming instructions provided in the issue description.
3. Submit a Pull Request with a clear description and link it to the relevant Linear issue.

## Design & Engineering Standards

- **Theme:** Maintain the "Ivory Foundation" aesthetic (#FDFBF7 canvas).
- **Typography:** Use 'JetBrains Mono' for all technical and institutional copy.
- **Accessibility:** Ensure **WCAG AAA** compliance for all financial and critical interaction data.
- **Verification:** All UI changes must pass the local Playwright compliance suite (`npm test`).

## Pull Request Process

1. Create a descriptive branch for your change (e.g., `feature/add-nexus-link`).
2. Link your pull request to the relevant Linear issue.
3. Request review from the owners defined in `CODEOWNERS`.
4. **ZSE Mandate:** Ensure the change does not introduce secrets, private keys, or privileged operational details.

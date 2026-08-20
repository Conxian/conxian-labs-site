# Conxian Labs Site

Official website repository for Conxian-Labs.

## About Conxian-Labs

Conxian-Labs is the builder and operator layer around the broader Conxian ecosystem. It maintains the public portfolio, supporting infrastructure, research surfaces, and ecosystem directory that help users, developers, partners, and operators navigate the stack.

Conxian itself is the protocol and DAO-facing layer. Conxian-Labs does not replace protocol ownership; it builds, operates, and supports the surrounding public surfaces that make the ecosystem usable, understandable, and easier to adopt.

## Purpose

Host the Conxian-Labs public site and serve as the portfolio, trust, and discovery surface for the wider Conxian ecosystem.

## Status

**Active public surface.** This repository is maintained as a public information and navigation layer for Conxian-Labs and linked ecosystem repositories.

There are currently **no published GitHub releases** for this repository. Unless and until that changes, it should be understood as a deployment-tracked public site repository rather than a versioned application release surface.

## Audience

Use this repository if you need:

- Conxian-Labs portfolio and public-facing site content
- links to current ecosystem repositories
- governance, contribution, and security policy references
- public trust and discovery material

For protocol implementation, wallet behavior, or service-side engineering, use the owning repository directly.

## Scope

This repository contains the Labs public website, related public content, and trust-policy references. It does not define protocol governance authority, product implementation logic, or private internal operations.

## Governance relation

This repository is maintained by Conxian-Labs as the builder and operator surface around the public Conxian ecosystem. It does not act as the governance authority for the Conxian protocol or DAO.

## Relationship to the Conxian stack

- [`conxian-market`](https://github.com/Conxian/conxian-market) is the active market, liquidity, and asset execution engine.
- [`conxian-gateway`](https://github.com/Conxian/conxian-gateway) is the middleware and integration surface.
- [`conxian-nexus`](https://github.com/Conxian/conxian-nexus) is the synchronization and proof layer.
- [`conxius-wallet`](https://github.com/Conxian/conxius-wallet) is the sovereign wallet and reference client.
- [`conxius-platform`](https://github.com/Conxian/conxius-platform) is the platform and environment scaffolding layer.
- [`conxius-enclave-sdk`](https://github.com/Conxian/conxius-enclave-sdk) and [`lib-conxian-core`](https://github.com/Conxian/lib-conxian-core) provide shared primitives and reusable libraries.
- [`conxian_ui`](https://github.com/Conxian/conxian_ui) is a public interaction and interface layer.
- **[DEPRECATED]** [`Conxian/Conxian`](https://github.com/Conxian/Conxian) is the legacy monolithic repository, now deprecated in favor of modular domain repositories (`conxian-market`, `conxian-gateway`, `conxian-nexus`).

## Naming and branding conventions

- **Conxian** = protocol, DeFi, DAO-facing, and public ecosystem identity.
- **Conxian-Labs** = builder, operator, company, and portfolio identity.
- **Conxius** = product naming used by some application, platform, and wallet repositories.

## Maintenance expectations

- `main` hosts the active public site and policy documents.
- Non-security issues and pull requests are triaged on a best-effort weekly cadence.
- Security reports are acknowledged according to [SECURITY.md](./SECURITY.md).
- Historical branches are not guaranteed ongoing maintenance.

## Deployment posture

- **Authoritative production host**: Render (`conxian-labs-site`), deploying from `main` at `https://www.conxian-labs.com`
- **GitHub Pages**: Retired for this repository. The org-level Pages surface (`conxian.github.io` → `pages.conxian-labs.com`) is a separate concern and does not carry production authority for this site.
- Treat Gateway, Vault/KMS, and Nexus endpoint hostnames mentioned in this repository as planned or non-public unless explicitly marked active.
- If formal GitHub releases are later adopted for the site, keep release notes aligned with deployment guidance so public readers can distinguish code changes from live-site changes.

## Service endpoints

- Public status: Gateway, Vault/KMS, and Nexus endpoint hostnames are currently not publicly active/resolvable and should be treated as planned/non-public endpoints.
- Gateway (planned/non-public): `https://gateway.conxian-labs.com`
- Vault/KMS (planned/non-public): `https://vault.conxian-labs.com`
- Nexus (planned/non-public): `https://nexus.conxian-labs.com`

## Technical architecture

- Static HTML5 / CSS3 / Vanilla JavaScript
- "Ivory Foundation" visual standard
- `JetBrains Mono` typography
- SVG-based repository relationship schematic

## Security

Do not disclose vulnerabilities publicly. Use [SECURITY.md](./SECURITY.md) or `security@conxian-labs.com`.

## Policies

- [CONTRIBUTING.md](./CONTRIBUTING.md)
- [SECURITY.md](./SECURITY.md)
- [CODEOWNERS](./CODEOWNERS)
- [GOVERNANCE.md](./GOVERNANCE.md)
- [LICENSE](./LICENSE)
- [REPO_OWNERSHIP.md](./REPO_OWNERSHIP.md)

## Contact

- General: [info@conxian-labs.com](mailto:info@conxian-labs.com)
- Support: [support@conxian-labs.com](mailto:support@conxian-labs.com)
- Security: [security@conxian-labs.com](mailto:security@conxian-labs.com)

## License

MIT

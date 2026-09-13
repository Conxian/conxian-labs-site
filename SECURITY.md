# Security Policy

## Conxian ZSE Mandate

Conxian operates under a **Zero Secret Egress (ZSE)** mandate. This means:
- No private keys, seed phrases, or sensitive configuration must ever be committed to source control.
- All cryptographic operations are verified to happen within secure contexts (TEE/Enclave).
- Security reporting is prioritized as the highest urgency across all SAB modules.

## Secrets and Environment Configuration

To preserve organizational zero secret egress standards and prevent credential leakage:
- **Non-Commit Policy:** Secret-bearing environment files (`.env`, `.env.local`, `.env.production`, `.env.secrets`, or any `.env.*` file containing credentials) must **NEVER** be committed to version control.
- **Environment Templates:** Use sanitized template files such as `.env.example` to document required environment variables with safe placeholder values.
- **Secret Protection:** Automated pre-commit checks and repository ignore rules strictly block all secret environment file variations.
- **Rotation and Incident Escalation:** If a secret or sensitive token is inadvertently committed, treat it immediately as a security incident. Revoke and rotate the exposed secret immediately, remove it from git history using approved purging protocols, and report the event per the vulnerability guidelines below.

## Support Policy

Security fixes are developed and merged to the default branch (`main`) on a rolling basis.

| Channel | Security fixes |
| --- | --- |
| `main` (default branch) | Yes |
| Other branches/commits | Not actively maintained for security |

## Reporting a Vulnerability

**Do not report security vulnerabilities via public GitHub issues.**

Report vulnerabilities privately using the following channels:

1. **GitHub Private Vulnerability Reporting:** Navigate to the "Security" tab and select "Report a vulnerability".
2. **Encrypted Communication:** Email security@conxian-labs.com. We recommend using PGP for sensitive reports (key available upon request).

### Response SLA
- **Acknowledgement:** Within 48 hours.
- **Initial Triage:** Within 5 business days.
- **Remediation Plan:** Communicated within 10 business days for critical issues.

---
*CONXIAN-LABS // 2026 // SOVEREIGN AUTONOMOUS BUSINESS (SAB)*

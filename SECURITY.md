# Security Policy

## Conxian ZSE Mandate

Conxian operates under a **Zero Secret Egress (ZSE)** mandate. This means:
- No private keys, seed phrases, or sensitive configuration must ever be committed to source control.
- All cryptographic operations are verified to happen within secure contexts (TEE/Enclave).
- Security reporting is prioritized as the highest urgency across all SAB modules.

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

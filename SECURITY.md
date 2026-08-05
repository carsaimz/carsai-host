# Security Policy

CARSAI HOST takes security seriously. This file is a short summary of
our security policy. The full, detailed policy — including threat
model, mitigation catalog, encryption details, and hardening
checklists — lives in
[`packages/docs/SECURITY.md`](packages/docs/SECURITY.md). Operators
and security researchers should read that document in full before
deploying or auditing the platform.

## Reporting a Vulnerability

If you believe you have found a security vulnerability in CARSAI HOST,
**do not open a public GitHub issue**. Instead, report it privately
to **security@carsai.host** with a clear description, reproduction
steps, and your assessment of the impact. You will receive an
acknowledgement within 48 hours and a substantive response within 5
business days. For particularly sensitive reports, encrypt your email
with our PGP key (fingerprint
`9F3C 1A2B 7D8E 4C5A 9B6D 1E2F 3A4B 5C6D 7E8F 9A0B`, available at
https://carsai.host/.well-known/pgp.asc).

We operate a 90-day responsible disclosure window. We will not take
legal action against researchers who act in good faith, avoid harming
users, and give us reasonable time to remediate before publishing. We
are happy to extend the window if a fix turns out to be more complex
than expected — just ask. We do not currently offer a monetary bug
bounty, but we publicly credit researchers in our release notes and
security advisories unless they prefer to remain anonymous.

## Supported Versions

Only the latest minor release of the current major version receives
security patches. The previous minor release receives security
patches for an additional 3 months. Older versions are unsupported
and will not receive fixes — upgrade to a supported version to
benefit from security patches.

| Version | Supported | Until |
|---------|-----------|-------|
| 1.0.x   | Yes       | Current |
| < 1.0   | No        | EOL |

## Security Highlights

The full details are in
[`packages/docs/SECURITY.md`](packages/docs/SECURITY.md). The most
important points:

- **Passwords** are hashed with bcrypt at cost factor 12.
- **JWT access tokens** expire in 15 minutes; **refresh tokens**
  rotate on every use and trigger family-wide revocation on reuse.
- **2FA** is available via TOTP (Google Authenticator, Authy, etc.).
- **FTP passwords** from MOFH are encrypted with AES-256-GCM at rest.
- **Rate limiting** is enforced on auth (5/15min), register (3/hour),
  and globally (100/15min).
- **Audit logs** capture every admin action with IP and metadata;
  the log is append-only and should be exported off-host daily.
- **HTTPS** is enforced in production via HSTS (max-age 2 years).
- **CORS** uses an explicit origin allow-list; no wildcards with
  credentials.

## Contact

- Security reports: **security@carsai.host** (PGP-encrypted preferred
  for sensitive reports).
- General security questions: open a GitHub Discussion with the
  `security` label.
- Code of Conduct reports: **conduct@carsai.host** (separate from
  security reports).

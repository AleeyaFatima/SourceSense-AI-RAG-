# NovaCorp Data Privacy and Security Policy

**Document ID:** SEC-POL-2024-001
**Classification:** Internal — All Employees
**Effective Date:** February 1, 2024
**Last Revised:** January 15, 2025
**Approved By:** David Chen, Chief Information Security Officer

## Purpose

This policy defines how NovaCorp collects, processes, stores, and protects personal data and confidential business information. All employees, contractors, and third-party vendors with access to NovaCorp systems must comply with this policy. Violations may result in disciplinary action up to and including termination.

## Data Classification

NovaCorp classifies all data into four categories:

### Public
Information intended for public distribution. Examples: marketing materials, published blog posts, open-source code, public API documentation. No access restrictions required.

### Internal
Information for internal use that would not cause significant harm if disclosed. Examples: internal meeting notes, project plans, non-sensitive Slack conversations, team wikis. Access restricted to NovaCorp employees and authorized contractors.

### Confidential
Sensitive business information that could cause material harm if disclosed. Examples: financial reports, customer lists, product roadmaps, pricing strategies, vendor contracts, employee compensation data. Access restricted to authorized individuals on a need-to-know basis. Must be encrypted at rest and in transit.

### Restricted
Highly sensitive data subject to regulatory requirements. Examples: personally identifiable information (PII), payment card data (PCI), health records (HIPAA), authentication credentials, encryption keys. Access restricted to specifically authorized individuals. Must be encrypted, access-logged, and subject to regular audits.

## Personal Data Handling

### Collection
NovaCorp collects personal data only for legitimate business purposes and with appropriate legal basis (consent, contract performance, legitimate interest, or legal obligation). The Data Protection Officer must approve any new data collection initiative before implementation.

### Types of Personal Data Collected
- Customer data: name, email, company, job title, usage analytics, support interactions.
- Employee data: name, address, social security number, bank details, emergency contacts, performance reviews.
- Website visitor data: IP address, browser type, pages visited, referral source (collected via anonymized analytics).

### Data Minimization
Collect only the data strictly necessary for the stated purpose. Do not collect "just in case" data. If a field is not required for the current feature or process, do not collect it.

### Retention
- Customer account data: retained for the duration of the customer relationship plus 3 years.
- Financial and billing records: retained for 7 years per tax regulations.
- Employee records: retained for 7 years after termination.
- Server logs: retained for 90 days, then deleted.
- Analytics data: aggregated after 12 months, raw data deleted.

### Deletion
When data reaches the end of its retention period, it must be permanently deleted from all primary databases, backups, and third-party systems within 30 days. The Data Engineering team runs automated deletion jobs monthly and provides compliance reports to the DPO.

## Security Controls

### Encryption
- **At rest**: AES-256 encryption for all databases, file storage (S3 server-side encryption), and backups. Encryption keys managed by AWS KMS with annual key rotation.
- **In transit**: TLS 1.3 required for all communications. TLS 1.2 accepted for legacy integrations only, with a migration deadline of December 2025. HTTP Strict Transport Security (HSTS) enabled with a 1-year max-age.

### Authentication
- All employees must use SSO (Okta) for NovaCorp applications.
- Multi-factor authentication is mandatory for all accounts. Supported methods: hardware security keys (preferred), TOTP authenticator apps, SMS (deprecated, will be removed Q3 2025).
- Service-to-service authentication uses mTLS certificates or JWT tokens signed with RS256.
- Passwords must be at least 16 characters and are checked against the Have I Been Pwned database.

### Access Control
- Role-based access control (RBAC) enforced across all systems.
- Access reviews conducted quarterly by each team lead. Unused access is revoked within 7 days of the review.
- Privileged access (admin, root, production database) requires VP-level approval and is logged in the audit trail.
- Employee offboarding triggers automatic access revocation across all systems within 4 hours.

### Network Security
- Production environment isolated in a private VPC with no direct internet access.
- All external access routed through the API Gateway with WAF (AWS WAF) protection.
- VPN required for access to internal tools from outside the office network.
- Network segmentation between production, staging, and development environments.
- DDoS protection via AWS Shield Advanced.

## Incident Response

### Definition
A security incident is any event that compromises the confidentiality, integrity, or availability of NovaCorp systems or data. Examples: unauthorized access, data breach, malware infection, phishing compromise, service outage caused by a security issue.

### Response Process

1. **Detection** — Automated alerts (SIEM, IDS, anomaly detection) or employee report to #security-incidents Slack channel.
2. **Triage (within 15 minutes)** — Security team assesses severity and scope. Classify as P1 (active breach, data exposed), P2 (attempted breach, no data exposed), or P3 (policy violation, no system compromise).
3. **Containment (within 1 hour for P1)** — Isolate affected systems, revoke compromised credentials, block malicious IPs.
4. **Investigation (within 24 hours)** — Determine root cause, scope of impact, and data affected. Preserve forensic evidence.
5. **Notification (within 72 hours for personal data breaches)** — Notify affected individuals and relevant regulatory authorities per GDPR Article 33. Legal team coordinates external communications.
6. **Recovery** — Restore systems from clean backups, apply patches, and verify integrity.
7. **Post-Incident Review (within 7 days)** — Conduct blameless post-mortem. Document root cause, timeline, impact, and preventive measures. Publish findings to the engineering team.

### Reporting
All employees must report suspected security incidents immediately to the Security team via #security-incidents on Slack or security@novacorp.io. Do not attempt to investigate or remediate on your own. There is no penalty for reporting a false positive.

## Compliance

NovaCorp maintains compliance with:

- **GDPR** — EU General Data Protection Regulation. Data Processing Agreements in place with all sub-processors. Privacy Impact Assessments conducted for new features handling personal data.
- **SOC 2 Type II** — Annual audit by Deloitte covering security, availability, and confidentiality. Last audit completed November 2024 with zero findings.
- **PCI DSS Level 1** — For payment processing through Stripe. NovaCorp does not store card numbers; all payment data handled by Stripe's PCI-compliant infrastructure.
- **CCPA** — California Consumer Privacy Act. Consumers can request data access, deletion, and opt-out of data sales (NovaCorp does not sell personal data).

## Employee Responsibilities

Every NovaCorp employee must:

- Complete annual security awareness training (next deadline: March 31, 2025).
- Use a password manager (1Password, company-provided) for all work accounts.
- Lock their computer when stepping away (auto-lock configured at 5 minutes).
- Report phishing emails using the "Report Phishing" button in Gmail.
- Never share credentials, even with IT support. NovaCorp will never ask for your password.
- Use approved tools only. Do not upload company data to unauthorized cloud services (e.g., personal Google Drive, Dropbox, ChatGPT).

## Third-Party Vendors

All vendors with access to NovaCorp data must:

- Sign a Data Processing Agreement before any data sharing.
- Demonstrate SOC 2 compliance or equivalent security certification.
- Undergo a security assessment by the NovaCorp Security team before onboarding.
- Be reviewed annually for continued compliance.

Current approved vendors are listed in the Vendor Registry on Confluence.

## Contact

- Data Protection Officer: privacy@novacorp.io
- Security Team: security@novacorp.io or #security on Slack
- Security Incidents: #security-incidents on Slack (monitored 24/7)

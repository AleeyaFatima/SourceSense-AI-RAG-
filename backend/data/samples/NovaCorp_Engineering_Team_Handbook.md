# NovaCorp Engineering Team Handbook

**Document ID:** ENG-HB-2024-001
**Maintained By:** Engineering Leadership
**Last Updated:** February 20, 2025

## Our Engineering Culture

NovaCorp Engineering operates on three principles: ship with confidence, own what you build, and make it better than you found it. We are a team of 47 engineers across four squads, and we believe that great products come from engineers who understand both the technology and the customer problem.

## Team Structure

### Platform Squad (8 engineers)
Owns infrastructure, CI/CD, observability, and developer experience. Maintains the deployment pipeline, Kubernetes clusters, monitoring stack, and internal tooling. Led by Marcus Rivera, Staff Engineer.

### Product Squad (14 engineers)
Builds customer-facing features across the web application and API. Organized into two sub-teams: Core (data management, search, collaboration) and Growth (onboarding, activation, billing). Led by Priya Patel, Engineering Manager.

### Data Squad (10 engineers)
Owns the data pipeline, analytics infrastructure, ML models, and reporting. Responsible for data quality, ETL processes, and the recommendation engine. Led by James Okonkwo, Senior Staff Engineer.

### Security Squad (5 engineers)
Manages application security, compliance, vulnerability management, and incident response. Conducts code reviews with a security lens and runs the bug bounty program. Led by Sarah Kim, Security Engineering Lead.

### Shared Services (10 engineers)
Mobile engineering (iOS and Android), QA automation, and technical writing. These engineers embed with product squads for specific projects while maintaining platform-wide standards.

## Development Process

### Planning
We run 2-week sprints with planning on Monday morning and retro on Friday afternoon. Each sprint begins with the Product Manager presenting prioritized work, and the team collectively estimating and committing. We use Jira for tracking, but the sprint board is the source of truth, not the backlog.

### Daily Standups
Async standups via the Geekbot Slack integration at 9:30 AM local time. Each engineer posts: what they shipped yesterday, what they're working on today, and any blockers. If a blocker is identified, the team lead addresses it within 2 hours.

### Code Review
Every change requires at least one approval before merging. Reviewers should respond within 4 business hours. Reviews focus on correctness, readability, test coverage, and security implications — not style preferences (that's what linters are for).

Code review expectations:
- PRs should be small enough to review in 30 minutes. If a PR is >500 lines, break it into smaller PRs.
- The PR description must explain what changed and why. Link the Jira ticket.
- Automated checks (tests, lint, type check, security scan) must pass before requesting review.
- If you disagree with a review comment, discuss it — don't just comply or ignore. The goal is shared understanding.

### Definition of Done
A feature is "done" when:
1. Code is merged to main.
2. Unit and integration tests are written and passing (minimum 85% coverage for new code).
3. The feature works correctly in the staging environment.
4. Documentation is updated (API docs, user-facing help articles, internal wiki).
5. Monitoring and alerting are configured for new endpoints or services.
6. The Product Manager has verified the implementation matches the requirements.

## Technical Standards

### Language and Framework Choices

**Backend:** Python 3.12 with FastAPI. We chose FastAPI for its async support, automatic OpenAPI documentation, and type safety with Pydantic. All new services must use FastAPI. Legacy Flask services are being migrated (target: Q4 2025).

**Frontend:** TypeScript with Next.js 15 (App Router). React 19 for UI components. Tailwind CSS for styling. We do not use CSS-in-JS libraries. All new frontend code must be TypeScript with strict mode enabled.

**Mobile:** Swift (iOS) and Kotlin (Android). We use native development, not cross-platform frameworks. Shared business logic is implemented in the API, not duplicated in mobile clients.

**Infrastructure:** Terraform for infrastructure-as-code. Helm charts for Kubernetes deployments. GitHub Actions for CI/CD. All infrastructure changes go through the same PR review process as application code.

### API Design

All APIs follow REST conventions with these NovaCorp-specific standards:
- Use plural nouns for resource names: `/v2/users`, not `/v2/user`.
- Version the API in the URL path: `/v2/resources`.
- Return consistent error objects: `{ "error": { "code": "ERR_DATA_001", "message": "...", "details": [...] } }`.
- Paginate list endpoints using cursor-based pagination: `?cursor=abc123&limit=25`.
- Include rate limit headers in every response.
- Use ISO 8601 for all date/time fields with UTC timezone.

### Database Conventions
- Table names are plural and snake_case: `user_profiles`, not `UserProfile`.
- Every table has `id` (UUID), `created_at`, and `updated_at` columns.
- Use database migrations (Alembic) for all schema changes. Never modify the schema manually.
- Foreign keys must have indexes. Missing indexes are caught by the CI linter.
- Soft delete using a `deleted_at` timestamp instead of hard delete for any user-facing data.

### Testing Standards
- Unit tests: Jest (frontend), pytest (backend). Cover business logic, edge cases, and error paths.
- Integration tests: Test API endpoints with a real database (Testcontainers for local, dedicated test database in CI).
- E2E tests: Playwright for critical user journeys (login, search, data creation, billing). Run nightly, not on every PR.
- Load tests: k6 scripts for performance-critical endpoints. Run before major releases.

Minimum coverage: 85% for new code, 70% for legacy code under active development.

## Technical Debt Management

We allocate 20% of each sprint to technical debt and maintenance work. This is non-negotiable. Tech debt items are tracked in a dedicated Jira board and prioritized by impact on developer productivity and system reliability.

Categories of tech debt we track:
- **Safety debt:** Security vulnerabilities, missing input validation, inadequate error handling.
- **Velocity debt:** Slow tests, flaky CI, poor local development experience, outdated documentation.
- **Scalability debt:** Unoptimized queries, missing caching, single points of failure.
- **Quality debt:** Low test coverage, duplicated code, inconsistent patterns across services.

## Incident Management

When things go wrong (and they will), we follow this process:

1. **Detect:** Automated alerts or user reports.
2. **Declare:** Post in #incidents with a brief description and severity level.
3. **Respond:** The on-call engineer leads the response. Others join as needed.
4. **Communicate:** Update the status page within 15 minutes for customer-impacting incidents.
5. **Resolve:** Fix the immediate issue. Temporary fixes are acceptable to restore service.
6. **Review:** Conduct a blameless post-mortem within 5 business days. Focus on systemic causes, not individual mistakes. Publish the post-mortem to the entire engineering team.

We measure reliability using:
- **Uptime:** Target 99.95% (allows ~22 minutes of downtime per month).
- **MTTR (Mean Time to Recover):** Target under 30 minutes for P1 incidents.
- **MTTD (Mean Time to Detect):** Target under 5 minutes via automated monitoring.

## Growth and Development

### Engineering Levels

| Level | Title | Scope | Years (typical) |
|-------|-------|-------|-----------------|
| E1 | Junior Engineer | Completes well-defined tasks with guidance | 0-2 |
| E2 | Engineer | Delivers features independently | 2-4 |
| E3 | Senior Engineer | Leads projects, mentors E1-E2, designs systems | 4-7 |
| E4 | Staff Engineer | Drives technical strategy across squads | 7-12 |
| E5 | Senior Staff Engineer | Shapes engineering culture and architecture | 12+ |
| M1 | Engineering Manager | Manages a squad (5-8 engineers) | varies |
| M2 | Senior Engineering Manager | Manages multiple squads | varies |

### Learning and Development Budget
Every engineer has $1,500/year for conferences, courses, books, and certifications. To use it, submit a request in #eng-learning with what you want to do and how it relates to your role. Approvals are fast — most are approved within 24 hours.

### Internal Tech Talks
Every other Thursday at 4 PM, an engineer presents a 30-minute tech talk on something they've built, learned, or explored. Recent topics: "Migrating 2M rows without downtime," "Why we switched from Datadog to Grafana," "Building NovaCorp's ML feature store." Attendance is optional but strongly encouraged. Talks are recorded and posted in #tech-talks.

## Communication Norms

- **Slack** is for async, real-time communication. Respect focus time — don't expect immediate responses.
- **Jira comments** are for decisions and context about specific tickets.
- **Confluence** is for long-lived documentation that needs to be findable later.
- **Email** is for external communication and formal HR/legal matters.
- **Meetings** are the last resort. Before scheduling a meeting, ask: "Could this be a Slack thread or a doc?" If the answer is yes, do that instead.

Core meeting-free blocks: Tuesday and Thursday 9 AM - 12 PM. No meetings should be scheduled during these windows except for incidents.

## Contact

- Engineering Leadership: #eng-leadership on Slack
- Developer Experience issues: #dx-support on Slack
- Engineering hiring: eng-hiring@novacorp.io

# NovaCorp Infrastructure & Deployment Runbook

**Document ID:** ENG-RUN-2024-007
**Maintained By:** Platform Engineering Team
**Last Updated:** April 12, 2025

## Architecture Overview

NovaCorp runs a microservices architecture deployed on AWS across three regions: us-east-1 (primary), eu-west-1 (EU data residency), and ap-southeast-1 (APAC latency optimization). All services are containerized with Docker and orchestrated via Amazon EKS (Kubernetes 1.29).

The platform consists of 14 core services:

- **API Gateway** (Kong): Routes external traffic, handles rate limiting, and terminates TLS.
- **Auth Service**: Manages OAuth 2.0 flows, JWT issuance, and MFA verification.
- **User Service**: Profile management, organization hierarchy, role-based access control.
- **Data Service**: Core CRUD operations for business entities.
- **Search Service**: Elasticsearch 8.x cluster for full-text search and analytics.
- **Notification Service**: Email (SendGrid), SMS (Twilio), push notifications (Firebase).
- **File Service**: Document upload, processing, and storage via S3 with CloudFront CDN.
- **Analytics Service**: Event ingestion, aggregation, and reporting dashboards.
- **Billing Service**: Stripe integration for subscription management and invoicing.
- **Webhook Service**: Outbound event delivery with retry logic and dead-letter queues.
- **ML Pipeline**: Model training, inference endpoints, and feature store.
- **Admin Service**: Internal tools for customer support and operations.
- **Migration Service**: Database schema migrations and data backfill jobs.
- **Health Monitor**: Synthetic monitoring, alerting, and incident escalation.

## Database Infrastructure

### Primary Database
PostgreSQL 15 on Amazon RDS Multi-AZ with read replicas.

- Primary instance: db.r6g.2xlarge (8 vCPU, 64 GB RAM)
- Read replicas: 2x db.r6g.xlarge in each region
- Storage: 2 TB gp3 with 12,000 IOPS provisioned
- Backups: Automated daily snapshots retained for 30 days, point-in-time recovery enabled
- Connection pooling: PgBouncer with 200 max connections per service

### Cache Layer
Redis 7.x on Amazon ElastiCache (cluster mode enabled).

- 3 shards, 2 replicas per shard
- Used for: session storage, rate limiting counters, API response caching (TTL: 5 minutes for list endpoints, 60 seconds for real-time data)
- Memory policy: allkeys-lru with 75% memory threshold alerting

### Search
Elasticsearch 8.11 on Amazon OpenSearch Service.

- 3 master nodes, 6 data nodes (r6g.xlarge)
- Index lifecycle management: hot (7 days) → warm (30 days) → delete (90 days)
- Used for: product search, log aggregation, analytics queries

## Deployment Pipeline

All deployments follow a GitOps workflow through GitHub Actions.

### Branch Strategy
- `main`: Production-ready code. Protected branch requiring 2 approvals.
- `staging`: Pre-production validation. Auto-deploys to staging environment.
- `feature/*`: Individual feature branches. Auto-deploys to ephemeral preview environments.

### Pipeline Stages

1. **Build** (2 min): Compile, lint (ESLint + Prettier), type check (TypeScript strict mode).
2. **Test** (4 min): Unit tests (Jest, >85% coverage required), integration tests (Testcontainers).
3. **Security Scan** (1 min): Snyk dependency check, Trivy container scan, SAST via CodeQL.
4. **Build Image** (2 min): Docker multi-stage build, push to Amazon ECR.
5. **Deploy to Staging** (3 min): Helm chart update, Kubernetes rolling deployment, smoke tests.
6. **Manual Approval Gate**: Required for production deployments. On-call engineer must approve.
7. **Deploy to Production** (5 min): Canary deployment (10% traffic for 15 minutes), automated rollback on error rate >1%.
8. **Post-Deploy** (1 min): Synthetic health checks, Slack notification to #deployments.

Total pipeline time: approximately 18 minutes for staging, 35 minutes for production.

### Rollback Procedure

If a production deployment causes issues:

1. The on-call engineer runs `kubectl rollout undo deployment/<service-name> -n production`.
2. This reverts to the previous container image within 60 seconds.
3. If the database migration is not backward-compatible, follow the migration rollback procedure in the Migration Service documentation.
4. Post an incident in #incidents Slack channel and page the service owner.

## Monitoring and Alerting

### Observability Stack
- **Metrics**: Prometheus + Grafana (self-hosted on EKS)
- **Logs**: Fluent Bit → Amazon OpenSearch → Kibana dashboards
- **Traces**: OpenTelemetry → Jaeger for distributed tracing
- **Uptime**: Checkly synthetic monitoring for critical user journeys

### Alert Tiers

**P1 — Critical (page immediately):**
- API error rate >5% for 5 minutes
- Database connection pool exhaustion
- Payment processing failures
- Authentication service down

**P2 — High (page during business hours, Slack after hours):**
- API latency p99 >2 seconds for 10 minutes
- Search cluster yellow status
- Cache hit rate drops below 80%
- Deployment pipeline blocked for >1 hour

**P3 — Medium (Slack notification, next business day):**
- Disk usage >80% on any node
- Certificate expiring within 14 days
- Dependency vulnerability detected (non-critical)
- Background job queue depth >1000

### On-Call Rotation

Platform Engineering maintains a weekly on-call rotation. The on-call engineer is the first responder for P1 and P2 alerts. Escalation path: On-call → Team Lead → VP Engineering → CTO.

On-call compensation: $500/week flat rate + $200 per P1 incident outside business hours.

## Disaster Recovery

- **RTO (Recovery Time Objective):** 4 hours for full platform recovery
- **RPO (Recovery Point Objective):** 1 hour maximum data loss
- **DR Region:** eu-west-1 serves as the failover region for us-east-1
- **DR Drills:** Conducted quarterly. Last drill (March 2025) achieved full recovery in 2 hours 47 minutes.

### Failover Steps

1. Route53 health check detects primary region failure.
2. Automatic DNS failover routes traffic to eu-west-1 within 60 seconds.
3. Read replicas in eu-west-1 are promoted to primary (5-10 minutes).
4. Platform Engineering verifies service health and data consistency.
5. Customer Communication team sends status page update within 15 minutes.

## Access Control

Infrastructure access follows the principle of least privilege:

- **Production Kubernetes:** Senior engineers and platform team only. Access via AWS SSO + kubectl with RBAC.
- **Production Database:** Read-only access for on-call engineers. Write access requires VP Engineering approval and is logged.
- **AWS Console:** Restricted to platform team. All actions logged in CloudTrail.
- **Secrets Management:** HashiCorp Vault. Secrets rotated every 90 days. No secrets in environment variables or config files.

## Contact

Platform Engineering: #platform-eng on Slack
Incidents: #incidents on Slack or page via PagerDuty
Infrastructure requests: File a Jira ticket in the PLAT project.

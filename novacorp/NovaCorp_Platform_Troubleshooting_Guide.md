# NovaCorp Platform Troubleshooting Guide

**Document ID:** SUP-KB-2024-012
**Maintained By:** Customer Support Engineering
**Last Updated:** March 28, 2025

## Purpose

This guide covers the most common issues reported by NovaCorp platform users and their resolutions. Support agents should consult this guide before escalating tickets to engineering. Engineers should update this guide whenever a new recurring issue is identified.

---

## Account and Authentication Issues

### Problem: "I can't log in to my account"

**Symptoms:** User sees "Invalid credentials" or "Account not found" error on the login page.

**Resolution Steps:**
1. Verify the user is accessing the correct login URL: `https://app.novacorp.io/login`. The staging URL (`staging.novacorp.io`) uses a separate user database.
2. Check if the user's email has a typo. Common: `.con` instead of `.com`, missing characters.
3. Ask the user to reset their password via "Forgot Password" on the login page. The reset link is valid for 24 hours.
4. If password reset email is not received within 5 minutes, check the spam/junk folder. NovaCorp emails come from `no-reply@novacorp.io`.
5. If the user's account was recently created, verify in the admin panel that the account activation email was sent and the user completed activation.
6. For SSO users: confirm their identity provider (Okta, Azure AD, Google Workspace) is correctly configured in the organization settings.

**Escalation:** If none of the above resolves the issue, file a ticket to the Auth Service team with the user's email and organization ID.

### Problem: "I'm getting logged out every few minutes"

**Symptoms:** User is redirected to the login page repeatedly during active use.

**Root Cause:** This typically occurs when the user's browser blocks third-party cookies, which prevents the refresh token from being stored.

**Resolution:**
1. Ask the user to add `*.novacorp.io` to their browser's cookie allowlist.
2. If using Safari, disable "Prevent cross-site tracking" in Privacy settings.
3. If the issue persists, the user may be behind a corporate proxy that strips authentication cookies. Coordinate with their IT team to whitelist NovaCorp domains.
4. As a temporary workaround, the user can enable "Remember me" on the login page, which uses a long-lived token stored in localStorage instead of cookies.

### Problem: "MFA setup is not working"

**Symptoms:** User scans the QR code with their authenticator app but the verification code is rejected.

**Resolution:**
1. The most common cause is clock drift. Ask the user to enable automatic time sync on their phone (Settings → General → Date & Time → Set Automatically).
2. If using Google Authenticator, ensure the app has been updated to the latest version. Older versions have known sync issues.
3. Try an alternative authenticator app: Authy or Microsoft Authenticator.
4. If the user lost access to their authenticator, an organization admin can reset MFA from the Admin Panel → Users → Select User → Security → Reset MFA.

---

## Data and Search Issues

### Problem: "Search is returning no results or irrelevant results"

**Symptoms:** User searches for a term they know exists in their data, but the search returns empty or unrelated results.

**Resolution:**
1. Check if the data was recently uploaded. New data takes up to 5 minutes to be indexed by the search service. The user can check indexing status in Settings → Data → Indexing Status.
2. Verify the user has permission to view the data they're searching for. Search results respect RBAC — a user will not see results from data they don't have access to.
3. Try the exact phrase in quotes: `"quarterly revenue report"` instead of `quarterly revenue report`.
4. Check if the data source connector is healthy in Settings → Integrations. A disconnected data source will not appear in search results.
5. If the user's organization uses multiple workspaces, confirm they're searching in the correct workspace.

**Escalation:** If the data exists, the user has access, and the connector is healthy, file a ticket to the Search Service team. Include the search query, expected result, user ID, and organization ID.

### Problem: "Data sync from external sources is failing"

**Symptoms:** Connected data sources (Google Drive, Confluence, Notion, SharePoint) show "Sync Failed" status.

**Resolution:**
1. Re-authenticate the connector: Settings → Integrations → Select Source → Reconnect. OAuth tokens expire after 90 days for most providers.
2. Check if the external service is experiencing an outage. Links to status pages: Google (status.cloud.google.com), Atlassian (status.atlassian.com), Microsoft (status.office.com).
3. Verify the connected account still has access to the files/spaces being synced. If the user's permissions in the external tool changed, the sync will fail for newly restricted content.
4. For large syncs (>10,000 documents), the sync may time out. Break the sync into smaller batches by connecting specific folders or spaces instead of the entire account.

---

## Performance Issues

### Problem: "The dashboard is loading slowly"

**Symptoms:** Dashboard takes more than 5 seconds to load or shows a loading spinner indefinitely.

**Resolution:**
1. Check the NovaCorp status page at `status.novacorp.io` for any ongoing incidents.
2. Ask the user to hard-refresh the page (Ctrl+Shift+R on Windows, Cmd+Shift+R on Mac) to clear cached assets.
3. If the user has a large dataset (>50,000 records), the dashboard aggregation queries may be slow. Recommend they use date filters to narrow the dashboard time range.
4. Check if the user has browser extensions that interfere with the application. Ad blockers and privacy extensions sometimes block API calls to NovaCorp endpoints. Ask the user to try in an incognito/private window.
5. For consistently slow performance, check the user's organization tier. Free tier organizations share compute resources and may experience throttling during peak hours (9 AM - 11 AM EST).

### Problem: "API requests are timing out"

**Symptoms:** API consumers receive 504 Gateway Timeout errors.

**Resolution:**
1. Check the user's request payload size. The maximum request body is 10 MB. For file uploads, use the chunked upload endpoint instead.
2. Verify the user is not exceeding rate limits. Rate limit headers (`X-RateLimit-Remaining`, `X-RateLimit-Reset`) are included in every response.
3. For batch operations, recommend using the async batch API (`POST /v2/batch`) which processes requests in the background and delivers results via webhook.
4. If timeouts are intermittent, check if the user is hitting a specific endpoint consistently. Some analytics endpoints have longer processing times and a 60-second timeout instead of the standard 30-second timeout.

---

## Billing and Subscription Issues

### Problem: "I was charged after canceling my subscription"

**Symptoms:** User sees a charge on their credit card after canceling.

**Resolution:**
1. NovaCorp subscriptions are billed at the beginning of each billing cycle. If the user canceled mid-cycle, they have access until the end of the current period but will not be charged again.
2. Check the cancellation date in Admin Panel → Billing → Subscription History. If the cancellation was processed after the billing date, the charge is for the current cycle and is valid.
3. If the user canceled before the billing date and was still charged, this is a billing error. Process a refund through Stripe Dashboard and notify the Billing Service team.
4. Overage charges (additional users, storage, API calls beyond plan limits) are billed separately and may appear even after cancellation if they occurred during the active subscription period.

### Problem: "I can't update my payment method"

**Symptoms:** User receives an error when trying to add or update a credit card.

**Resolution:**
1. NovaCorp uses Stripe for payment processing. The card must support 3D Secure authentication. Some prepaid cards and virtual cards do not support this.
2. Ask the user to try a different browser. Some browser privacy settings block the Stripe payment iframe.
3. If the user is in a region with Strong Customer Authentication (SCA) requirements (EU), they may need to approve the card addition through their bank's app.
4. Organization billing can only be updated by users with the "Billing Admin" role. Verify the user's role in Admin Panel → Users.

---

## Integration Issues

### Problem: "Webhook deliveries are failing"

**Symptoms:** Events configured to be sent to the user's webhook URL are showing "Failed" status in the webhook logs.

**Resolution:**
1. Verify the webhook URL is accessible from the public internet. NovaCorp cannot deliver webhooks to localhost or private network addresses.
2. The endpoint must respond with a 2xx status code within 10 seconds. If processing takes longer, return 200 immediately and process the payload asynchronously.
3. Check if the endpoint requires authentication. If so, configure webhook signing in Settings → Webhooks → Select Webhook → Signing Secret. NovaCorp signs all webhook payloads with HMAC-SHA256.
4. Failed webhooks are retried 5 times with exponential backoff (1 min, 5 min, 30 min, 2 hours, 24 hours). After 5 failures, the webhook is disabled and the admin is notified via email.
5. Review the webhook logs (Settings → Webhooks → Delivery History) to see the exact error: connection refused, timeout, 4xx/5xx response, or TLS error.

### Problem: "Slack integration is not posting notifications"

**Symptoms:** NovaCorp notifications configured to post to a Slack channel are not appearing.

**Resolution:**
1. The Slack bot must be re-authorized if someone removed it from the channel. Go to Settings → Integrations → Slack → Reconnect.
2. Verify the bot has been invited to the target channel. In Slack, type `/invite @NovaCorp Bot` in the channel.
3. If the organization uses Slack Enterprise Grid, ensure the bot is approved at the organization level, not just the workspace level.
4. Check if notification filters are too restrictive. In Settings → Notifications → Slack, verify the event types and severity levels that trigger notifications.

---

## Common Error Messages Reference

| Error Message | Meaning | Action |
|---------------|---------|--------|
| `ERR_AUTH_001` | Invalid or expired token | Re-authenticate or refresh the token |
| `ERR_AUTH_002` | MFA verification required | Complete MFA challenge |
| `ERR_AUTH_003` | Account locked (5 failed attempts) | Wait 30 minutes or contact admin |
| `ERR_DATA_001` | Record not found | Verify the resource ID and permissions |
| `ERR_DATA_002` | Duplicate record | A record with this unique identifier already exists |
| `ERR_DATA_003` | Validation error | Check the response body for field-level error details |
| `ERR_RATE_001` | Rate limit exceeded | Wait and retry with exponential backoff |
| `ERR_INTG_001` | Integration connection failed | Re-authenticate the integration |
| `ERR_INTG_002` | Webhook delivery failed | Check endpoint availability and response time |
| `ERR_BILL_001` | Payment method declined | Try a different card or contact bank |

## Contact

- Support Portal: `https://support.novacorp.io`
- Urgent Issues: support@novacorp.io (SLA: 4 hours for P1, 24 hours for P2)
- Community Forum: `https://community.novacorp.io`
- Slack: #customer-support (internal), #novacorp-community (external)

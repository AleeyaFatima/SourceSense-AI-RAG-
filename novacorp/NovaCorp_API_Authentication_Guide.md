# NovaCorp API Authentication Guide

## Overview

NovaCorp uses OAuth 2.0 with JWT tokens for all API authentication. Every request to the NovaCorp platform API must include a valid Bearer token in the Authorization header. Tokens are issued by the NovaCorp Identity Service at `https://auth.novacorp.io/oauth/token`.

## Getting Started

### Step 1: Register Your Application

Before making API calls, register your application in the NovaCorp Developer Portal at `https://developers.novacorp.io`. During registration, you will receive a `client_id` and `client_secret`. Store these securely — the client secret is shown only once and cannot be recovered.

### Step 2: Obtain an Access Token

Send a POST request to the token endpoint:

```
POST https://auth.novacorp.io/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials
&client_id=YOUR_CLIENT_ID
&client_secret=YOUR_CLIENT_SECRET
&scope=read:data write:data
```

The response includes an access token valid for 3600 seconds (1 hour):

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "read:data write:data"
}
```

### Step 3: Use the Token

Include the token in every API request:

```
GET https://api.novacorp.io/v2/resources
Authorization: Bearer eyJhbGciOiJSUzI1NiIs...
```

## Token Refresh

Access tokens expire after 1 hour. If you requested the `offline_access` scope during initial authorization, you will also receive a `refresh_token`. Use it to obtain a new access token without re-authenticating:

```
POST https://auth.novacorp.io/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token
&refresh_token=YOUR_REFRESH_TOKEN
&client_id=YOUR_CLIENT_ID
```

Refresh tokens are valid for 30 days. After expiration, the user must re-authenticate through the full OAuth flow.

## Scopes

NovaCorp defines the following permission scopes:

- `read:data` — Read access to all data endpoints
- `write:data` — Create, update, and delete data
- `read:users` — Access user profile information
- `admin:org` — Organization-level administrative actions
- `read:analytics` — Access analytics and reporting endpoints
- `write:webhooks` — Create and manage webhook subscriptions

Request only the scopes your application needs. The principle of least privilege reduces the impact of a compromised token.

## Rate Limiting

All API endpoints are rate-limited. The current limits are:

- Standard tier: 100 requests per minute per client
- Professional tier: 500 requests per minute per client
- Enterprise tier: 2000 requests per minute per client

When you exceed the rate limit, the API returns HTTP 429 with a `Retry-After` header indicating how many seconds to wait before retrying.

## Error Codes

| Code | Meaning | Resolution |
|------|---------|------------|
| 401  | Invalid or expired token | Refresh your token or re-authenticate |
| 403  | Insufficient scope | Request additional scopes during authorization |
| 429  | Rate limit exceeded | Wait for the duration specified in Retry-After |
| 500  | Internal server error | Retry with exponential backoff; contact support if persistent |

## Security Best Practices

1. Never embed client secrets in client-side code or mobile applications. Use the Authorization Code flow with PKCE for public clients.
2. Rotate client secrets every 90 days through the Developer Portal.
3. Use short-lived access tokens (1 hour default) and refresh tokens for long-running processes.
4. Validate JWT tokens server-side by checking the signature against NovaCorp's public JWKS endpoint at `https://auth.novacorp.io/.well-known/jwks.json`.
5. Always use HTTPS. The API rejects plaintext HTTP requests.
6. Implement token revocation when a user logs out by calling `POST https://auth.novacorp.io/oauth/revoke`.

## Multi-Factor Authentication

For endpoints that access sensitive data (financial records, PII), NovaCorp enforces step-up authentication. The API will return a 403 with a `mfa_required` error code. Your application must redirect the user to complete MFA verification before retrying the request.

Supported MFA methods: TOTP (authenticator app), SMS verification, hardware security keys (WebAuthn/FIDO2).

## Contact

For authentication issues, contact the NovaCorp Identity Team at identity-support@novacorp.io or open a ticket in the Developer Portal.

# Security Compliance & Auditing Standards

This document establishes the official security compliance standards, credentials rotation policies, and database backup routines for SourceSense AI.

## 1. Authentication and Identity Management
All personnel must authenticate using Multi-Factor Authentication (MFA). Password credentials must meet the minimum standard of 12 characters, combining upper case, lower case, numeric digits, and special characters. Secret passwords must be encrypted using SHA-256 hash algorithms.

## 2. API Key Management
Third-party API credentials, including OpenAI and Anthropic API keys, are stored in encrypted environment variables. Key rotation must occur every 90 days. Active keys are managed through secure access controls.

## 3. Database Backup Schedules
Production databases (including SQLite and Neon PostgreSQL) are backed up automatically. The backup schedule runs daily at exactly 02:00 UTC. Backups are encrypted using AES-GCM-256 standard and stored in offsite geo-replicated containers. Backups are retained for 30 days.

## 4. Security Patching and Vulnerability Rotation
Critical patches for operational environments, databases, and dependencies must be applied within 72 hours of publication. General software vulnerability updates are reviewed and rotated every 30 days during maintenance windows.

# Changelog

## 2026-11-01 — Review hardening

- **Persistent demo APIs fail closed on production builds.** `/api/messages`, `/api/plans` and `/api/abroad` return 503 until authenticated access exists. Local Vite's in-memory test boards remain available. This trades deployed shared-board functionality for privacy and integrity until authorization is implemented.
- **Cloud AI calls are rate limited.** Production `/api/doctor`, `/api/agent` and `/api/tts` use a Redis-backed counter keyed by a hash of Vercel's client IP. Defaults: 12, 60 and 120 requests per hour, respectively. Missing Redis credentials, an unavailable rate-limit store, or a missing trusted IP fails closed in production. These limits are abuse controls, not identity checks.
- **Crop Doctor asks before cloud review.** A per-image checkbox discloses that the resized photo and displayed field details can be sent to the configured cloud provider. A separate offline action does not send the photo for AI review. The page describes removal of EXIF GPS and omission of the farmer's name.
- **Deployment headers added.** Vercel serves `nosniff`, frame denial, referrer and permissions policy headers. A restrictive Content Security Policy remains pending provider inventory and staging verification.
- **Tests added.** Rate-limit behavior and production storage guards now have regression tests. The Dream game's AudioContext cleanup regression fix from this review is also covered by a test.
- **Documentation updated.** Security boundaries, deployment dependencies, limits and outstanding external validation are recorded in `docs/SECURITY.md`; review changes are indexed here.

## Known limitations

- Account login, server-side role/resource authorization and an audit system for real users remain unimplemented. Persistent shared data APIs are intentionally unavailable in production until they are added.
- Rate limits count IP addresses, not people; shared networks can reach the limit together. Configure Vercel Firewall rules too and evaluate real traffic before selecting final thresholds.
- No external model accuracy evaluation, local agronomist review, farmer study, or low-end Android performance benchmark is represented as complete.

# Security and deployment status

This is an honest snapshot of the controls in this repository. It is not a penetration-test report or a production security certification.

## Current controls

- Server credentials are read from server-side environment variables; do not use a `VITE_` prefix.
- Hosted Vercel calls to `/api/doctor`, `/api/agent` and `/api/tts` use a Redis-backed per-client-IP counter. The default limits are 12 crop-photo reviews, 60 agent turns and 120 speech requests per hour. The limiter hashes the Vercel-provided client IP before using it in a Redis key, sends `Retry-After` on a limit response, and fails closed if its store or trusted IP header is unavailable.
- These AI limits are abuse and cost controls, **not user authentication**. A shared IP can represent several people, and a determined caller can use another IP. Configure Vercel Firewall rules as an additional deployment control for the AI routes; Vercel documents those controls at [WAF rate limiting](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting).
- The production Vercel configuration adds `nosniff`, frame denial, a referrer policy and a permissions policy. It does not yet define a Content Security Policy; the app's mapping, imagery and model providers need an audited allowlist before one can be safely enforced.
- Crop photo review asks for per-image consent before sending the resized photo and displayed field context to a configured cloud AI service. EXIF GPS metadata is removed in the browser; the model request does not include the farmer's name. The offline check runs locally.

## Persistent user data is disabled in production

The farmer and officer accounts in this prototype are selectable sample accounts, not authenticated identities. For that reason, `/api/messages`, `/api/plans` and `/api/abroad` return 503 in hosted Vercel deployments and production builds even if Upstash Redis is configured. This prevents an accidentally configured public database from exposing or accepting unverified messages, plans or advice. The local Vite stand-ins remain in-memory and are for development only.

Do not remove this production guard until the app has real sign-in, server-side session verification, role and resource authorization (including per-farmer message reads and officer scope), audit logging, and tests for cross-account access. The current UI's Chakra Agent permissions are client-side product rules and do not replace server authorization.

## Required before a real deployment

1. Add an identity provider and enforce its signed sessions in every API route; authorize each read and write against the authenticated farmer or officer's scope.
2. Configure Vercel Firewall rate limits for `/api/doctor`, `/api/agent` and `/api/tts`; monitor them with real traffic and tune for shared office and household networks.
3. Configure server-only Gemini/Anthropic keys and Upstash REST credentials. With `NODE_ENV=production`, cloud AI calls return 503 if the durable rate-limit store is unavailable. The in-memory Vite demo does not exercise production Redis behavior.
4. Add and test a restrictive Content Security Policy, CSP reporting, dependency scanning, secret scanning, and API integration tests against a staging deployment.
5. Complete a privacy review for photo retention and provider terms, agronomist review for crop guidance, and consented farmer/officer usability tests.

No user account system, per-user server authorization, production API penetration test, or external security audit has been completed in this repository.

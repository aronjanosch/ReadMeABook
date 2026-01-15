# Testing

**Status:** ⏳ In Progress | Backend unit testing framework (Vitest)

## Overview
Unit tests for backend logic with isolated mocks (Prisma, integrations, queue).

## Key Details
- **Runner:** Vitest (`vitest.config.ts`, Node environment)
- **Setup:** `tests/setup.ts` sets `NODE_ENV=test`, `TZ=UTC`, blocks unmocked fetch
- **Helpers:** `tests/helpers/prisma.ts`, `tests/helpers/job-queue.ts`
- **GitHub Actions:** Manual workflow `.github/workflows/manual-tests.yml` runs `npm test`
- **Coverage:** `npm run test:coverage` (reports in `coverage/`)
- **Scope:** Backend unit tests only; no real network or services

## API/Interfaces
```
npm run test
npm run test:watch
npm run test:coverage
```

## Critical Issues
- API route unit tests are incomplete; add route-level mocks before enforcing coverage.

## Related
- [backend/services/jobs.md](backend/services/jobs.md)
- [backend/services/scheduler.md](backend/services/scheduler.md)

# Migracao para Coolify VPS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrar o `formulario-credfacil` da Vercel para uma VPS Hostinger com Coolify usando um unico container Next.js standalone, com checklist de ambiente, smoke tests e rollback.

**Architecture:** O app permanece full-stack em Next.js: paginas e rotas `app/api/*` rodam no mesmo processo Node.js dentro do container. Coolify cuida de build, deploy, proxy HTTPS, variaveis e restart; MongoDB Atlas, Cloudflare R2, Gemini, AWS Rekognition, SMTP, Telegram, Chatwoot e Meta continuam externos.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5, npm, Docker multi-stage, Coolify, MongoDB Atlas, Cloudflare R2, Google Gemini, AWS Rekognition.

---

## Execution Status

**Last execution:** 2026-05-24
**Commit policy:** Changes applied locally only; commit steps intentionally skipped by user request.

| Task | Status | Notes |
| --- | --- | --- |
| T1 | Done | `.dockerignore` created and visible in `git status`; `.env.local` is not staged. |
| T2 | Done | `Dockerfile` created. `docker build -t formulario-credfacil:coolify .` completed successfully after adding a builder-stage dummy `MONGODB_URI`. |
| T3 | Done with isolated verification | `app/api/health/route.ts` created. `npx eslint app/api/health/route.ts` passed. Full `npm run lint` is blocked by pre-existing lint errors outside this migration. |
| T4 | Done | `.env.example` updated with Coolify notes; `.env.local.example` normalized to `META_ACCESS_TOKEN`. |
| T5 | Done | `deploy-runbook.md` created. |
| T6 | Done for Docker path | Docker build completed. Container started locally and `/api/health` returned HTTP 200 when `NEXT_PUBLIC_BASE_URL` was provided. Full `npm run lint` remains blocked by pre-existing lint errors outside the migration. |
| T7 | Pending external action | Requires Coolify UI, VPS/DNS access and Docker image build in the target environment. |

---

## File Structure

| Path | Action | Responsibility |
| --- | --- | --- |
| `Dockerfile` | Create | Build and run Next.js standalone image on port `3000`. |
| `.dockerignore` | Create | Keep local caches, secrets and build artifacts out of Docker context. |
| `app/api/health/route.ts` | Create | Lightweight HTTP health endpoint for Coolify and manual smoke tests. |
| `.env.example` | Modify | Add deploy/Coolify notes and normalize Meta env naming if needed. |
| `.specs/features/migracao-coolify-vps/deploy-runbook.md` | Create | Operator runbook for Coolify setup, envs, DNS, validation and rollback. |
| `.specs/project/STATE.md` | Modify | Record the migration plan and current operational decision. |

---

## Execution Plan

### Phase 1: Deploy Artifact Foundation (Sequential)

```text
T1 -> T2 -> T3
```

### Phase 2: Configuration and Operations (Parallel after T3)

```text
T3 -> T4 [P]
T3 -> T5 [P]
```

### Phase 3: Verification and Handoff (Sequential)

```text
T4 + T5 -> T6 -> T7
```

---

## Task Breakdown

### T1: Create Docker ignore

**What**: Add a Docker context filter that excludes local dependencies, caches, env files and generated build output.
**Where**: `.dockerignore`
**Depends on**: None
**Reuses**: Existing `.gitignore` intent.

**Tools**:

- MCP: filesystem
- Skill: token-efficiency

- [ ] **Step 1: Create `.dockerignore`**

Create `formulario-credfacil/.dockerignore` with:

```dockerignore
.git
.next
node_modules
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

.env
.env.*
!.env.example
!.env.local.example

coverage
dist
build
*.tsbuildinfo

.claude
.specs
README.md
```

- [ ] **Step 2: Verify Docker context ignores local secrets**

Run:

```bash
git status --short .dockerignore
```

Expected: `.dockerignore` appears as a new file and no `.env.local` is staged.

- [ ] **Step 3: Commit**

```bash
git add .dockerignore
git commit -m "chore: add docker ignore for coolify deploy"
```

---

### T2: Create Next.js standalone Dockerfile

**What**: Add a multi-stage Dockerfile that builds with npm and runs `.next/standalone/server.js`.
**Where**: `Dockerfile`
**Depends on**: T1
**Reuses**: `package-lock.json`, `npm run build`, `next.config.ts` `output: 'standalone'`.

**Tools**:

- MCP: filesystem
- Skill: token-efficiency

- [ ] **Step 1: Create `Dockerfile`**

Create `formulario-credfacil/Dockerfile` with:

```dockerfile
FROM node:22-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
```

- [ ] **Step 2: Build the image locally**

Run:

```bash
docker build -t formulario-credfacil:coolify .
```

Expected: build completes and prints a final image id. If it fails on `pdf-to-img` or native system libraries, add the minimum Debian packages in the `base` stage and rerun this same command.

- [ ] **Step 3: Run the image locally with a minimal env file**

Create a temporary local-only env file outside git or reuse `.env.local`; do not commit secrets.

Run:

```bash
docker run --rm --env-file .env.local -p 3000:3000 formulario-credfacil:coolify
```

Expected: logs show the server listening on `0.0.0.0:3000`.

- [ ] **Step 4: Commit**

```bash
git add Dockerfile
git commit -m "chore: add standalone dockerfile for coolify"
```

---

### T3: Add health endpoint

**What**: Add a lightweight route handler for Coolify health checks and manual smoke tests.
**Where**: `app/api/health/route.ts`
**Depends on**: T2
**Reuses**: Existing App Router route handler pattern.

**Tools**:

- MCP: filesystem
- Skill: token-efficiency

- [ ] **Step 1: Create the route file**

Create `formulario-credfacil/app/api/health/route.ts` with:

```typescript
import { NextResponse } from 'next/server';

const REQUIRED_ENV_VARS = [
  'MONGODB_URI',
  'JWT_SECRET',
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET_NAME',
  'GEMINI_API_KEY',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_REGION',
  'NEXT_PUBLIC_BASE_URL',
] as const;

export const dynamic = 'force-dynamic';

export function GET() {
  const missing = REQUIRED_ENV_VARS.filter((name) => !process.env[name]);

  return NextResponse.json(
    {
      ok: missing.length === 0,
      service: 'formulario-credfacil',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'unknown',
      missingEnv: missing,
    },
    { status: missing.length === 0 ? 200 : 503 },
  );
}
```

- [ ] **Step 2: Verify route compiles**

Run:

```bash
npm run lint
```

Expected: lint completes without errors introduced by `app/api/health/route.ts`.

- [ ] **Step 3: Verify route in the Docker container**

Run the container with `.env.local`, then in another terminal run:

```bash
curl http://localhost:3000/api/health
```

Expected with complete env: HTTP 200 and JSON with `"ok":true`. Expected with missing env: HTTP 503 and `missingEnv` listing only variable names.

- [ ] **Step 4: Commit**

```bash
git add app/api/health/route.ts
git commit -m "chore: add health endpoint for coolify"
```

---

### T4: Update environment documentation

**What**: Make `.env.example` the single checklist source for Coolify and fix any naming mismatch used by code.
**Where**: `.env.example`
**Depends on**: T3
**Reuses**: Existing env comments and `rg "process.env"`.

**Tools**:

- MCP: filesystem
- Skill: token-efficiency

- [ ] **Step 1: Audit env names used by code**

Run:

```bash
rg "process\.env\.([A-Z0-9_]+)" app lib middleware.ts -o
```

Expected: every env name from code appears in `.env.example`. Pay special attention to `META_ACCESS_TOKEN`; both env example files must use the same name read by the code.

- [ ] **Step 2: Update `.env.example` deploy notes**

Add this section near the app configuration block:

```dotenv
# =============================================================================
# COOLIFY / VPS
# =============================================================================

# Coolify deve expor o container na porta 3000.
# Configure as variaveis no painel do Coolify, nao em arquivos versionados.
# Base directory do app no monorepo: formulario-credfacil
# Health check: /api/health
PORT=3000
HOSTNAME=0.0.0.0
```

- [ ] **Step 3: Normalize Meta token docs if needed**

Ensure the Meta block uses the code-backed name:

```dotenv
META_PIXEL_ID=
META_ACCESS_TOKEN=
```

Do not introduce an alternate Meta CAPI token variable unless the code is also changed to read it.

- [ ] **Step 4: Verify no missing env docs**

Run:

```bash
rg "MONGODB_URI|JWT_SECRET|R2_ACCOUNT_ID|R2_ACCESS_KEY_ID|R2_SECRET_ACCESS_KEY|R2_BUCKET_NAME|GEMINI_API_KEY|AWS_ACCESS_KEY_ID|AWS_SECRET_ACCESS_KEY|AWS_REGION|SMTP_HOST|SMTP_PORT|SMTP_USER|SMTP_PASS|EMAIL_FROM|TELEGRAM_BOT_TOKEN|TELEGRAM_CHAT_ID|CHATWOOT_API_URL|CHATWOOT_API_TOKEN|META_PIXEL_ID|META_ACCESS_TOKEN|NEXT_PUBLIC_BASE_URL" .env.example
```

Expected: all required names appear exactly once or in the correct documented block.

- [ ] **Step 5: Commit**

```bash
git add .env.example
git commit -m "docs: document coolify environment variables"
```

---

### T5: Create Coolify deploy runbook

**What**: Add an operator runbook covering Coolify setup, DNS, validation, rollback and worker extraction criteria.
**Where**: `.specs/features/migracao-coolify-vps/deploy-runbook.md`
**Depends on**: T3
**Reuses**: `.env.example`, `.specs/codebase/INTEGRATIONS.md`, this feature design.

**Tools**:

- MCP: filesystem
- Skill: tlc-spec-driven, token-efficiency

- [ ] **Step 1: Create the runbook**

Create `.specs/features/migracao-coolify-vps/deploy-runbook.md` with:

```markdown
# Coolify VPS Deploy Runbook

## Deployment Shape

- Project: `formulario-credfacil`
- Branch: `feature/validacao-documentos-ia` until merge, then production branch
- Base directory: `formulario-credfacil`
- Build pack: Dockerfile
- Exposed port: `3000`
- Start command: Dockerfile default, `node server.js`
- Health check path: `/api/health`

## Required Environment Variables

Copy values from the current Vercel project or secret manager into Coolify Environment Variables:

- `MONGODB_URI`
- `JWT_SECRET`
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`
- `GEMINI_API_KEY`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`
- `EMAIL_FROM`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`
- `CHATWOOT_API_URL`
- `CHATWOOT_API_TOKEN`
- `META_PIXEL_ID`
- `META_ACCESS_TOKEN`
- `NEXT_PUBLIC_BASE_URL`

Set `NEXT_PUBLIC_BASE_URL` to the final HTTPS domain without a trailing slash.

## Coolify Setup

1. Create a new application in Coolify from the Git repository.
2. Set base directory to `formulario-credfacil`.
3. Select Dockerfile build.
4. Confirm exposed port `3000`.
5. Add all environment variables.
6. Deploy using a temporary Coolify domain first.
7. Open `/api/health` and confirm HTTP 200.

## DNS Cutover

1. Keep the Vercel deployment active during staging validation.
2. Lower DNS TTL before go-live if possible.
3. Point the production domain to Coolify only after the manual checklist passes.
4. Confirm HTTPS certificate is active in Coolify.
5. Re-test `/`, `/login`, `/documentos`, `/status` and `/api/health`.

## Manual Validation Checklist

- [ ] `/api/health` returns HTTP 200.
- [ ] Home form loads on mobile and desktop.
- [ ] New candidate can submit the public form.
- [ ] Existing CPF flow redirects correctly.
- [ ] Candidate can register/login.
- [ ] Password recovery email sends through SMTP.
- [ ] Document upload creates presigned R2 URL and stores files.
- [ ] Validation IA starts and updates status.
- [ ] `/status` shows document states.
- [ ] Approved flow exposes WhatsApp CTA.
- [ ] Telegram alert still works for configured alert paths.
- [ ] Meta CAPI route returns success or a controlled error in logs.

## Rollback

If DNS has not moved, keep Vercel as production and fix Coolify in staging.

If DNS has moved and Coolify is broken:

1. Redeploy the previous successful Coolify image if available.
2. If redeploy does not recover quickly, point DNS back to Vercel.
3. Do not change MongoDB or R2 during rollback; they are shared external systems.
4. After rollback, check recent candidates in MongoDB for incomplete status transitions.

## Worker Extraction Criteria

Keep the monolith until production data proves otherwise. Plan a separate validation worker only if:

- container memory stays above 75% during validations;
- validations cause HTTP timeouts;
- concurrent validations slow down the public form;
- Coolify logs show restarts during `pdf-to-img`, Gemini or Rekognition processing.
```

- [ ] **Step 2: Review runbook against `.env.example`**

Run:

```bash
rg "META_ACCESS_TOKEN|NEXT_PUBLIC_BASE_URL|/api/health|formulario-credfacil" .specs/features/migracao-coolify-vps/deploy-runbook.md .env.example
```

Expected: runbook and env example use `META_ACCESS_TOKEN`, include `/api/health`, and mention base directory `formulario-credfacil`.

- [ ] **Step 3: Commit**

```bash
git add .specs/features/migracao-coolify-vps/deploy-runbook.md
git commit -m "docs: add coolify deploy runbook"
```

---

### T6: Run local verification

**What**: Verify lint, Docker build, container startup and health endpoint before configuring Coolify.
**Where**: Local shell in `formulario-credfacil`
**Depends on**: T4, T5
**Reuses**: Existing npm scripts and new Dockerfile.

**Tools**:

- MCP: filesystem
- Skill: token-efficiency

- [ ] **Step 1: Run lint**

```bash
npm run lint
```

Expected: no errors from migration files.

- [ ] **Step 2: Build Docker image**

```bash
docker build -t formulario-credfacil:coolify .
```

Expected: Docker build completes.

- [ ] **Step 3: Start container**

```bash
docker run --rm --env-file .env.local -p 3000:3000 formulario-credfacil:coolify
```

Expected: server starts and stays running.

- [ ] **Step 4: Smoke test**

```bash
curl -i http://localhost:3000/api/health
curl -I http://localhost:3000/
curl -I http://localhost:3000/login
```

Expected: `/api/health` returns 200 with complete env, public pages return 200 or expected redirects.

- [ ] **Step 5: Commit verification note if docs changed**

If verification uncovers required doc changes, update the runbook and commit:

```bash
git add .specs/features/migracao-coolify-vps/deploy-runbook.md
git commit -m "docs: update coolify verification notes"
```

---

### T7: Configure Coolify and perform staged cutover

**What**: Create the Coolify application, deploy with a temporary domain, validate manually and then cut over DNS.
**Where**: Coolify UI and DNS provider
**Depends on**: T6
**Reuses**: `.specs/features/migracao-coolify-vps/deploy-runbook.md`.

**Tools**:

- MCP: browser if UI verification is requested
- Skill: tlc-spec-driven

- [ ] **Step 1: Create Coolify app**

Use these settings:

```text
Repository: credfacil
Branch: feature/validacao-documentos-ia
Base Directory: formulario-credfacil
Build: Dockerfile
Port: 3000
Health Check Path: /api/health
```

Expected: Coolify deploy succeeds on a temporary domain.

- [ ] **Step 2: Add environment variables**

Copy all variables listed in `.env.example` and the runbook into Coolify. Do not upload `.env.local`.

Expected: `/api/health` returns HTTP 200 after redeploy.

- [ ] **Step 3: Run manual staging checklist**

Use the runbook checklist. At minimum validate:

```text
/api/health
/
/login
/documentos
/status
upload to R2
validation start/status
WhatsApp CTA
```

Expected: all critical flows pass, or DNS cutover is blocked.

- [ ] **Step 4: Cut over DNS**

Point the production domain to Coolify after staging passes.

Expected: production domain serves the Coolify app with HTTPS and `/api/health` returns HTTP 200.

- [ ] **Step 5: Record deployment state**

Update `.specs/project/STATE.md` with:

```markdown
- **YYYY-MM-DD:** Migracao Coolify VPS preparada/executada.
  - Deploy shape: Next.js standalone monolith in Coolify.
  - Backend/frontend split intentionally deferred.
  - Rollback: Vercel remains fallback until production validation completes.
```

- [ ] **Step 6: Commit state update**

```bash
git add .specs/project/STATE.md
git commit -m "docs: record coolify migration state"
```

---

## Parallel Execution Map

```text
Phase 1:
  T1 -> T2 -> T3

Phase 2:
  T3 complete, then:
    T4 [P] update env docs
    T5 [P] write deploy runbook

Phase 3:
  T4 + T5 -> T6 local verification -> T7 Coolify cutover
```

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1 | One Docker context file | Atomic |
| T2 | One Dockerfile | Atomic |
| T3 | One route handler | Atomic |
| T4 | One env documentation file | Atomic |
| T5 | One runbook document | Atomic |
| T6 | Verification only | Atomic |
| T7 | Deployment operation | Atomic |

---

## Self-Review

- Spec coverage: P1 deploy, P1 env, P1 validation, P2 rollback and P3 worker criteria are covered by T1-T7.
- Placeholder scan: no TBD/TODO placeholders remain; commands and expected outputs are explicit.
- Type consistency: the only new TypeScript API is `GET()` in `app/api/health/route.ts`, using `NextResponse` and string env names consistently.

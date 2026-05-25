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

## Local Verification Notes

- `docker build -t formulario-credfacil:coolify .` requires Docker Desktop with the Linux engine running.
- The Dockerfile sets a dummy `MONGODB_URI` only in the builder stage because Next.js imports API route modules during `next build`. The production `MONGODB_URI` must still be configured in Coolify runtime variables.
- Local health check with `.env.local` also requires `NEXT_PUBLIC_BASE_URL`; use `-e NEXT_PUBLIC_BASE_URL=http://localhost:3000` if the local secret file does not include it.
- If local Windows `npm run build` fails while collecting page data for `/api/whatsapp-link`, validate the Docker build in a Linux environment before changing application logic. This issue is already tracked in `.specs/project/STATE.md` as a local Next.js standalone build blocker.
- `npm run lint` currently reports pre-existing errors outside the migration files. The migration health route can be checked in isolation with `npx eslint app/api/health/route.ts`.

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

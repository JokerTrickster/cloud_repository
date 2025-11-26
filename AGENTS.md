# Repository Guidelines

## Project Structure & Module Organization
- `src/` holds app code: `api/` (Axios client + file API), `components/` (layout, upload, guards), `pages/` (Login, Gallery, Upload, MyPage), `utils/` (auth/token + thumbnail helpers), `assets/` and `data/` for static inputs.  
- `public/` contains static assets and manifest icons; `vite.config.js` configures Vite/PWA; `eslint.config.js` defines lint rules.  
- End-to-end tests live in `e2e/*.spec.ts` (Playwright). Build output is `dist/`; keep it out of commits.

## Build, Test, and Development Commands
- `npm install` — install dependencies (Node >=20.19).  
- `npm run dev` — start Vite dev server at `5173`.  
- `npm run build` — production build to `dist/`.  
- `npm run preview` — serve the built bundle locally at `4173`.  
- `npm run lint` — ESLint across `js/jsx`.  
- `npm run test:e2e` — Playwright suite; requires auth/file APIs reachable per `.env`.

## Coding Style & Naming Conventions
- JavaScript/JSX with ES modules; prefer 2-space indent, single quotes, and semicolons (match existing files).  
- Components and pages use `PascalCase` filenames; utilities/hooks `camelCase`.  
- Keep side effects in hooks; favor `useMemo/useCallback` for heavy calculations as in current code.  
- ESLint extends `@eslint/js` recommended + React hooks/refresh; fix warnings before PRs.

## Testing Guidelines
- Playwright specs in `e2e/`; mirror behavior with clear scenario names. Add new specs in the same folder with `.spec.ts` suffix.  
- For UI changes, add or update E2E steps that cover the flow (login, upload, gallery filters).  
- Use `.env` or `.env.development` to point `VITE_AUTH_API_URL` and `VITE_FILE_API_URL` to reachable servers before running tests.

## Commit & Pull Request Guidelines
- Commit messages follow Conventional Commits (`feat:`, `fix:`, `perf:`, etc.), e.g., `feat: add upload retry badge`.  
- Keep commits focused; include brief context in body if behavior changes or migrations are involved.  
- PRs should link issues, describe user-visible changes, list test commands executed, and attach screenshots for UI tweaks (gallery/upload/mypage).  
- Mention any env/config assumptions (API hosts, Google OAuth client ID) so reviewers can reproduce.

## Security & Configuration Tips
- Do not commit `.env*` files or secrets; use local `.env` with `VITE_AUTH_API_URL`, `VITE_FILE_API_URL`, `VITE_GOOGLE_CLIENT_ID`.  
- When testing builds, clear service worker/cache if behavior seems stale (`Application > Service Workers` in devtools).  
- S3/CloudFront deploy scripts (`npm run deploy`, `deploy:s3`) assume AWS credentials; coordinate before running.

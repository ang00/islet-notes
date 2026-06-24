# Islet Notes — agent guidance

## Commands

| Command | Action |
|---|---|
| `pnpm dev` | Dev server on `0.0.0.0` |
| `pnpm build` | `tsc -b && vite build` — typecheck first, then bundle |
| `pnpm check` | `tsc -b` (typecheck only) |
| `pnpm release:android -- --version X.Y.Z` | Build web → sync capacitor → assemble APK (pass `--debug` for unsigned debug) |
| `pnpm android:open` | `capacitor open android` (open in Android Studio) |

No linter, formatter, or test runner.

## Prerequisites

- **Node 22+**, **pnpm 10.15.0** (pinned in `package.json`). Run `pnpm install --frozen-lockfile`.
- Node managed by **vfox** (`.vfox.toml`). pnpm binary at `.vfox/sdks/nodejs/bin/pnpm` — not in PATH by default. Run `corepack enable && corepack prepare pnpm@10.15.0 --activate` to restore, or use the full path.
- **JDK 21+** and **Android SDK** for Android builds. Set `JAVA_HOME` and `ANDROID_HOME`.

## Architecture

- **Entrypoint**: `src/main.tsx` → async import `src/mobile/main.tsx` → init DI services → mount React app.
- **DI framework**: `vscf/platform/instantiation/common` with `InstantiationService`, `SyncDescriptor`, service interfaces.
- **Data layer**: CRDT-based diary storage via `loro-crdt` (wasm). Model in `src/core/diary/model.ts`.
- **Pages**: Lazy-loaded via route definitions in `src/mobile/route.ts`. All pages under `src/mobile/pages/`.
- **Storage mode**: `persistent` (default) or `memory` (when `sessionStorage.memotymode=true`, aka "experience mode").

## Vite aliases

`@` → `./src`, `vscf` → `./src/packages/vscf`, `vs` → `./src/packages/vscf/internal`.

## Dev proxy

`/api/baidu/{aip,vop}` → `https://{aip,vop}.baidu.com` (CORS bypass for Baidu speech APIs).

## Coverage

Set `COVERAGE=true` env var to enable `vite-plugin-istanbul` instrumentation during `pnpm build`.

## TypeScript

- Strict mode, `noUnusedLocals`, `noUnusedParameters`.
- **`src/packages/vscf/` is excluded** from `tsc` entirely (both `tsconfig.app.json` and `tsconfig.node.json` exclude it). Code importing from `vscf/` won't be typechecked.
- `tsconfig.json` is a root ref-only file; actual src config lives in `tsconfig.app.json`, node config in `tsconfig.node.json`.

## Android

- Package `com.hamsterbase.islet`, webDir `dist`, minSdk 24, compile/target SDK 36, Gradle 8.14.3.
- Release script (`scripts/release-android.mjs`): builds web → `capacitor sync android` → `./gradlew assembleRelease`/`assembleDebug`.
- APKs land in `android/app/build/outputs/apk/{release,debug}/`.
- App version from `--version` flag (major.minor.patch) → written to `android/version` file. Can also override via `ISLET_APP_VERSION` env var.
- Signing config (gitignored) in `android/signing/keystore.properties`. Keystore can be generated with `keytool -genkey`.
- Build output: `app-release-unsigned.apk` if no signing configured.

## Key conventions

- `nanoid` for all entity IDs.
- Soft-delete pattern (`deletedAt` field) for notebooks, entries, attachments.
- i18n via `src/nls.ts` `localize()` function; locale files in `src/locales/`.
- `react-router` v7 with `BrowserRouter` (not hash router).
- Tailwind CSS v4 via `@tailwindcss/postcss` Vite plugin.

## CI/CD (GitHub Actions)

- Workflow at `.github/workflows/release.yml`.
- **Trigger**: Push tag `v*` (e.g., `v1.2.3`) or `workflow_dispatch` with version input.
- **Steps**: setup Java 21 + Node 22 + pnpm → `pnpm install` → install Android SDK 36 → decode signing keys from secrets → `pnpm release:android -- --version X.Y.Z` → upload APK to release.
- **Signing**: Requires GitHub Secrets `KEYSTORE_BASE64` (base64 of keystore file), `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD`. Without them the APK is unsigned.
- **Artifacts**: APK uploaded as workflow artifact for both triggers; GitHub Release created only on tag push.
- **Cache**: pnpm store and Gradle caches are restored/ saved for faster builds.

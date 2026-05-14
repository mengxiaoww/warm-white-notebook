# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository shape

This repo contains two related applications:

1. The main WeChat Mini Program at the repository root.
2. A separate Vue 3 admin app in `admin/` for operators and content management.

The Mini Program is the primary product. The admin app talks to the same Tencent Cloud / WeChat Cloud backend through cloud functions.

## Common commands

### Main WeChat Mini Program

There is no root `package.json` and no CLI build/test pipeline checked into this repo. Development is done in WeChat DevTools using the project config in `project.config.json`.

Common workflow:

- Open the repository root in WeChat DevTools.
- Use the configured mini program appid from `project.config.json`.
- Cloud functions live under `cloudfunctions/` and are configured via `cloudfunctionRoot` in `project.config.json`.
- `project.config.json` excludes `admin/`, `cloudfunctions/`, `README.md`, and `CLAUDE.md` from the uploaded mini program package, so root documentation changes do not affect the deployed client bundle.

There is no single-test command in this repo because no automated JS test runner is configured for the mini program code.

### Admin app (`admin/`)

Run these inside `admin/`:

```bash
npm install
npm run dev
npm run build
npm run preview
```

`admin/package.json` does not define lint or test scripts.

## Deployment and environment notes

- The mini program initializes Tencent Cloud in `app.js` with env `cloud1-9gzf2w8c9c9b7b73`.
- The admin app uses the same env in `admin/src/api/cloud.js`.
- The admin README expects cloud functions such as `adminLogin`, `adminGetUsers`, `adminGetStats`, and `adminGetRecords` to be deployed, but those functions are not present in this checkout. Verify whether they exist in another repo, an uncommitted local directory, or a different cloud function workspace before changing admin behavior.
- The only cloud function present in this repo is `cloudfunctions/callSiliconFlowAI`.

## High-level architecture

### 1. Global app state and login flow

The root app is centered around `app.js`.

Key responsibilities in `app.js`:

- Initializes WeChat Cloud.
- Restores `userInfo`, `openid`, and `currentProfileId` from local storage.
- Maintains global session state in `globalData`.
- Initializes and hydrates the current health profile into `globalData.currentProfile`.
- Lazily creates indexes for core collections such as `keyDates`, `todayTasks`, `userProfiles`, and `users`.
- Handles login, registration-completion checks, and migration from older `userProfiles`-only user data to the newer `users` collection.

Important state conventions:

- Logged-in identity is keyed by `openid`.
- Most user data is profile-scoped through `currentProfileId` plus `openid`.
- Many pages read the active profile from either `app.globalData.currentProfile.profileId` or `app.getCurrentProfileId()`; when fixing profile bugs, update both storage-backed and in-memory flows together.
- `globalData.needRefreshData`, `globalData.shouldRefreshChart`, and profile switching via `wx.reLaunch(...)` are used as coarse refresh mechanisms across pages.

### 2. Main navigation model

The mini program uses a custom tab bar defined in `custom-tab-bar/index.js` with four top-level tabs:

- `pages/home/index`: trend charts and milestone overview
- `pages/daily-record/index`: date-centric entry point for daily records and tasks
- `pages/records/index`: archive / profile timeline views
- `pages/profile/index`: login, user settings, and profile management

Business pages are split into subpackages in `app.json`:

- `packageA`: lab/test record pages
- `packageB`: archive, profile, treatment, agreement, and report pages
- `packageC`: virology pages
- `packageD`: health monitoring and lifestyle pages

Route mapping for most daily-record feature cards is centralized in `utils/route-config.js`. Prefer updating that map instead of scattering `wx.navigateTo` paths.

### 3. Profile-centric data model

The app supports multiple health profiles per user.

Core collections inferred from the code:

- `users`: account-level basic user info and registration completion
- `userProfiles`: per-profile demographic and disease context
- `keyDates`: milestone dates shown on the home page
- `todayTasks`: daily todo items
- `medications`: medication schedules / completion state
- `feedbacks`: user feedback submissions
- medical record collections such as `bloodTests`, `liverFunctionTests`, `kidneyFunctionTests`, `ebvRecords`, `cmvRecords`, `ldhRecords`, `checkReports`, `clinicRecords`, `hospitalizationRecords`, `treatmentRecords`, `bloodSugars`, `bloodOxygens`, `bloodPressures`, `waterIntakes`, `temperatures`, `bodyMeasurements`, `dietRecords`, `expenseRecords`, `organFunctionRecords`, `virusRecords`

Important behavioral rule:

- Most business records are filtered by both `openid` and `profileId`.
- Trend charts on the home page query by `profileId` and `_openid` for some collections, while many archive pages query by explicit `openid` and `profileId`. Be careful to preserve the existing query style of the page you are touching.

### 4. Home page architecture

`pages/home/index.js` is the chart/dashboard surface.

It combines several concerns:

- banner loading via cloud function `getBanners`
- milestone display from `keyDates`
- grouped health trend charts using local ECharts in `ec-canvas/`
- chart metadata from `utils/healthChartConfig.js`
- profile-aware filtering and date-range switching

Chart behavior is configuration-driven:

- `utils/healthChartConfig.js` defines chart groups, display labels, collection names, units, and normal ranges.
- `pages/home/index.js` loops through `dataTypeGroups` and `dataTypes` to fetch and render each chart group.
- When adding a new metric that should appear on the home charts, the main integration point is usually `utils/healthChartConfig.js`, not hard-coded page logic.

### 5. Daily record page architecture

`pages/daily-record/index.js` is a large orchestration page rather than a single-form page.

It acts as a calendar-driven hub that:

- marks which dates have data
- loads the selected date’s record summary across many domains
- exposes function cards that jump into detailed record/config pages in the subpackages
- manages today tasks and milestone editing

Feature visibility is partly generated from `generateFunctionConfig(...)`, which adapts available cards based on disease/profile context.

When changing navigation or feature-card availability, inspect both:

- `pages/daily-record/index.js`
- `utils/route-config.js`

### 6. Archive / records page architecture

`pages/records/index.js` is another large orchestration page with multiple tabs and data loaders.

It aggregates several record families into user-facing archive views:

- health records timeline/table views
- medication history
- check report archive
- expense archive
- merged medical record history built from `checkReports`, `clinicRecords`, `hospitalizationRecords`, and `treatmentRecords`

This page contains broad cross-collection querying and pagination helpers to work around client query limits. Changes here often have side effects across multiple tabs.

### 7. Profile page architecture

`pages/profile/index.js` owns:

- login and registration-completion flow
- profile creation, switching, default-profile handling, and deletion
- user info editing
- feedback submission
- current medication progress summary

This page contains important anti-duplication guards for profile creation, using `app.globalData.isCreatingProfile`. Preserve those guards when touching onboarding or default-profile logic.

### 8. AI integration

The only checked-in cloud function is `cloudfunctions/callSiliconFlowAI`.

It:

- proxies requests to SiliconFlow over HTTPS
- injects a large domain-specific system prompt for blood cancer health Q&A plus structured record extraction
- supports both built-in system prompts and caller-supplied system messages
- returns plain non-streaming responses from `exports.main`

The function is configured for Node.js 16 in `cloudfunctions/callSiliconFlowAI/package.json`.

Important caveat:

- `cloudfunctions/callSiliconFlowAI/config.js` contains a plaintext API key in source control. Treat this as sensitive and avoid duplicating it in new files or logs.

### 9. Admin app architecture

The admin app in `admin/` is a separate Vite SPA.

Structure:

- `admin/src/router/index.js`: hash-router with auth gate
- `admin/src/store/auth.js`: Pinia store backed by `localStorage`
- `admin/src/api/cloud.js`: shared Tencent Cloud Web SDK wrapper and cloud-function API layer
- `admin/src/views/`: screens such as dashboard, users, user detail, feedback, banners, and settings

The admin frontend assumes anonymous CloudBase login in the browser, then delegates actual privilege checks to admin-specific cloud functions. When changing admin flows, keep the distinction between CloudBase anonymous auth and admin token auth clear.

## Working conventions specific to this repo

- Prefer editing existing page logic over adding new abstraction layers. The mini program codebase is heavily page-centric.
- Before changing a data flow, check whether the same concept exists in both local storage and `app.globalData`.
- Before changing a metric or chart, check `utils/healthChartConfig.js` and the corresponding collection/query code in `pages/home/index.js`.
- Before changing a daily-record feature entry, check both the generated feature config in `pages/daily-record/index.js` and `utils/route-config.js`.
- Before changing archive behavior, confirm whether the target tab is driven by one collection or a merged multi-collection timeline in `pages/records/index.js`.
- For admin changes, verify the backing cloud function exists in the actual deployment environment; this repo does not contain the full admin backend source.

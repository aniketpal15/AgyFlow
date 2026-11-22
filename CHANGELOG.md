# Changelog

All notable releases of AgyFlow are documented here.

---

## [v1.1.1] - 2026-11-22

### Fixed & Enhanced
- **Seamless 1-Click Account Switcher**: Fixed IDE account switching by packing both `oauthTokenInfoSentinelKey` and `authStateWithContextSentinelKey` (`state: "signedIn"`) into the unified SQLite storage payload. Antigravity IDE now starts directly logged in to the target account without prompting "Continue with Google".
- **Clean Process Termination Order**: Antigravity IDE and `agy.exe` background processes are cleanly terminated and file locks released before updating SQLite state, eliminating SQLite WAL write collisions.
- **Legacy Auth Cleanup**: Automatically purges obsolete `google.antigravity` storage entries to prevent session conflicts.
- **Production Cleanup**: Stripped all development-only test suites and debug IPC handlers for a clean production footprint.
- **UI Version Display**: Updated UI header, splash loader, and telemetry displays to `v1.1`.
- **Installer Asset Link**: Standardized installer asset naming to `AgyFlow.Setup.exe` to ensure direct one-click downloads from GitHub without 404 errors.

---

## [v1.0.2] - 2026-11-21

### Fixed
- **Accurate Live Model Quota Tracking via Official RPC**: Switched telemetry polling to Antigravity Language Server's official `RetrieveUserQuotaSummary` endpoint. This fixes the issue where Claude / GPT third-party models showed 100% despite being exhausted (now accurately reflects 0% and active reset windows).
- **Instant Refresh Synchronization**: Refreshing quotas now immediately queries live groups and buckets directly from the running IDE language server.

---

## [v1.0.1] - 2026-11-21

### Improved
- **Clean Onboarding Empty State**: For fresh installations without connected accounts, provides a modern welcome screen with quick-action buttons to import the running Antigravity IDE account or manually add accounts.
- **Privacy & Keystore Isolation**: Confirmed fresh installs launch completely blank without test artifacts or pre-populated fleet accounts.
- Updated documentation and download buttons for direct installer access.

---

## [v1.0.0] - 2026-11-21

### Initial Release
- Live Language Server RPC telemetry for exact Gemini & Claude+GPT quota readings
- 1-Click IDE account switcher via Windows Credential Manager injection
- 7-day rolling standby quota auto-restoration
- Dynamic fleet ranking by available token balance
- 4 curated themes: Dark Obsidian, OLED Black, Violet Light, Warm Latte
- Global cyan infinity loader across all themes
- Responsive layout supporting 360px minimum width
- Desktop shortcut created automatically on install
- Memory-optimized Electron: GPU disabled, V8 heap capped at 128 MB

# Changelog

All notable releases of AgyFlow are documented here.

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

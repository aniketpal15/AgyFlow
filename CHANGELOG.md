# Changelog

All notable releases of AgyFlow are documented here.

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

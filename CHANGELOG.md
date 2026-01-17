# Changelog

All notable changes to the **OmniMIN** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to Semantic Versioning.

## [Unreleased]

## [0.2.0] - 2026-01-17
### Added
- **Inline Spreadsheet Editing**:
  - Implemented double-click to edit cells in the Browser view.
  - Changes are persisted instantly to the database using `UPDATE` commands.
  - Added primary key detection to ensure precise row-level updates.
- **Table Maintenance Tools**:
  - New maintenance dashboard for `CHECK`, `ANALYZE`, `REPAIR`, and `OPTIMIZE` operations.
  - Implemented `TRUNCATE` (Empty) table action.
  - Maintenance results are displayed in a dedicated results table.
- **Security Administration**:
  - Added User Accounts management modal.
  - Implemented Password Rotation with a secure password generator.
  - `SHOW GRANTS` support (basic).
- **UI/UX Enhancements**:
  - Standardized header heights (`h-14`) and background glassmorphism across all main views.
  - Re-branded application to **OmniMIN**.
  - Improved data grid density and icon consistency.

### Fixed
- Fixed missing `lucide-react` imports (`Key`, `cn`) that caused compilation blockers.
- Resolved CSS specificity issues by moving base tag styles to `@layer base`.
- Fixed duplicate command registrations in `lib.rs`.

### Added
- **Router Architecture**: Implemented `react-router-dom` for robust navigation.
  - Server context is now URL-driven (`/server/:serverId`), enabling better state management and deep linking capability (local).
- **Server Management**:
  - Added "Grid" and "List" view toggles for the server dashboard, persisted to local storage.
  - Implemented full "Edit" and "Delete" server functionality.
  - Added "Add Server" modal with connection testing.
- **Native Experience**:
  - Disabled `Context Menu` (Right-Click) in production builds for a native app feel.
  - Disabled `F12` and DevTools shortcuts in production to prevent tampering.
- **Type Safety**:
  - generic `safeInvoke` wrapper for Tauri commands to prevent "Command Not Found" errors and ensure type safety between Rust and React.

### Changed
- **UI/UX**:
  - Refactored `Dashboard` to support responsive grid layouts.
  - Improved Server Card styling with hover effects and status indicators.
- **Backend**:
  - Refactored `src-tauri/src/lib.rs` to correctly register local server management commands (`save_server_local`, etc.).
  - Updated `mysql_async` connection logic to handle MariaDB/MySQL auth plugins more gracefully.

### Fixed
- Fixed `Command save_server_local not found` error by syncing frontend definition with backend registration.
- Fixed `Send` trait concurrency issues in Rust backend `get_server_info`.
- Fixed `unknown authentication plugin` errors by reverting unsupported connection parameters.

## [0.1.0] - Initial Beta
- Basic database connection.
- Table browsing and query execution.
- Initial "Native SQL Manager" branding (now re-branded to **OmniMIN**).

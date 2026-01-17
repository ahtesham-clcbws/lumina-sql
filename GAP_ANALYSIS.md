# Gap Analysis: OmniMIN (React) vs Legacy/Classic phpMyAdmin

This document outlines the feature gaps between the current React-based **OmniMIN** (v0.1.0) and the traditional phpMyAdmin function set.

## 🔴 Critical Missing Features (High Priority)
These features are essential for daily database management and are currently missing.

| Feature | Legacy/PMA Status | OmniMIN Status | Notes |
|:--- |:--- |:--- |:--- |
| **Inline Editing** | Native spreadsheet-like editing | ✅ ** superior** | Excel-like double-click to edit with instant save. |
| **Advanced Import** | CSV/SQL with mapping options | ❌ Basic Only | Only basic SQL dump import is supported. No CSV mapping. |
| **Stored Routines** | Full Editor | ❌ Missing | Cannot view, edit, or execute Stored Procedures/Functions. |
| **User Privileges** | Grant/Revoke Matrices | ⚠️ Partial | Basic User list exists, but fine-grained global/table privileges missing. |
| **Table Maintenance** | Check/Repair/Analyze | ✅ Implemented | Full support for CHECK, ANALYZE, REPAIR, OPTIMIZE. |

## 🟡 Enhanced Features (Medium Priority)
Features that improve productivity but aren't blockers.

| Feature | Legacy/PMA Status | OmniMIN Status | Notes |
|:--- |:--- |:--- |:--- |
| **Query By Example (QBE)** | Visual Query Builder | ❌ Missing | "Search" tab is basic. No complex criteria builder. |
| **Designer (Schema)** | Drag & Drop Relations | ✅ **Superior** | React Flow based designer is better than legacy. |
| **Visual Explain** | Query Execution Plan | ❌ Missing | `EXPLAIN` query visualization is not implemented. |
| **Status Variables** | Server Status Monitor | ⚠️ Partial | Basic uptime/version only. No live charts or full variable list. |
| **Triggers/Events** | List & Edit | ✅ Implemented | Full support for Triggers and Schedulers. |

## 🟢 Architecture Improvements (Done)
Areas where OmniMIN explicitly outperforms the legacy version.

- **Navigation**: Instant SPA navigation (React Router) vs Page Reloads.
- **Connection**: Native TCP pooling (Rust) vs PHP session limits.
- **Multi-Server**: First-class "Server Switcher" dashboard vs Config-file only.
- **Theming**: Real-time Theme/Accent/Density engines vs Static CSS themes.
- **Security**: Encrypted local credential storage vs Plaintext config.

## Roadmap to Parity
1. **v0.2.0**: Inline Data Editing & Table Maintenance. (Done)
2. **v0.3.0**: Stored Procedure Editor & User Privileges. (Next)
3. **v0.4.0**: Advanced Import/Export & Query Builders.

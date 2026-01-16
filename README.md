# LuminaSQL

> **The Native, Visual, AI-Ready Database Manager.**

LuminaSQL is a high-performance, native (Rust) database management tool with a modern React UI. Designed to be a lightweight, ultra-fast alternative to phpMyAdmin, TablePlus, and DBeaver.

<!-- ![UI Preview](ProjectInfo/preview.png) -->
SCRENSHOTS COMMING SOON

## 💡 Why LuminaSQL?

Traditional tools like **phpMyAdmin** require a heavy stack (Apache + PHP) just to manage a database. Electron-based apps often feel sluggish and consume varying amounts of RAM.

**LuminaSQL** solves this by providing a **standalone, dependency-free** compiled application.
*   🚫 **No Apache/PHP required**: Just run the executable.
*   ⚡ **Instant Startup**: Native Rust backend (Tauri 2.0).
*   🔒 **Secure**: Your credentials stay on your machine.
*   🎨 **Visual Designer**: Built-in schema architect with advanced code generation.

## 🖥️ Supported Platforms

We aim to support **every operating system** developers use. Our native architecture allows us to compile optimized binaries for:

| Platform | Status |
| :--- | :--- |
| **Windows** | ✅ Supported (x64, ARM64) |
| **macOS** | ✅ Supported (Intel, Apple Silicon) |
| **Linux** | ✅ Supported (Debian, Arch, Fedora, etc.) |
| **FreeBSD/OpenBSD** | 🚧 Planned |

---

## ✅ Feature Checklist & Roadmap

Below is the comprehensive list of all features implemented and planned for LuminaSQL.

### Phase 1: Foundation (Rust + React)
- [x] **Backend Architecture**: Implemented `mysql_async` based connection pooling.
- [x] **Command Set**: `connect_db`, `get_databases`, `get_tables`, `execute_query`.
- [x] **UI Design**: Implemented Glassmorphism design system with Tailwind v4.
- [x] **Theme Support**: Dynamic Dark/Light mode switching.
- [x] **Dashboard**: Sidebar for DBs, Main for Data.
- [x] **Data Grid**: High-performance virtualized table view.

### Phase 2: Multi-Server Dashboard
- [x] **Storage**: Local secure config storage (Rust).
- [x] **Management UI**: "Add Server" modal and connection switching.
- [x] **Stats Widget**: Live server status and uptime.

### Phase 3: Information-Dense UI
- [x] **Compact Layout**: Optimized density for power users.
- [x] **Context Bar**: Breadcrumbs for SQL Browser.
- [x] **Tabbed Navigation**: Separate views for Structure, SQL, Designer.
- [x] **Sidebar Explorer**: Nested schema explorer with expand/collapse.
- [x] **QBE**: Query by Example search flow.
- [x] **Search**: 1:1 Parity with standard search forms.

### Phase 4 & 5: Advanced Features
- [x] **Structure View**: Metrics, Bulk Actions (Check/Repair/Analyze), Quick Create.
- [x] **Global Search**: Search across entire database.
- [x] **Usage Stats**: Server home statistics.
- [x] **Database Operations**: Rename, Copy, Collation changes.
- [x] **SQL Tab**: Query History, Formatter, and Resizable Editor.
- [x] **Table Maintenance**: Check, Analyze, Repair, Optimize.

### Phase 6: Deep Feature Parity
- [x] **Relation View**: Foreign Key Manager.
- [x] **User Management**: Privileges, Create/Drop User, Grant/Revoke.
- [x] **Triggers & Events**: List, Create, Edit, Drop interface.
- [ ] **Stored Procedures**: Editor and Executor.
- [ ] **Variables & Charsets**: Server variable editor.
- [ ] **Advisors**: Performance recommendations.

### Phase 8: Schema Designer (Visual Architect)
- [x] **Drag & Drop**: React Flow based table design.
- [x] **Visual Relations**: Foreign Key edges.
- [x] **Advanced Exports**:
  - [x] **Laravel**: Generate Migrations & Eloquent Models.
  - [x] **TypeScript**: Generate Interfaces.
  - [x] **Prisma**: Generate `schema.prisma`.
  - [x] **SQL**: Standard `CREATE TABLE` dumps.

### Phase 10: Universal Database Support (Architecture 2.0)
- [ ] **Refactor Backend**: Abstract `DatabaseDriver` trait.
- [ ] **Drivers**:
  - [ ] `PostgreSQL` (tokio-postgres)
  - [ ] `SQLite` (sqlx-sqlite)
  - [ ] `MSSQL` (tiberius)
  - [ ] `MariaDB` (mysql_async)
  - [ ] `MongoDB` (NoSQL Adapter)
  - [ ] `Redis` (Key-Value Adapter)
- [ ] **Frontend Modularization**: Abstract core views for swappable renderers.

### Phase 11: Resilience & Persistence
- [x] **Config Persistence**: `servers.json` in `app_config_dir`.
- [ ] **Preferences Migration**: Move Theme/Sidebar settings to `preferences.json`.
- [ ] **Session Recovery**: Restore tabs on restart.

---

## 🛠 Tech Stack

*   **Frontend**: React 18, TypeScript, Zustand, TanStack Query, React Flow, Tailwind CSS v4.
*   **Backend**: Rust (Tauri), Tokio, SQLx/MySQL_Async.
*   **Build Tool**: Vite.

## 🤝 Contributing

We welcome contributions! This project is 100% Open Source.

1.  Clone repo: `git clone https://github.com/yourusername/luminasql.git`
2.  Install DB deps: `npm install` (in `www/`)
3.  Run Dev: `npm run tauri dev`

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

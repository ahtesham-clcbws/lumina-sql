/**
 * Shared Interfaces
 * Mapped from Rust structs.
 */

export interface ServerConfig {
    name: string;
    host: string;
    port: number;
    user: string;
    pass?: string | null;
    id?: string;
}

export interface Database {
    name: string;
}

export interface Table {
    name: string;
    rows: number | null;
    size: number | null;
    comment: string | null;
}

export interface Column {
    name: string;
    type: string;
    null: string;
    key: string;
    default: string | null;
    extra: string;
}

export interface QueryResult {
    columns: string[];
    rows: Array<Array<string | number | null>>;
    affected_rows: number;
    last_insert_id: number;
    execution_time_ms: number;
}

export interface Relation {
    name: string;
    column: string;
    ref_db: string;
    ref_table: string;
    ref_column: string;
    on_delete: string;
    on_update: string;
}

export interface ServerInfo {
    version: string;
    user: string;
    ssl: boolean;
}

export interface Variable {
    variable_name: string;
    value: string;
}

export interface Process {
    id: number;
    user: string;
    db: string;
    command: string;
    time: number;
    state: string;
    info: string;
}

export interface SearchResult {
    table: string;
    matches: number;
}

export interface Trigger {
    name: string;
    table: string;
    timing: string;
    event: string;
    created: string;
}

export interface EventScheduler {
    name: string;
    schedule: string;
    status: string;
    starts: string;
    ends: string;
}

export interface UserDesc {
    user: string;
    host: string;
}

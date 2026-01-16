
export interface SchemaColumn {
    name: string;
    type: string;
    nullable: boolean;
    key?: 'PRI' | 'UNI' | 'MUL';
    default?: string | null;
    extra?: string;
}

export interface SchemaRelation {
    column: string;
    referencedTable: string;
    referencedColumn: string;
}

export interface SchemaTable {
    name: string;
    columns: SchemaColumn[];
    relations: SchemaRelation[];
}

export interface GeneratorOptions {
    namespace?: string;
    includeComments?: boolean;
}

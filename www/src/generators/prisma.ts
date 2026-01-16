import { SchemaTable } from './types';

export const PrismaGenerator = {
    generateModel: (table: SchemaTable): string => {
        const className = table.name.charAt(0).toUpperCase() + table.name.slice(1);
        const lines: string[] = [];
        
        lines.push(`model ${className} {`);

        table.columns.forEach(col => {
            let type = 'String';
            let attributes = '';

            const dbType = col.type.toLowerCase();

            if (col.extra?.includes('auto_increment') || col.key === 'PRI') {
                attributes += ' @id @default(autoincrement())';
                type = 'Int'; // Assuming int PK
            } else if (dbType.includes('int')) {
                type = 'Int';
            } else if (dbType.includes('bool')) {
                type = 'Boolean';
            } else if (dbType.includes('datetime')) {
                type = 'DateTime';
            } else if (dbType.includes('float') || dbType.includes('decimal')) {
                type = 'Float';
            }

            if (!col.nullable && !attributes.includes('@id')) {
                // Prisma is default required, so we don't add anything for not null
            } else if (col.nullable) {
                type += '?';
            }

            if (col.key === 'UNI') attributes += ' @unique';

            lines.push(`  ${col.name.padEnd(20)} ${type}${attributes}`);
        });

        // Relations handling in Prisma is complex as it requires back-references.
        // For now, we list the relation fields on this side.
        table.relations.forEach(rel => {
             const refModel = rel.referencedTable.charAt(0).toUpperCase() + rel.referencedTable.slice(1);
             lines.push(`  ${rel.referencedTable} ${refModel} @relation(fields: [${rel.column}], references: [${rel.referencedColumn}])`);
        });

        lines.push(`}`);
        return lines.join('\n');
    }
};

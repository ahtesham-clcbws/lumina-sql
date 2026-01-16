import { SchemaTable } from './types';

export const TypescriptGenerator = {
    generateInterface: (table: SchemaTable): string => {
        const className = table.name.charAt(0).toUpperCase() + table.name.slice(1);
        
        const lines: string[] = [];
        lines.push(`export interface ${className} {`);

        table.columns.forEach(col => {
            let tsType = 'string';
            const type = col.type.toLowerCase();

            if (type.includes('int') || type.includes('decimal') || type.includes('float')) {
                tsType = 'number';
            } else if (type.includes('bool')) {
                tsType = 'boolean';
            } else if (type.includes('date') || type.includes('time')) {
                tsType = 'Date | string';
            }

            const optional = col.nullable ? '?' : '';
            const nullType = col.nullable ? ' | null' : '';
            
            lines.push(`    ${col.name}${optional}: ${tsType}${nullType};`);
        });

        lines.push(`}`);
        return lines.join('\n');
    }
};

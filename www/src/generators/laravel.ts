import { SchemaTable } from './types';

export const LaravelGenerator = {
    generateMigration: (table: SchemaTable): string => {
        const lines: string[] = [];
        lines.push(`Schema::create('${table.name}', function (Blueprint $table) {`);
        
        table.columns.forEach(col => {
            let line = `    $table->`;
            
            // Type Mapping
            const type = col.type.toLowerCase();
            if (col.extra?.includes('auto_increment')) {
                line += `id()`;
            } else if (type.includes('int')) {
                line += `integer('${col.name}')`;
            } else if (type.includes('varchar')) {
                const length = type.match(/\((\d+)\)/)?.[1] || '255';
                line += `string('${col.name}', ${length})`;
            } else if (type.includes('text')) {
                line += `text('${col.name}')`;
            } else if (type.includes('bool')) {
                line += `boolean('${col.name}')`;
            } else if (type.includes('datetime')) {
                line += `dateTime('${col.name}')`;
            } else if (type.includes('date')) {
                line += `date('${col.name}')`;
            } else if (type.includes('decimal')) {
                line += `decimal('${col.name}')`;
            } else {
                line += `string('${col.name}') /* ${col.type} */`;
            }

            if (col.nullable) line += `->nullable()`;
            if (col.default !== null && col.default !== undefined) line += `->default('${col.default}')`;
            if (col.key === 'UNI') line += `->unique()`;
            
            lines.push(line + ';');
        });

        // Relations
        table.relations.forEach(rel => {
            lines.push(`    $table->foreign('${rel.column}')->references('${rel.referencedColumn}')->on('${rel.referencedTable}')->onDelete('cascade');`);
        });

        lines.push(`    $table->timestamps();`);
        lines.push(`});`);

        return lines.join('\n');
    },

    generateModel: (table: SchemaTable, namespace = 'App\\Models'): string => {
        const className = table.name.charAt(0).toUpperCase() + table.name.slice(1);
        
        return `<?php

namespace ${namespace};

use Illuminate\\Database\\Eloquent\\Model;

class ${className} extends Model
{
    protected $table = '${table.name}';
    
    protected $fillable = [
${table.columns.map(c => `        '${c.name}'`).join(',\n')}
    ];

    // Relations
${table.relations.map(rel => `
    public function ${rel.referencedTable}()
    {
        return $this->belongsTo(${rel.referencedTable.charAt(0).toUpperCase() + rel.referencedTable.slice(1)}::class, '${rel.column}');
    }`).join('\n')}
}`;
    }
};

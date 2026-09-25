import React from 'react';
import { Card, CardHeader, CardBody } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import { ArrowRight, LayoutGrid } from 'lucide-react';

/**
 * Small preview area showing source data alongside mapped output.
 * @param {Object} props
 * @param {Array} props.sourceColumns - Array of source column names
 * @param {Array} props.mappings - Array of {sourceField, destinationField}
 * @param {Array} props.previewRows - Array of row objects from the dataset preview
 */
export function MappingPreview({ sourceColumns, mappings, previewRows = [] }) {
  if (!mappings || mappings.length === 0) {
    return (
      <Card className="enterprise-card border-dashed bg-slate-50 dark:bg-slate-900/30">
        <CardBody className="p-8">
          <EmptyState 
            icon={LayoutGrid}
            title="Preview Data"
            description="Create mappings above to see how your data will be transformed."
          />
        </CardBody>
      </Card>
    );
  }

  // Get active source columns that are mapped
  const mappedSourceFields = mappings.map(m => m.sourceField);
  
  // Create a display mapping object for easier lookup
  const fieldMap = mappings.reduce((acc, curr) => {
    acc[curr.sourceField] = curr.destinationField;
    return acc;
  }, {});

  const displayRows = previewRows.slice(0, 5); // Limit to 5 rows

  return (
    <Card className="enterprise-card overflow-hidden">
      <CardHeader className="py-3 px-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 flex justify-between items-center">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Data Transformation Preview</h3>
        <span className="text-xs text-slate-500 font-medium px-2 py-1 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">Showing {displayRows.length} rows</span>
      </CardHeader>
      
      <CardBody className="p-0 overflow-x-auto">
        <div className="flex min-w-[800px]">
          
          {/* SOURCE TABLE */}
          <div className="flex-1 border-r border-slate-200 dark:border-slate-700 relative">
            <div className="sticky top-0 bg-slate-50 dark:bg-slate-800/80 p-2 border-b border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">
              Source Data
            </div>
            <table className="w-full text-sm">
              <thead className="bg-white dark:bg-slate-900">
                <tr>
                  {mappedSourceFields.map(field => (
                    <th key={`src-header-${field}`} className="px-4 py-2 text-left font-semibold text-indigo-700 dark:text-indigo-400 border-b border-slate-100 dark:border-slate-800 whitespace-nowrap">
                      {field}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayRows.map((row, i) => (
                  <tr key={`src-row-${i}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    {mappedSourceFields.map(field => (
                      <td key={`src-cell-${i}-${field}`} className="px-4 py-2 text-slate-600 dark:text-slate-400 font-mono text-xs border-b border-slate-50 dark:border-slate-800/50 whitespace-nowrap overflow-hidden text-ellipsis max-w-[150px]" title={String(row[field])}>
                        {row[field] !== undefined && row[field] !== null ? String(row[field]) : <span className="text-slate-300 dark:text-slate-600 italic">null</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ARROW SEPARATOR */}
          <div className="w-8 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800/50 border-r border-slate-200 dark:border-slate-700 z-10">
            {displayRows.map((_, i) => (
              <div key={`arrow-${i}`} className="h-[37px] flex items-center justify-center">
                <ArrowRight className="w-4 h-4 text-slate-300 dark:text-slate-600" />
              </div>
            ))}
          </div>

          {/* MAPPED TABLE */}
          <div className="flex-1 bg-emerald-50/10 dark:bg-emerald-900/10">
            <div className="sticky top-0 bg-slate-50 dark:bg-slate-800/80 p-2 border-b border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">
              Mapped Output
            </div>
            <table className="w-full text-sm">
              <thead className="bg-white dark:bg-slate-900">
                <tr>
                  {mappedSourceFields.map(field => (
                    <th key={`dest-header-${fieldMap[field]}`} className="px-4 py-2 text-left font-semibold text-emerald-700 dark:text-emerald-400 border-b border-slate-100 dark:border-slate-800 whitespace-nowrap">
                      {fieldMap[field]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayRows.map((row, i) => (
                  <tr key={`dest-row-${i}`} className="hover:bg-emerald-50/30 dark:hover:bg-emerald-900/20 transition-colors">
                    {mappedSourceFields.map(field => (
                      <td key={`dest-cell-${i}-${field}`} className="px-4 py-2 text-slate-600 dark:text-slate-400 font-mono text-xs border-b border-slate-50 dark:border-slate-800/50 whitespace-nowrap overflow-hidden text-ellipsis max-w-[150px]" title={String(row[field])}>
                        {row[field] !== undefined && row[field] !== null ? String(row[field]) : <span className="text-slate-300 dark:text-slate-600 italic">null</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
        </div>
      </CardBody>
    </Card>
  );
}

export default MappingPreview;

import React, { useState, useEffect } from 'react';
import Card from './Card';
import Pagination from './Pagination';

const DataTable = ({ 
    columns = [], 
    data = [], 
    loading = false, 
    emptyMessage = "No records found.", 
    renderRow,
    itemsPerPage = 10,
    className = ""
}) => {
    const [currentPage, setCurrentPage] = useState(1);

    // Reset to page 1 when data changes (e.g. after a search/filter)
    useEffect(() => {
        setCurrentPage(1);
    }, [data.length]);

    const totalPages = Math.ceil(data.length / itemsPerPage);
    const paginatedData = data.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    return (
        <Card className={`overflow-hidden ${className}`}>
            <div className="overflow-x-auto min-h-[400px]">
                <table className="w-full text-left border-separate border-spacing-0">
                    <thead>
                        <tr className="bg-slate-50/50">
                            {columns.map((col, idx) => {
                                const name = typeof col === 'string' ? col : col.name;
                                const align = typeof col === 'object' && col.align ? `text-${col.align}` : 'text-left';
                                
                                return (
                                    <th 
                                        key={idx} 
                                        className={`px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100 whitespace-nowrap ${align}`}
                                    >
                                        {name}
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr>
                                <td colSpan={columns.length} className="px-6 py-12 text-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                                        <span className="text-slate-400 font-medium">Loading data...</span>
                                    </div>
                                </td>
                            </tr>
                        ) : data.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length} className="px-6 py-16 text-center text-slate-400 font-medium italic">
                                    {emptyMessage}
                                </td>
                            </tr>
                        ) : (
                            paginatedData.map((item, index) => (
                                <tr key={item.id || index} className="hover:bg-slate-50/50 transition-colors group">
                                    {renderRow(item, index)}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {!loading && data.length > 0 && (
                <Pagination
                    currentPage={currentPage}
                    totalItems={data.length}
                    itemsPerPage={itemsPerPage}
                    onPageChange={setCurrentPage}
                />
            )}
        </Card>
    );
};

export default DataTable;

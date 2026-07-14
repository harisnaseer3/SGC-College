import React from 'react';

const Pagination = ({ 
    currentPage, 
    totalItems, 
    itemsPerPage, 
    onPageChange 
}) => {
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    const getPageNumbers = () => {
        const pages = [];
        const delta = 1; // Numbers around current page
        const left = currentPage - delta;
        const right = currentPage + delta;
        const range = [];
        const rangeWithDots = [];
        let l;

        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= left && i <= right)) {
                range.push(i);
            }
        }

        for (let i of range) {
            if (l) {
                if (i - l === 2) {
                    rangeWithDots.push(l + 1);
                } else if (i - l !== 1) {
                    rangeWithDots.push('...');
                }
            }
            rangeWithDots.push(i);
            l = i;
        }

        return rangeWithDots;
    };

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 bg-slate-50/50 border-t border-slate-100">
            <div className="flex items-center gap-4">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                    Showing <span className="text-slate-900">{startItem}</span> to <span className="text-slate-900">{endItem}</span> of <span className="text-slate-900">{totalItems}</span> results
                </div>
                <select 
                    value={localStorage.getItem('per_page') || itemsPerPage} 
                    onChange={(e) => {
                        localStorage.setItem('per_page', e.target.value);
                        window.location.reload();
                    }}
                    className="text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded px-2 py-1 outline-none focus:border-indigo-400 cursor-pointer"
                >
                    <option value={10}>10 per page</option>
                    <option value={20}>20 per page</option>
                    <option value={50}>50 per page</option>
                    <option value={100}>100 per page</option>
                    <option value={500}>500 per page</option>
                </select>
            </div>

            <div className="flex items-center gap-1.5">
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 border border-transparent disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                    title="Previous Page"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                    </svg>
                </button>

                {getPageNumbers().map((p, i) => (
                    p === '...' ? (
                        <span key={`dots-${i}`} className="px-2 text-slate-300 font-bold">...</span>
                    ) : (
                        <button
                            key={p}
                            onClick={() => onPageChange(p)}
                            className={`min-w-[40px] h-10 flex items-center justify-center rounded-xl text-sm font-bold transition-all border ${
                                currentPage === p
                                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-200'
                                    : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-400 hover:text-indigo-600 shadow-sm'
                            }`}
                        >
                            {p}
                        </button>
                    )
                ))}

                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 border border-transparent disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                    title="Next Page"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                </button>
            </div>
        </div>
    );
};

export default Pagination;

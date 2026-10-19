import React from 'react';

// Pages affichées : la première, la dernière et deux de chaque côté de la page courante,
// séparées par « … » (ex. 1 … 8 9 [10] 11 12 … 40) — reste compact quel que soit le nombre de pages
const pagesVisibles = (courante, total) => {
  const pages = [];
  for (let i = 0; i < total; i++) {
    if (i === 0 || i === total - 1 || Math.abs(i - courante) <= 2) pages.push(i);
    else if (pages[pages.length - 1] !== '…') pages.push('…');
  }
  return pages;
};

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  return (
    <nav className="mt-3" aria-label="Pagination">
      <ul className="pagination justify-content-center flex-wrap">
        <li className={`page-item ${currentPage === 0 ? 'disabled' : ''}`}>
          <button className="page-link" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 0} aria-label="Page précédente">
            &lsaquo;
          </button>
        </li>
        {pagesVisibles(currentPage, totalPages).map((p, i) =>
          p === '…' ? (
            <li key={`ellipse-${i}`} className="page-item disabled" aria-hidden="true">
              <span className="page-link">…</span>
            </li>
          ) : (
            <li key={p} className={`page-item ${p === currentPage ? 'active' : ''}`}>
              <button className="page-link" onClick={() => onPageChange(p)} aria-current={p === currentPage ? 'page' : undefined}>
                {p + 1}
              </button>
            </li>
          )
        )}
        <li className={`page-item ${currentPage === totalPages - 1 ? 'disabled' : ''}`}>
          <button className="page-link" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages - 1} aria-label="Page suivante">
            &rsaquo;
          </button>
        </li>
      </ul>
    </nav>
  );
};

export default Pagination;

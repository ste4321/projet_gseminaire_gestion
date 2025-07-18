import React from 'react';

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  return (
    <nav className="mt-3" aria-label="Pagination">
      <ul className="pagination justify-content-center">
        <li className={`page-item ${currentPage === 0 ? 'disabled' : ''}`}>
          <button className="page-link" onClick={() => onPageChange(0)}>
            &laquo;
          </button>
        </li>
        {Array.from({ length: totalPages }, (_, i) => (
          <li key={i} className={`page-item ${i === currentPage ? 'active' : ''}`}>
            <button className="page-link" onClick={() => onPageChange(i)}>
              {i + 1}
            </button>
          </li>
        ))}
        <li className={`page-item ${currentPage === totalPages - 1 ? 'disabled' : ''}`}>
          <button className="page-link" onClick={() => onPageChange(totalPages - 1)}>
            &raquo;
          </button>
        </li>
      </ul>
    </nav>
  );
};

export default Pagination;

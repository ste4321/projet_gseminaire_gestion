import React from 'react';

// Champ de recherche commun : loupe, bouton pour effacer, Échap pour vider
const SearchBar = ({ searchTerm, onSearchChange, placeholder = 'Rechercher...', className = 'mb-3' }) => (
  <div className={`input-group input-group-merge gstf-recherche ${className}`}>
    <span className="input-group-text" aria-hidden="true"><i className="bx bx-search"></i></span>
    <input
      type="search"
      className="form-control"
      placeholder={placeholder}
      aria-label={placeholder}
      value={searchTerm}
      onChange={(e) => onSearchChange(e.target.value)}
      onKeyDown={(e) => e.key === 'Escape' && searchTerm && onSearchChange('')}
    />
    {searchTerm && (
      <button type="button" className="input-group-text gstf-recherche__effacer" onClick={() => onSearchChange('')} aria-label="Effacer la recherche">
        <i className="bx bx-x"></i>
      </button>
    )}
  </div>
);

export default SearchBar;

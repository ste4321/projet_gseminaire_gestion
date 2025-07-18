import React from 'react';

const SearchBar = ({ searchTerm, onSearchChange, placeholder = "Rechercher..." }) => {
  return (
    <input
      type="text"
      placeholder={placeholder}
      className="form-control mb-3"
      value={searchTerm}
      onChange={(e) => onSearchChange(e.target.value)}
    />
  );
};

export default SearchBar;

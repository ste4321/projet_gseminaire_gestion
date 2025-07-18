import React from 'react';

const DataTable = ({ 
  headers, 
  data, 
  onRowClick, 
  onEdit, 
  onDelete, 
  showActions = true,
  role,
  renderCell // fonction pour personnaliser le rendu des cellules
}) => {
  return (
    <div className="card">
      <div className="table-responsive text-nowrap">
        <table className="table table-hover">
          <thead>
            <tr>
              {headers.map((header, index) => (
                <th key={index}>{header.label}</th>
              ))}
              {showActions && role === 'admin' && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {data.map((item, index) => (
              <tr 
                key={item.id || index} 
                onClick={() => onRowClick && onRowClick(item)}
                style={{ cursor: onRowClick ? 'pointer' : 'default' }}
              >
                {headers.map((header, headerIndex) => (
                  <td key={headerIndex}>
                    {renderCell ? renderCell(item, header.field) : item[header.field]}
                  </td>
                ))}
                {showActions && role === 'admin' && (
                  <td>
                    <button
                      className="btn btn-sm btn-outline-primary me-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(item);
                      }}
                      title="Modifier"
                    >
                      <i className="bx bx-edit"></i>
                    </button>
                    <button
                      className="btn btn-sm btn-outline-primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(item.id);
                      }}
                      title="Supprimer"
                    >
                      <i className="bx bx-trash"></i>
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DataTable;

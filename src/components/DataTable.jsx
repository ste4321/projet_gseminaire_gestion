import React from 'react';

const DataTable = ({
  headers,
  data,
  onRowClick,
  onEdit,
  onDelete,
  showActions = true,
  role,
  actionLabel, // bouton explicite qui déclenche onRowClick (ex : « Notes »)
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
                  <td className="text-nowrap">
                    {/* Chaque bouton n'apparaît que si la page fournit l'action correspondante */}
                    {actionLabel && onRowClick && (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary me-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRowClick(item);
                        }}
                      >
                        <i className="bx bx-spreadsheet me-1"></i>{actionLabel}
                      </button>
                    )}
                    {onEdit && (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary me-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(item);
                        }}
                        title="Modifier"
                        aria-label="Modifier"
                      >
                        <i className="bx bx-edit"></i>
                      </button>
                    )}
                    {onDelete && (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(item.id);
                        }}
                        title="Supprimer"
                        aria-label="Supprimer"
                      >
                        <i className="bx bx-trash"></i>
                      </button>
                    )}
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

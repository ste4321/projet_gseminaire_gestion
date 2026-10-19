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
  renderCell, // fonction pour personnaliser le rendu des cellules
  loading = false, // premier chargement : lignes squelette à la place des données
  skeletonRows = 8,
  refreshing = false // nouvelles données en route : lignes actuelles estompées
}) => {
  const avecActions = showActions && role === 'admin';

  if (loading) {
    return (
      <div className="card">
        <div className="table-responsive text-nowrap">
          <table className="table" aria-busy="true">
            <thead>
              <tr>
                {headers.map((header, index) => (
                  <th key={index}>{header.label}</th>
                ))}
                {avecActions && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: skeletonRows }, (_, ligne) => (
                <tr key={ligne}>
                  {headers.map((header, colonne) => (
                    <td key={colonne}>
                      {/* largeurs variées pour un rendu proche du vrai tableau */}
                      <span className="gstf-squelette" style={{ width: `${55 + ((ligne * 3 + colonne * 7) % 5) * 9}%`, height: '0.875rem' }} />
                    </td>
                  ))}
                  {avecActions && (
                    <td className="text-nowrap">
                      <span className="gstf-squelette d-inline-block me-2" style={{ width: '2rem', height: '1.9rem' }} />
                      <span className="gstf-squelette d-inline-block" style={{ width: '2rem', height: '1.9rem' }} />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className={`card gstf-table ${refreshing ? 'is-refreshing' : ''}`} aria-busy={refreshing}>
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

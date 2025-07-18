import React from 'react';

const DetailModal = ({ 
  modalId, 
  title, 
  data, 
  fields,
  customRender // fonction pour personnaliser le rendu des détails
}) => {
  return (
    <div className="modal fade" id={modalId} tabIndex="-1">
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content rounded-3 shadow-sm border-0">
          <div className="modal-header border-bottom-0 pb-0">
            <h4 className="modal-title w-100 text-center fw-semibold text-dark">
              {title}
            </h4>
          </div>
          <div className="modal-body px-4 py-3">
            {customRender ? customRender(data) : (
              fields.map((field, index) => (
                <div key={index} className="mb-3">
                  <strong>{field.label}:</strong> {data?.[field.name] || 'N/A'}
                </div>
              ))
            )}
          </div>
          <div className="modal-footer">
            <button className="btn btn-outline-secondary" data-bs-dismiss="modal">
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetailModal;
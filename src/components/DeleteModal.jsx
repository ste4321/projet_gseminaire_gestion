import React from 'react';

const DeleteModal = ({ 
  modalId, 
  title = "Confirmer la suppression", 
  message, 
  onConfirm, 
  loading 
}) => {
  return (
    <div className="modal fade" id={modalId} tabIndex="-1">
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{title}</h5>
          </div>
          <div className="modal-body">
            <p>{message}</p>
          </div>
          <div className="modal-footer">
            <button className="btn btn-outline-secondary" data-bs-dismiss="modal">
              Annuler
            </button>
            <button 
              className="btn btn-danger d-flex align-items-center" 
              onClick={onConfirm} 
              disabled={loading}
            >
              Supprimer
              {loading && <span className="spinner-border spinner-border-sm ms-2" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteModal;

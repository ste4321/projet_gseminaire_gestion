import React from 'react';

const EditModal = ({ 
  modalId, 
  title, 
  fields, 
  formData, 
  onFormChange, 
  onSubmit, 
  loading,
  buttonText = "Enregistrer"
}) => {
  return (
    <div className="modal fade" id={modalId} tabIndex="-1">
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content p-3">
          <div className="modal-header">
            <h5 className="modal-title">{title}</h5>
          </div>
          <div className="modal-body">
            {fields.map((field, index) => (
              <div key={index} className="mb-2">
                <label className="form-label">{field.label}</label>
                
                {/* Gestion des différents types de champs */}
                {field.type === 'textarea' ? (
                  <textarea
                    className="form-control p-3"
                    rows={field.rows || 3}
                    value={formData[field.name] || ''}
                    onChange={(e) => onFormChange(field.name, e.target.value)}
                    required={field.required}
                  />
                ) : field.type === 'select' ? (
                  <select
                    className="form-select"
                    value={formData[field.name] || ''}
                    onChange={(e) => onFormChange(field.name, e.target.value)}
                    required={field.required}
                  >
                    <option value="">Sélectionner...</option>
                    {field.options?.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : field.type === 'file' ? (
                  <input
                    type="file"
                    className="form-control"
                    accept={field.accept}
                    onChange={(e) => onFormChange(field.name, e.target.files[0])}
                    required={field.required}
                  />
                ) : (
                  <input
                    type={field.type || 'text'}
                    className="form-control"
                    value={formData[field.name] || ''}
                    onChange={(e) => onFormChange(field.name, e.target.value)}
                    required={field.required}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="modal-footer">
            <button className="btn btn-outline-secondary" data-bs-dismiss="modal">
              Annuler
            </button>
            <button 
              className="btn btn-primary d-flex align-items-center" 
              onClick={onSubmit} 
              disabled={loading}
            >
              {buttonText}
              {loading && <span className="spinner-border spinner-border-sm ms-2" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditModal;
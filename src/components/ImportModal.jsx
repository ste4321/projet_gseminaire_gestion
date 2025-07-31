import React, { useState } from 'react';

const ImportModal = ({ modalId, title, onImport, loading, acceptedFormats = ".csv,.xlsx,.xls", description }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    setSelectedFile(file);
    setUploadProgress(0);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      setUploadProgress(0);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedFile && onImport) {
      setUploadProgress(0);
      try {
        await onImport(selectedFile, setUploadProgress);
      } catch (error) {
        console.error('Erreur durant l\'import:', error);
      }
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setDragActive(false);
    setUploadProgress(0);
  };

  const getFileIcon = (filename) => {
    if (!filename) return 'bx-file';
    
    const ext = filename.split('.').pop().toLowerCase();
    switch (ext) {
      case 'csv':
        return 'bx-file-blank';
      case 'xlsx':
      case 'xls':
        return 'bx-spreadsheet';
      default:
        return 'bx-file';
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="modal fade" id={modalId} tabIndex="-1" aria-hidden="true">
      <div className="modal-dialog modal-md">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{title}</h5>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              {description && (
                <div className="alert alert-info" role="alert">
                  <i className="bx bx-info-circle me-2"></i>
                  {description}
                </div>
              )}

              {/* Zone de drag and drop */}
              <div 
                className={`border-2 border-dashed rounded p-4 text-center mb-3 ${
                  dragActive ? 'border-primary bg-light' : 'border-muted'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <div className="mb-3">
                  <i className="bx bx-cloud-upload display-4 text-muted"></i>
                </div>
                
                <h6 className="mb-2">Glissez-déposez votre fichier ici</h6>
                <p className="text-muted small mb-3">ou</p>
                
                <div className="mb-3">
                  <input
                    type="file"
                    className="form-control"
                    accept={acceptedFormats}
                    onChange={handleFileSelect}
                    disabled={loading}
                  />
                </div>
                
                <small className="text-muted">
                  Formats acceptés: {acceptedFormats.replace(/\./g, '').toUpperCase()}
                </small>
              </div>

              {/* Aperçu du fichier sélectionné */}
              {selectedFile && (
                <div className="card">
                  <div className="card-body">
                    <div className="d-flex align-items-center">
                      <i className={`bx ${getFileIcon(selectedFile.name)} text-primary me-3`} style={{ fontSize: '2rem' }}></i>
                      <div className="flex-grow-1">
                        <h6 className="mb-1">{selectedFile.name}</h6>
                        <small className="text-muted">
                          {formatFileSize(selectedFile.size)} • {selectedFile.type || 'Type inconnu'}
                        </small>
                      </div>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => setSelectedFile(null)}
                        disabled={loading}
                      >
                        <i className="bx bx-x"></i>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Barre de progression */}
              {loading && uploadProgress > 0 && (
                <div className="mb-3">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <small className="text-muted">Progression de l'import</small>
                    <small className="text-muted">{uploadProgress}%</small>
                  </div>
                  <div className="progress" style={{ height: '8px' }}>
                    <div 
                      className="progress-bar progress-bar-striped progress-bar-animated" 
                      role="progressbar" 
                      style={{ width: `${uploadProgress}%` }}
                      aria-valuenow={uploadProgress} 
                      aria-valuemin="0" 
                      aria-valuemax="100"
                    ></div>
                  </div>
                </div>
              )}

              {/* Instructions d'utilisation */}
              <div className="mt-3">
                <h6>Instructions :</h6>
                <ul className="small text-muted">
                  <li>Le nom du fichier doit être comme par exemple : <strong>Etudiant_L1_2025-2026.xlsx</strong></li>
                  <li>La première ligne doit contenir les en-têtes suivants : 
                    <strong> nom_prenom, matricule, diocese, email, telephone</strong></li>
                  <li>Taille maximale : <strong>10MB</strong></li>
                  <li>⏱️ Les gros fichiers (100+ lignes) peuvent prendre plusieurs minutes à traiter</li>
                </ul>
              </div>

              {/* Avertissement pour les gros fichiers */}
              {selectedFile && selectedFile.size > 1024 * 1024 && (
                <div className="alert alert-warning" role="alert">
                  <i className="bx bx-time me-2"></i>
                  <strong>Fichier volumineux détecté</strong><br/>
                  L'import peut prendre plusieurs minutes. Veuillez patienter et ne pas fermer cette fenêtre.
                </div>
              )}
            </div>
            
            <div className="modal-footer">
              <button 
                type="button" 
                className="btn btn-secondary" 
                data-bs-dismiss="modal"
                onClick={handleClose}
                disabled={loading}
              >
                Annuler
              </button>
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={!selectedFile || loading}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Importation en cours...
                  </>
                ) : (
                  <>
                    <i className="bx bx-upload me-1"></i>
                    Importer
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ImportModal;
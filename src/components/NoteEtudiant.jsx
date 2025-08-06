import React, { useEffect, useState } from 'react';
import { useEtudiant } from '../contexts/EtudiantContext';
import axios from 'axios';
import { useEtudiantParcours } from '../contexts/EtudiantParcoursContext';

// Import des composants modulaires
import SearchBar from './SearchBar';
import DataTable from './DataTable';
import Pagination from './Pagination';

const NoteEtudiant = () => {
  const { etudiantParcours } = useEtudiantParcours();
  const { etudiants, setEtudiants, loading } = useEtudiant();
  const [selectedFile, setSelectedFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [importLoading, setImportLoading] = useState(false);
  // États pour les filtres
  const [selectedAnnee, setSelectedAnnee] = useState('');
  const [niveau, setNiveau] = useState(1); // Par défaut L1
  const [searchTerm, setSearchTerm] = useState('');
  
  // États pour les notes
  const [selectedEtudiant, setSelectedEtudiant] = useState(null);
  const [matieres, setMatieres] = useState([]);
  const [notes, setNotes] = useState([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  
  // État pour la pagination
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 10;
  
  // État pour le rôle
  const [role, setRole] = useState(localStorage.getItem('role'));

  // Effet pour initialiser les valeurs par défaut
  useEffect(() => {
    if (etudiantParcours.length > 0) {
      // Trouver l'année académique actuelle (la plus récente)
      const anneeIds = etudiantParcours
        .map(p => p.annee_academique?.id)
        .filter(Boolean);
      
      if (anneeIds.length > 0) {
        const maxAnneeId = Math.max(...anneeIds);
        setSelectedAnnee(String(maxAnneeId));
      }
    }
  }, [etudiantParcours]);

  // Obtenir les années académiques uniques
  const annees = etudiantParcours
    .map(p => p.annee_academique)
    .filter((annee, index, self) => 
      annee && self.findIndex(a => a?.id === annee.id) === index
    )
    .sort((a, b) => b.id - a.id); // Trier par ID décroissant (plus récent en premier)

  // Filtrage des étudiants basé sur l'année et le niveau
  const filteredParcours = etudiantParcours.filter(p => {
    const matchAnnee = !selectedAnnee || p.annee_academique?.id == selectedAnnee;
    const matchNiveau = p.niveau?.niveau === `L${niveau}`;
    return matchAnnee && matchNiveau;
  });

  const filteredEtudiants = filteredParcours
    .map(parcours => {
      const etu = parcours.etudiant;
      return {
        id: etu?.id,
        nom_prenom: etu?.nom_prenom,
        matricule: etu?.matricule,
        email: etu?.email,
        telephone: etu?.telephone,
        diocese: etu?.diocese,
        niveau: parcours?.niveau?.niveau,
        filiere: '--',
        parcours_id: parcours?.id,
        original: parcours
      };
    })
    .filter(etudiant =>
      Object.values(etudiant).some(val =>
        typeof val === 'string' && val.toLowerCase().includes(searchTerm.toLowerCase())
      )
    );

  const totalPages = Math.ceil(filteredEtudiants.length / itemsPerPage);
  const currentEtudiants = filteredEtudiants.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage
  );

  // Configuration des en-têtes du tableau
  const tableHeaders = [
    { label: 'Nom', field: 'nom_prenom' },
    { label: 'Matricule', field: 'matricule' },
    { label: 'Email', field: 'email' },
    { label: 'Niveau', field: 'niveau' },
    { label: 'Filière', field: 'filiere' }
  ];

  // Handlers
  const handleSearchChange = (value) => {
    setSearchTerm(value);
    setCurrentPage(0);
  };

  const handleNiveauChange = (newNiveau) => {
    setNiveau(newNiveau);
    setCurrentPage(0);
  };

  const handleAnneeChange = (newAnnee) => {
    setSelectedAnnee(newAnnee);
    setCurrentPage(0);
  };

  // Fonction pour ouvrir le modal des notes
  const openNotesModal = async (etudiant) => {
    setSelectedEtudiant(etudiant);
  
    // Afficher modal de chargement
    const loading = new window.bootstrap.Modal(document.getElementById('loadingModal'));
    loading.show();
  
    try {
      // Récupérer les matières
      const matieresResponse = await axios.get(`http://127.0.0.1:8000/api/matieres/niveau/${niveau}`);
      setMatieres(matieresResponse.data);
  
      // Récupérer les notes
      const notesResponse = await axios.get(`http://127.0.0.1:8000/api/notes/etudiant-parcours/${etudiant.parcours_id}`);
      setNotes(notesResponse.data);
  
      // Fermer le modal de chargement
      loading.hide();
  
      // Afficher modal des notes
      const modal = new window.bootstrap.Modal(document.getElementById('notesModal'));
      modal.show();
    } catch (error) {
      console.error("Erreur lors du chargement des notes :", error);
      alert("Erreur lors du chargement des notes");
      loading.hide();
    }
  };
  

  // Fonction pour mettre à jour une note
  const handleNoteChange = (matiereId, noteValue) => {
    setNotes(prevNotes => {
      const existingNote = prevNotes.find(n => n.id_matiere === matiereId);
      
      if (existingNote) {
        // Mettre à jour la note existante
        return prevNotes.map(n => 
          n.id_matiere === matiereId 
            ? { ...n, note: noteValue }
            : n
        );
      } else {
        // Ajouter une nouvelle note
        return [...prevNotes, {
          id_etudiant_parcours: selectedEtudiant.parcours_id,
          id_matiere: matiereId,
          note: noteValue,
          statut: ''
        }];
      }
    });
  };

  // Fonction pour sauvegarder les notes
  const handleSaveNotes = async () => {
    setSavingNotes(true);
    
    try {
      await axios.post(`http://127.0.0.1:8000/api/notes/update-bulk`, {
        etudiant_parcours_id: selectedEtudiant.parcours_id,
        notes: notes
      });
      
      alert("Notes sauvegardées avec succès !");
      
      // Fermer le modal
      const modal = window.bootstrap.Modal.getInstance(document.getElementById('notesModal'));
      if (modal) modal.hide();
      
    } catch (error) {
      console.error("Erreur lors de la sauvegarde :", error);
      alert("Erreur lors de la sauvegarde des notes");
    } finally {
      setSavingNotes(false);
    }
  };

  // Fonction pour annuler et fermer le modal
  const handleCancelNotes = () => {
    const modal = window.bootstrap.Modal.getInstance(document.getElementById('notesModal'));
    if (modal) modal.hide();
    setSelectedEtudiant(null);
    setNotes([]);
    setMatieres([]);
  };

  // Fonction pour obtenir la note d'une matière
  const getNoteForMatiere = (matiereId) => {
    const note = notes.find(n => n.id_matiere === matiereId);
    return note ? note.note : '';
  };
  const handleFileSelect = (e) => {
    setSelectedFile(e.target.files[0]);
    setUploadProgress(0);
  };
  
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    if (e.type === "dragleave") setDragActive(false);
  };
  
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
      setUploadProgress(0);
    }
  };
  
  const handleModalClose = () => {
    setSelectedFile(null);
    setDragActive(false);
    setUploadProgress(0);
  };
  
  const getFileIcon = (filename) => {
    const ext = filename?.split('.').pop().toLowerCase();
    if (ext === 'csv') return 'bx-file-blank';
    if (ext === 'xlsx' || ext === 'xls') return 'bx-spreadsheet';
    return 'bx-file';
  };
  
  const formatFileSize = (bytes) => {
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  const handleImportSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;
  
    // Vérifier le format du nom de fichier
    const match = selectedFile.name.match(/^NOTES_([A-Z0-9]+)_L([1-3])_([0-9]{4}-[0-9]{4})\.xlsx$/i);
    if (!match) {
      alert("Nom de fichier invalide. Format attendu : NOTES_CODEMATIERE_LNIVEAU_ANNEE.xlsx (ex: NOTES_FRS_L1_2022-2023.xlsx)");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);
    // Ne pas ajouter les paramètres supplémentaires car le contrôleur les extrait du nom du fichier
  
    setImportLoading(true);
    setUploadProgress(0);
  
    try {
      const response = await axios.post("http://127.0.0.1:8000/api/notes/import", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (progressEvent) => {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percent);
        },
      });
  
      alert(`Importation réussie ! ${response.data.message}`);
      
      // Afficher les erreurs s'il y en a
      if (response.data.errors && response.data.errors.length > 0) {
        console.log("Erreurs lors de l'importation :", response.data.errors);
        alert(`Importation terminée avec ${response.data.errors.length} erreur(s). Consultez la console pour plus de détails.`);
      }
      
      // Fermer le modal et rafraîchir
      const modal = window.bootstrap.Modal.getInstance(document.getElementById('importNotesModal'));
      if (modal) modal.hide();
      } catch (err) {
      console.error("Erreur lors de l'importation :", err);
      
      // Afficher un message d'erreur plus détaillé
      if (err.response && err.response.data && err.response.data.message) {
        alert(`Erreur lors de l'importation : ${err.response.data.message}`);
      } else {
        alert("Erreur lors de l'importation. Vérifiez le format du fichier et réessayez.");
      }
    } finally {
      setImportLoading(false);
    }
  };
  
  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status"></div>
        <p className="mt-3">Chargement des notes...</p>
      </div>
    );
  }

  return (
    <div className="container-xxl flex-grow-1 container-p-y">
      <h4 className="fw-bold py-3 mb-4">
        <span className="text-muted fw-light text-capitalize">{role} /</span> Gestion des Notes
      </h4>

      {/* 🔹 Filtre année académique */}
      <div className="mb-3">
        <label className="form-label">Année académique:</label>
        <select
          className="form-select w-auto d-inline ms-2"
          value={selectedAnnee || ''}
          onChange={e => handleAnneeChange(e.target.value)}
        >
          {annees.map(a => (
            <option key={a.id} value={a.id}>{a.annee_aca}</option>
          ))}
        </select>
      </div>

      {/* 🔹 Sélecteur de niveau (L1–L3) */}
      <ul className="nav nav-pills mb-3">
        {[1, 2, 3].map(i => (
          <li className="nav-item" key={i}>
            <button
              className={`nav-link ${niveau === i ? 'active' : ''}`}
              onClick={() => handleNiveauChange(i)}
            >
              Notes des étudiants en L{i}
            </button>
          </li>
        ))}
      </ul>

      <div className="card">
        <h5 className="card-header">
          Gestion des notes - L{niveau}
          {selectedAnnee && annees.find(a => a.id == selectedAnnee) && (
            <span className="text-muted ms-2">
              - {annees.find(a => a.id == selectedAnnee)?.annee_aca}
            </span>
          )}
        </h5>
        {role === 'admin' && (
        <div className="mb-3 ms-4">
          <button className="btn btn-success ms-3" onClick={() => {
            const modal = new window.bootstrap.Modal(document.getElementById('importNotesModal'));
            modal.show();
          }}>
            <i className="bx bx-import me-1"></i>
            Importer fichier
          </button>
          </div>
      )}
      <div className="modal fade" id="importNotesModal" tabIndex="-1" aria-hidden="true">
        <div className="modal-dialog modal-md">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Importer un fichier de notes</h5>
            </div>

            <form onSubmit={handleImportSubmit}>
              <div className="modal-body">
                {/* <div className="alert alert-info">
                  Le fichier doit être nommé <strong>NOTES_FRS_L1_2025-2026.xlsx</strong><br />
                  Doit contenir les colonnes : <strong>matricule</strong> et <strong>note</strong>
                </div> */}

                {/* Zone Drag and Drop */}
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
                      accept=".csv,.xlsx,.xls"
                      onChange={handleFileSelect}
                      disabled={importLoading}
                    />
                  </div>

                  <small className="text-muted">
                    Formats acceptés : CSV, XLSX, XLS
                  </small>
                </div>

                {/* Fichier sélectionné */}
                {selectedFile && (
                  <div className="card">
                    <div className="card-body d-flex align-items-center">
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
                        disabled={importLoading}
                      >
                        <i className="bx bx-x"></i>
                      </button>
                    </div>
                  </div>
                )}

                {/* Barre de progression */}
                {importLoading && uploadProgress > 0 && (
                  <div className="mb-3 mt-3">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <small className="text-muted">Progression</small>
                      <small className="text-muted">{uploadProgress}%</small>
                    </div>
                    <div className="progress" style={{ height: '8px' }}>
                      <div
                        className="progress-bar progress-bar-striped progress-bar-animated"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Instructions */}
                <div className="mt-4">
                  <h6>Instructions :</h6>
                  <ul className="small text-muted">
                    <li>Le nom du fichier doit être comme par exemple : <strong>NOTES_FRS_L1_2022-2023.xlsx</strong></li>
                    <li>Colonnes obligatoires : <strong>matricule</strong>, <strong>note</strong></li>
                    <li>Taille maximale : 10 MB</li>
                    <li>Un fichier lourd peut nécessiter plusieurs minutes de traitement</li>
                  </ul>
                </div>

                {selectedFile && selectedFile.size > 1024 * 1024 && (
                  <div className="alert alert-warning mt-3">
                    <i className="bx bx-time me-2"></i>
                    <strong>Fichier volumineux</strong><br />
                    L'import peut prendre du temps. Ne fermez pas cette fenêtre.
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  data-bs-dismiss="modal"
                  onClick={handleModalClose}
                  disabled={importLoading}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!selectedFile || importLoading}
                >
                  {importLoading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      Importation...
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

        {/* Barre de recherche dans la carte */}
        <div className="card-body pb-0">
          <SearchBar
            searchTerm={searchTerm}
            onSearchChange={handleSearchChange}
            placeholder="Rechercher un étudiant..."
          />
        </div>

        <DataTable
          headers={tableHeaders}
          data={currentEtudiants}
          onRowClick={openNotesModal}
          role={role}
          renderCell={(etudiant, field) => {
            const value = etudiant[field];
            return value ? value : '--';
          }}
          actionLabel="Voir/Modifier Notes"
        />

        {currentEtudiants.length === 0 && (
          <div className="text-center py-4 text-warning">
            Aucun étudiant trouvé pour L{niveau} 
            {selectedAnnee && annees.find(a => a.id == selectedAnnee) && (
              <span> en {annees.find(a => a.id == selectedAnnee)?.annee_aca}</span>
            )}
          </div>
        )}

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </div>
      {/* Modal de chargement pendant récupération des notes */}
      <div className="modal fade" id="loadingModal" tabIndex="-1" aria-hidden="true" data-bs-backdrop="static">
        <div className="modal-dialog modal-sm modal-dialog-centered">
          <div className="modal-content text-center p-4">
            <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '80px' }}>
              <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}></div>
            </div>
            <p className="mt-3 mb-0">Chargement des données...</p>
          </div>
        </div>
      </div>

      {/* Modal des Notes */}
      <div className="modal fade" id="notesModal" tabIndex="-1" aria-hidden="true">
        <div className="modal-dialog modal-xl">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">
                Notes de : {selectedEtudiant?.nom_prenom}
              </h5>
              {/* <button type="button" className="btn-close" onClick={handleCancelNotes}></button> */}
            </div>
            <div className="modal-body">
              {loadingNotes ? (
                <div className="text-center py-4">
                  <div className="spinner-border text-primary" role="status"></div>
                  <p className="mt-2">Chargement des notes...</p>
                </div>
              ) : (
                <>
                  {/* Informations de l'étudiant */}
                  <div className="card mb-4">
                    <div className="card-body">
                      <div className="row">
                        <div className="col-md-6">
                          <p><strong>Matricule:</strong> {selectedEtudiant?.matricule}</p>
                          <p><strong>Niveau:</strong> {selectedEtudiant?.niveau}</p>
                          <p><strong>Année académique:</strong> {
                            annees.find(a => a.id == selectedAnnee)?.annee_aca || '--'
                          }</p>
                          <p><strong>Diocese :</strong> {selectedEtudiant?.diocese}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tableau des notes */}
                  <div className="card">
                    <div className="card-body">
                      <h6 className="card-title">Notes par matière</h6>
                      <div className="table-responsive">
                        <table className="table table-striped">
                          <thead>
                            <tr>
                              <th>Code Matière</th>
                              <th>Matière</th>
                              {/* <th>Heures</th> */}
                              {/* <th>Coefficient</th> */}
                              <th>Note (/20)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {matieres.map(matiere => (
                              <tr key={matiere.id}>
                                <td>{matiere.code_matiere}</td>
                                <td>{matiere.matiere}</td>
                                {/* <td>{matiere.heures}</td> */}
                                {/* <td>{matiere.coefficient || '--'}</td> */}
                                <td>
                                  <input
                                    type="number"
                                    className="form-control"
                                    min="0"
                                    max="20"
                                    step="0.25"
                                    value={getNoteForMatiere(matiere.id)}
                                    onChange={(e) => handleNoteChange(matiere.id, e.target.value)}
                                    placeholder="--"
                                    style={{ width: '100px' }}
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="modal-footer">
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={handleCancelNotes}
                disabled={savingNotes}
              >
                Annuler
              </button>
              <button 
                type="button" 
                className="btn btn-primary" 
                onClick={handleSaveNotes}
                disabled={savingNotes || loadingNotes}
              >
                {savingNotes ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                    Sauvegarde...
                  </>
                ) : (
                  'Valider'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NoteEtudiant;
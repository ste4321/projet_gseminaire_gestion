import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useEtudiant } from '../contexts/EtudiantContext';
import api, { errorMessage } from '../api/client';
import { useFeedback } from '../contexts/FeedbackContext';
import { useEtudiantParcours } from '../contexts/EtudiantParcoursContext';
import { useNiveau } from '../contexts/NiveauContext';

// Import des composants modulaires
import SearchBar from './SearchBar';
import DataTable from './DataTable';
import Pagination from './Pagination';
import PublicationNotes from './PublicationNotes';
import StatutResultat from './StatutResultat';

import { telechargerBulletin } from '../utils/bulletin';

const NoteEtudiant = () => {
  const { notify, confirm } = useFeedback();
  const { niveaux } = useNiveau();
  const { etudiantParcours } = useEtudiantParcours();
  const { loading } = useEtudiant();
  const [selectedFile, setSelectedFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [importLoading, setImportLoading] = useState(false);
  // États pour les filtres
  const [selectedAnnee, setSelectedAnnee] = useState('');
  const [niveau, setNiveau] = useState(1); // Par défaut L1
  const [searchTerm, setSearchTerm] = useState('');

  // États de la fenêtre « Notes de … » : relevé calculé par le serveur + valeurs en cours de saisie
  const [selectedEtudiant, setSelectedEtudiant] = useState(null);
  const [releve, setReleve] = useState(null);
  const [saisie, setSaisie] = useState({}); // id_matiere → valeur saisie ('' = pas de note)
  const [modifie, setModifie] = useState(false);
  const [erreurNotes, setErreurNotes] = useState(null);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [versionNotes, setVersionNotes] = useState(0); // rafraîchit le panneau de publication

  // État pour la pagination
  // État pour la pagination
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 10;

  // État pour le rôle
  const [role] = useState(localStorage.getItem('role'));
  const niveauCourant = niveaux.find((n) => n.niveau === `L${niveau}`);

  // Remise à zéro quand la fenêtre des notes se ferme (bouton, Échap désactivé, etc.)
  useEffect(() => {
    const el = document.getElementById('notesModal');
    if (!el) return undefined;
    const reinitialiser = () => {
      setSelectedEtudiant(null);
      setReleve(null);
      setSaisie({});
      setModifie(false);
      setErreurNotes(null);
    };
    el.addEventListener('hidden.bs.modal', reinitialiser);
    return () => el.removeEventListener('hidden.bs.modal', reinitialiser);
  });

  // Effet pour initialiser les valeurs par défaut
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
    const matchAnnee = !selectedAnnee || String(p.annee_academique?.id) === String(selectedAnnee);
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
    { label: 'Niveau', field: 'niveau' }
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

  const notesModal = () => window.bootstrap.Modal.getOrCreateInstance(document.getElementById('notesModal'));

  const chargerReleve = async (parcoursId) => {
    const res = await api.get(`/notes/releve/${parcoursId}`);
    const valeurs = {};
    res.data.semestres.forEach((s) => s.matieres.forEach((m) => {
      valeurs[m.id] = m.note === null ? '' : String(m.note);
    }));
    setReleve(res.data);
    setSaisie(valeurs);
    setModifie(false);
  };

  // Une seule fenêtre, ouverte tout de suite : le chargement s'affiche à l'intérieur
  const openNotesModal = async (etudiant) => {
    setSelectedEtudiant(etudiant);
    setReleve(null);
    setErreurNotes(null);
    setLoadingNotes(true);
    notesModal().show();
    try {
      await chargerReleve(etudiant.parcours_id);
    } catch (error) {
      setErreurNotes(errorMessage(error, 'Erreur lors du chargement des notes.'));
    } finally {
      setLoadingNotes(false);
    }
  };

  const handleNoteChange = (matiereId, valeur) => {
    setSaisie((prev) => ({ ...prev, [matiereId]: valeur }));
    setModifie(true);
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      await api.post('/notes/update-bulk', {
        etudiant_parcours_id: selectedEtudiant.parcours_id,
        notes: Object.entries(saisie).map(([id, note]) => ({ id_matiere: Number(id), note: note === '' ? null : note })),
      });
      await chargerReleve(selectedEtudiant.parcours_id);
      setVersionNotes((v) => v + 1);
      notify.success('Notes enregistrées. Moyenne et résultat recalculés.');
    } catch (error) {
      notify.error(errorMessage(error, "Erreur lors de l'enregistrement des notes."));
    } finally {
      setSavingNotes(false);
    }
  };

  const fermerNotes = async () => {
    if (modifie && !(await confirm({
      title: 'Modifications non enregistrées',
      message: 'Fermer sans enregistrer les notes saisies ?',
      confirmLabel: 'Fermer sans enregistrer',
      danger: true,
    }))) return;
    notesModal().hide();
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
    // Même règle que le serveur : NOTES_<CODE>_<NIVEAU>_<ANNEE>.xlsx (L1…L3, M1, M2)
    const match = selectedFile.name.match(/^NOTES_([A-Z0-9]+)_([A-Z]?[0-9])_([0-9]{4}-[0-9]{4})\.(xlsx|xls|csv)$/i);
    if (!match) {
      notify.error("Nom de fichier invalide. Format attendu : NOTES_<CODE_MATIERE>_<NIVEAU>_<ANNÉE>.xlsx\nExemple : NOTES_FRS_L1_2025-2026.xlsx", { title: 'Fichier refusé' });
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);
    // Ne pas ajouter les paramètres supplémentaires car le contrôleur les extrait du nom du fichier

    setImportLoading(true);
    setUploadProgress(0);

    try {
      const response = await api.post("/notes/import", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (progressEvent) => {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percent);
        },
      });

      const erreurs = response.data.errors || [];
      if (erreurs.length > 0) {
        const apercu = erreurs.slice(0, 5).join('\n') + (erreurs.length > 5 ? `\n… et ${erreurs.length - 5} autre(s)` : '');
        notify.warning(`${response.data.message}\n${erreurs.length} ligne(s) ignorée(s) :\n${apercu}`, { title: 'Import partiel', duration: 15000 });
      } else {
        notify.success(response.data.message, { title: 'Import terminé' });
      }
      setVersionNotes((v) => v + 1);

      // Fermer le modal et rafraîchir
      const modal = window.bootstrap.Modal.getInstance(document.getElementById('importNotesModal'));
      if (modal) modal.hide();
      } catch (err) {
      console.error("Erreur lors de l'importation :", err);

      // Afficher un message d'erreur plus détaillé
      notify.error(errorMessage(err, "Erreur lors de l'importation. Vérifiez le format du fichier et réessayez."), { title: 'Import impossible' });
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
  // Bulletin PDF : relevé calculé par le serveur (moyenne pondérée, notes de 0 incluses),
  // même format que le bulletin téléchargé par l'étudiant.
  const generatePDF = async () => {
    if (!selectedEtudiant?.parcours_id) {
      notify.warning("Aucun étudiant sélectionné.");
      return;
    }
    try {
      const res = await api.get(`/notes/releve/${selectedEtudiant.parcours_id}`);
      await telechargerBulletin(res.data);
      notify.success("Bulletin PDF téléchargé (notes enregistrées uniquement).");
    } catch (error) {
      notify.error(errorMessage(error, "Le bulletin PDF n'a pas pu être généré."));
    }
  };



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

      {role === 'admin' && (
        <PublicationNotes anneeId={selectedAnnee} niveau={niveauCourant} version={versionNotes} />
      )}

      <div className="card">
        <h5 className="card-header">
          Gestion des notes - L{niveau}
          {selectedAnnee && annees.find(a => String(a.id) === String(selectedAnnee)) && (
            <span className="text-muted ms-2">
              - {annees.find(a => String(a.id) === String(selectedAnnee))?.annee_aca}
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
            // Matricule : ouvre le profil de l'étudiant (sans déclencher le clic sur la ligne)
            if (field === 'matricule' && value && role === 'admin') {
              return (
                <Link to={`/admin/listeEtudiant/${etudiant.id}`} className="gstf-lien-profil" onClick={(e) => e.stopPropagation()}
                  title={`Voir le profil de ${etudiant.nom_prenom}`}>
                  {value}
                </Link>
              );
            }
            return value ? value : '--';
          }}
          actionLabel="Notes"
        />

        {currentEtudiants.length === 0 && (
          <div className="text-center py-4 text-warning">
            Aucun étudiant trouvé pour L{niveau}
            {selectedAnnee && annees.find(a => String(a.id) === String(selectedAnnee)) && (
              <span> en {annees.find(a => String(a.id) === String(selectedAnnee))?.annee_aca}</span>
            )}
          </div>
        )}

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </div>
      {/* Fenêtre des notes d'un étudiant */}
      <div className="modal fade" id="notesModal" tabIndex="-1" aria-labelledby="notesModalTitre" aria-hidden="true" data-bs-backdrop="static" data-bs-keyboard="false">
        <div className="modal-dialog modal-xl modal-dialog-scrollable">
          <div className="modal-content">
            <div className="modal-header">
              <div>
                <h5 className="modal-title" id="notesModalTitre">Notes de {selectedEtudiant?.nom_prenom}</h5>
                <small className="text-muted">
                  {[selectedEtudiant?.matricule, releve?.niveau || selectedEtudiant?.niveau, releve?.annee,
                    selectedEtudiant?.diocese && `Diocèse : ${selectedEtudiant.diocese}`].filter(Boolean).join(' · ')}
                </small>
              </div>
              <button type="button" className="btn-close" aria-label="Fermer" onClick={fermerNotes} disabled={savingNotes}></button>
            </div>

            <div className="modal-body">
              {loadingNotes ? (
                <div className="text-center py-5" role="status">
                  <div className="spinner-border text-primary"></div>
                  <p className="mt-2 text-muted mb-0">Chargement des notes…</p>
                </div>
              ) : erreurNotes ? (
                <div className="alert alert-danger mb-0">{erreurNotes}</div>
              ) : releve && (releve.semestres.length === 0 ? (
                <p className="text-muted text-center py-4 mb-0">Aucune matière n'est enregistrée pour ce niveau.</p>
              ) : releve.semestres.map((s) => (
                <section className="mb-4" key={s.id ?? 'hors'}>
                  <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
                    <h6 className="gstf-section-title mb-0">{s.semestre}</h6>
                    {s.publie
                      ? <span className="badge bg-label-success">Publié</span>
                      : <span className="badge bg-label-secondary">Non publié</span>}
                    <span className="ms-auto small text-muted d-flex align-items-center gap-2">
                      Moyenne : <strong className="text-body">{s.moyenne === null ? '—' : `${Number(s.moyenne).toFixed(2)} / 20`}</strong>
                      <StatutResultat statut={s.statut} attente="Notes incomplètes" />
                    </span>
                  </div>
                  {s.publie && (
                    <p className="small text-warning mb-2">
                      <i className="bx bx-info-circle me-1"></i>
                      Semestre publié : toute modification enregistrée est aussitôt visible par l'étudiant.
                    </p>
                  )}
                  <div className="table-responsive">
                    <table className="table table-sm align-middle mb-0">
                      <thead>
                        <tr>
                          <th scope="col">Code</th>
                          <th scope="col">Matière</th>
                          <th scope="col" className="text-center">Coef.</th>
                          <th scope="col" className="text-center text-nowrap">Note /20</th>
                        </tr>
                      </thead>
                      <tbody>
                        {s.matieres.map((m) => (
                          <tr key={m.id}>
                            <td className="text-muted small">{m.code}</td>
                            <td>{m.matiere}</td>
                            <td className="text-center">{m.coefficient}</td>
                            <td className="text-center">
                              <input
                                type="number"
                                className="form-control form-control-sm mx-auto"
                                min="0"
                                max="20"
                                step="0.25"
                                value={saisie[m.id] ?? ''}
                                onChange={(e) => handleNoteChange(m.id, e.target.value)}
                                placeholder="—"
                                aria-label={`Note de ${m.matiere}`}
                                disabled={savingNotes}
                                style={{ width: '90px' }}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )))}
            </div>

            {releve && !loadingNotes && (
              <div className="gstf-notes-bilan">
                <div>
                  <span>Notes saisies</span>
                  <strong>{releve.general.notes_saisies} / {releve.general.matieres_total}</strong>
                </div>
                <div>
                  <span>Moyenne générale</span>
                  <strong>{releve.general.moyenne === null ? '—' : `${Number(releve.general.moyenne).toFixed(2)} / 20`}</strong>
                </div>
                <div>
                  <span>Résultat</span>
                  <strong><StatutResultat statut={releve.general.statut} attente="En attente de toutes les notes" /></strong>
                </div>
                {modifie && (
                  <p className="gstf-notes-bilan__note">
                    Modifications non enregistrées : la moyenne et le résultat seront recalculés à l'enregistrement.
                  </p>
                )}
              </div>
            )}

            <div className="modal-footer">
              <button type="button" className="btn btn-outline-primary me-auto" onClick={generatePDF} disabled={!releve || modifie || savingNotes}
                title={modifie ? "Enregistrez d'abord les notes" : undefined}>
                <i className="bx bx-download me-1"></i>Bulletin PDF
              </button>
              <button type="button" className="btn btn-outline-secondary" onClick={fermerNotes} disabled={savingNotes}>
                Fermer
              </button>
              <button type="button" className="btn btn-primary" onClick={handleSaveNotes} disabled={savingNotes || loadingNotes || !modifie}>
                {savingNotes ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                    Enregistrement…
                  </>
                ) : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NoteEtudiant;
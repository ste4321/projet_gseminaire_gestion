import React, { useEffect, useState } from 'react';
import { useEtudiant } from '../contexts/EtudiantContext';
import axios from 'axios';
import { useEtudiantParcours } from '../contexts/EtudiantParcoursContext';

// Import des composants modulaires
import SearchBar from './SearchBar';
import DataTable from './DataTable';
import Pagination from './Pagination';

const NoteEtudiant = () => {
  const { etudiantParcours, refetchParcours } = useEtudiantParcours();
  const { etudiants, setEtudiants, loading } = useEtudiant();
  
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
    setLoadingNotes(true);
    
    try {
      // Récupérer les matières pour le niveau
      const matieresResponse = await axios.get(`http://127.0.0.1:8000/api/matieres/niveau/${niveau}`);
      setMatieres(matieresResponse.data);
      
      // Récupérer les notes de l'étudiant
      const notesResponse = await axios.get(`http://127.0.0.1:8000/api/notes/etudiant-parcours/${etudiant.parcours_id}`);
      setNotes(notesResponse.data);
      
      // Ouvrir le modal
      const modal = new window.bootstrap.Modal(document.getElementById('notesModal'));
      modal.show();
      
    } catch (error) {
      console.error("Erreur lors du chargement des notes :", error);
      alert("Erreur lors du chargement des notes");
    } finally {
      setLoadingNotes(false);
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

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status"></div>
        <p className="mt-3">Chargement des étudiants...</p>
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

      {/* Modal des Notes */}
      <div className="modal fade" id="notesModal" tabIndex="-1" aria-hidden="true">
        <div className="modal-dialog modal-xl">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">
                Notes de {selectedEtudiant?.nom_prenom}
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
                      <h6 className="card-title">Informations de l'étudiant</h6>
                      <div className="row">
                        <div className="col-md-6">
                          <p><strong>Nom Prénom:</strong> {selectedEtudiant?.nom_prenom}</p>
                          <p><strong>Matricule:</strong> {selectedEtudiant?.matricule}</p>
                          <p><strong>Email:</strong> {selectedEtudiant?.email}</p>
                        </div>
                        <div className="col-md-6">
                          <p><strong>Téléphone:</strong> {selectedEtudiant?.telephone}</p>
                          <p><strong>Diocese:</strong> {selectedEtudiant?.diocese}</p>
                          <p><strong>Niveau:</strong> {selectedEtudiant?.niveau}</p>
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
                              <th>Heures</th>
                              <th>Coefficient</th>
                              <th>Note (/20)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {matieres.map(matiere => (
                              <tr key={matiere.id}>
                                <td>{matiere.code_matiere}</td>
                                <td>{matiere.matiere}</td>
                                <td>{matiere.heures}</td>
                                <td>{matiere.coefficient || '--'}</td>
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
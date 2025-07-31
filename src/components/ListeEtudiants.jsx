import React, { useEffect, useState } from 'react';
import { useEtudiant } from '../contexts/EtudiantContext';
import axios from 'axios';
import { useEtudiantParcours } from '../contexts/EtudiantParcoursContext';

// Import des composants modulaires
import SearchBar from './SearchBar';
import AddModal from './AddModal';
import EditModal from './EditModal';
import DeleteModal from './DeleteModal';
import DataTable from './DataTable';
import Pagination from './Pagination';
import DetailModal from './DetailModal';
import ImportModal from './ImportModal';

const ListeEtudiant = () => {
  const { etudiantParcours, refetchParcours } = useEtudiantParcours();
  const { etudiants, setEtudiants, loading } = useEtudiant();
  
  // États pour les filtres
  const [selectedAnnee, setSelectedAnnee] = useState('');
  const [niveau, setNiveau] = useState(1); // Par défaut L1
  const [searchTerm, setSearchTerm] = useState('');
  
  // États pour les modales
  const [editEtudiant, setEditEtudiant] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [detailEtudiant, setDetailEtudiant] = useState(null);
  const [newEtudiant, setNewEtudiant] = useState({
    nom_prenom: '',
    diocese: '',
    email: '',
    telephone: '',
    matricule: '',
    niveau: '',
    filiere: ''
  });

  // États pour les loadings
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [loadingUpdate, setLoadingUpdate] = useState(false);
  const [loadingDeleteId, setLoadingDeleteId] = useState(null);
  const [loadingImport, setLoadingImport] = useState(false);
  
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

  // Configuration des champs pour les modales
  const etudiantFields = [
    { name: 'nom_prenom', label: 'Nom Prénom', type: 'text', placeholder: 'Entrer le nom et prénom', required: true },
    { name: 'matricule', label: 'Matricule', type: 'text', placeholder: 'Entrer le numéro d\'étudiant', required: true },
    { name: 'email', label: 'Email', type: 'email', placeholder: 'Entrer l\'email', required: true },
    { name: 'telephone', label: 'Téléphone', type: 'text', placeholder: 'Entrer le numéro de téléphone', required: true },
    { name: 'diocese', label: 'Diocese', type: 'text', placeholder: 'Entrer le nom de la diocese ', required: true },
    { name: 'niveau', label: 'Niveau', type: 'select', placeholder: 'Sélectionner le niveau', required: true, options: [
      { value: 'L1', label: 'Licence 1' },
      { value: 'L2', label: 'Licence 2' },
      { value: 'L3', label: 'Licence 3' },
      { value: 'M1', label: 'Master 1' },
      { value: 'M2', label: 'Master 2' }
    ]},
    { name: 'filiere', label: 'Filière', type: 'text', placeholder: 'Entrer la filière', required: true }
  ];

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

  const handleFormChange = (field, value, isEdit = false) => {
    if (isEdit) {
      setEditEtudiant(prev => ({ ...prev, [field]: value }));
    } else {
      setNewEtudiant(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleCreate = async () => {
    setLoadingCreate(true);
    try {
      const response = await axios.post(`http://127.0.0.1:8000/api/etudiants`, newEtudiant);
      
      // Fermer la modal
      const modal = window.bootstrap.Modal.getInstance(document.getElementById('addModal'));
      modal.hide();
      
      // Réinitialiser le formulaire
      setNewEtudiant({ 
        nom_prenom: '', 
        diocese: '', 
        email: '', 
        telephone: '', 
        matricule: '', 
        niveau: '', 
        filiere: '' 
      });
      
      // 🔹 Recharger les données du contexte
      await refetchParcours();
      
      console.log("Étudiant ajouté avec succès et données rechargées");
      
    } catch (error) {
      console.error("Erreur lors de l'ajout :", error.response?.data);
    } finally {
      setLoadingCreate(false);
    }
  };
  

  const handleUpdate = async () => {
    setLoadingUpdate(true);
    try {
      const response = await axios.put(
        `http://127.0.0.1:8000/api/etudiants/${editEtudiant.id}`,
        editEtudiant
      );
      
      // Fermer la modal
      const modal = window.bootstrap.Modal.getInstance(document.getElementById('editModal'));
      if (modal) modal.hide();
      setEditEtudiant(null);
      
      // 🔹 Recharger les données du contexte
      await refetchParcours();
      
      console.log("Étudiant modifié avec succès et données rechargées");
      
    } catch (error) {
      console.error("Erreur lors de la mise à jour :", error.response?.data || error.message);
    } finally {
      setLoadingUpdate(false);
    }
  };

  const handleDelete = async () => {
    setLoadingDeleteId(confirmDeleteId);
    try {
      await axios.delete(`http://127.0.0.1:8000/api/etudiants/${confirmDeleteId}`);
      
      // Fermer la modal
      const modal = window.bootstrap.Modal.getInstance(document.getElementById('deleteModal'));
      if (modal) modal.hide();
      
      // 🔹 Recharger les données du contexte
      await refetchParcours();
      
      console.log("Étudiant supprimé avec succès et données rechargées");
      
    } catch (error) {
      console.error("Erreur lors de la suppression :", error);
    } finally {
      setLoadingDeleteId(null);
    }
  };
  
  // Fonction handleImport améliorée pour ListeEtudiant.jsx
  const handleImport = async (file) => {
    setLoadingImport(true);
    const formData = new FormData();
    formData.append('file', file);
  
    try {
      const response = await axios.post(
        'http://127.0.0.1:8000/api/etudiants/import', 
        formData, 
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          },
          timeout: 300000,
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            console.log(`Upload: ${percentCompleted}%`);
          }
        }
      );
  
      console.log("Réponse de l'import :", response.data);
      
      // Affichage des résultats détaillés
      let message = `✅ ${response.data.message}\n`;
      message += `📊 ${response.data.processed_rows}/${response.data.total_rows} étudiants traités`;
      message += ` (${response.data.success_rate})`;
      
      if (response.data.errors && response.data.errors.length > 0) {
        message += `\n\n⚠️ ${response.data.error_count} erreurs détectées:\n`;
        message += response.data.errors.slice(0, 5).join('\n');
        if (response.data.errors.length > 5) {
          message += `\n... et ${response.data.errors.length - 5} autres erreurs`;
        }
      }
      
      alert(message);
      
      // Fermer la modal
      const modal = window.bootstrap.Modal.getInstance(document.getElementById('importModal'));
      if (modal) modal.hide();
      
      // 🔹 Recharger les données du contexte
      await refetchParcours();
      
      console.log("Import terminé et données rechargées");
      
    } catch (error) {
      console.error("Erreur lors de l'import :", error.response?.data, error);
      
      let errorMessage = "Erreur lors de l'import du fichier";
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = "⏱️ Timeout: L'import prend trop de temps. Essayez avec un fichier plus petit ou contactez l'administrateur.";
      } else if (error.message === 'Network Error') {
        errorMessage = "🌐 Erreur réseau: Vérifiez votre connexion ou contactez l'administrateur.";
      }
      
      alert(errorMessage);
    } finally {
      setLoadingImport(false);
    }
  };
  
  // Fonctions pour les modales
  const openAddModal = () => {
    setNewEtudiant({ 
      nom_prenom: '', 
      diocese: '', 
      email: '', 
      telephone: '', 
      matricule: '', 
      niveau: '', 
      filiere: '' 
    });
    const modal = new window.bootstrap.Modal(document.getElementById('addModal'));
    modal.show();
  };

  const openEditModal = (etudiant) => {
    setEditEtudiant({ ...etudiant });
    const modal = new window.bootstrap.Modal(document.getElementById('editModal'));
    modal.show();
  };

  const openDeleteModal = (id) => {
    setConfirmDeleteId(id);
    const modal = new window.bootstrap.Modal(document.getElementById('deleteModal'));
    modal.show();
  };

  const openDetailModal = (etudiant) => {
    setDetailEtudiant(etudiant);
    const modal = new window.bootstrap.Modal(document.getElementById('detailModal'));
    modal.show();
  };

  const openImportModal = () => {
    const modal = new window.bootstrap.Modal(document.getElementById('importModal'));
    modal.show();
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
        <span className="text-muted fw-light text-capitalize">{role} /</span> Étudiants
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
              Liste des étudiants en L{i}
            </button>
          </li>
        ))}
      </ul>

      <div className="card">
        <h5 className="card-header">
          Liste des étudiants en L{niveau}
          {selectedAnnee && annees.find(a => a.id == selectedAnnee) && (
            <span className="text-muted ms-2">
              - {annees.find(a => a.id == selectedAnnee)?.annee_aca}
            </span>
          )}
        </h5>
        {role === 'admin' && (
        <div className="mb-3 ms-4">
          <button className="btn btn-primary me-2" onClick={openAddModal}>
            Nouveau
          </button>
          <button className="btn btn-success" onClick={openImportModal}>
            <i className="bx bx-import me-1"></i>
            Importer Fichier
          </button>
        </div>
      )}
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
          onRowClick={openDetailModal}
          onEdit={openEditModal}
          onDelete={openDeleteModal}
          role={role}
          renderCell={(etudiant, field) => {
            const value = etudiant[field];
            return value ? value : '--';
          }}
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

      {/* Modales */}
      <AddModal
        modalId="addModal"
        title="Ajouter un étudiant"
        fields={etudiantFields}
        formData={newEtudiant}
        onFormChange={(field, value) => handleFormChange(field, value, false)}
        onSubmit={handleCreate}
        loading={loadingCreate}
        buttonText="Ajouter"
      />

      <EditModal
        modalId="editModal"
        title="Modifier un étudiant"
        fields={etudiantFields}
        formData={editEtudiant || {}}
        onFormChange={(field, value) => handleFormChange(field, value, true)}
        onSubmit={handleUpdate}
        loading={loadingUpdate}
        buttonText="Enregistrer"
      />

      <DeleteModal
        modalId="deleteModal"
        title="Confirmer la suppression"
        message="Voulez-vous vraiment supprimer cet étudiant ?"
        onConfirm={handleDelete}
        loading={loadingDeleteId === confirmDeleteId}
      />

      <DetailModal
        modalId="detailModal"
        title={detailEtudiant?.nom_prenom || 'Détail de l\'étudiant'}
        data={detailEtudiant}
        fields={etudiantFields}
        customRender={(data) => (
          <div className="row">
            {/* <div className="mb-3">
              <strong>Nom Prénom:</strong> {data?.nom_prenom || '--'}
            </div> */}
            <div className="mb-3">
              <strong>Matricule:</strong> {data?.matricule || '--'}
            </div>
            <div className="mb-3">
              <strong>Email:</strong> {data?.email || '--'}
            </div>
            <div className="mb-3">
              <strong>Téléphone:</strong> {data?.telephone || '--'}
            </div>
            <div className="mb-3">
              <strong>Diocese:</strong> {data?.diocese || '--'}
            </div>
            <div className="mb-3">
              <strong>Niveau:</strong> {data?.niveau || '--'}
            </div>
            <div className="mb-3">
              <strong>Filière:</strong> {data?.filiere || '--'}
            </div>
          </div>
        )}
      />

      <ImportModal
        modalId="importModal"
        title="Importer des étudiants"
        onImport={handleImport}
        loading={loadingImport}
        acceptedFormats=".csv,.xlsx,.xls"
        // description="Sélectionnez un fichier CSV ou Excel contenant les données des étudiants"
      />
    </div>
  );
};

export default ListeEtudiant;
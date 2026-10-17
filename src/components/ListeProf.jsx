import React, { useState } from 'react';
import { useProf } from '../contexts/ProfContext';
import api, { errorMessage } from '../api/client';
import { useFeedback } from '../contexts/FeedbackContext';
import { ouvrirEspace } from '../auth/consultation';

// Import des composants modulaires
import SearchBar from './SearchBar';
import AddModal from './AddModal';
import EditModal from './EditModal';
import DeleteModal from './DeleteModal';
import DataTable from './DataTable';
import Pagination from './Pagination';
import DetailModal from './DetailModal';
import MotDePasseProvisoire from './MotDePasseProvisoire';

const ListeProf = () => {
  const { notify, confirm } = useFeedback();
  const { profs, setProfs, loading } = useProf();
  const [searchTerm, setSearchTerm] = useState('');
  const [editProf, setEditProf] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [role, setRole] = useState(localStorage.getItem('role'));
  const [detailProf, setDetailProf] = useState(null);
  const [newProf, setNewProf] = useState({
    nom_prenom: '',
    adresse: '',
    email: '',
    telephone: '',
  });

  const [loadingCreate, setLoadingCreate] = useState(false);
  const [identifiants, setIdentifiants] = useState(null); // mot de passe provisoire à afficher une fois
  const [loadingUpdate, setLoadingUpdate] = useState(false);
  const [loadingDeleteId, setLoadingDeleteId] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 10;

  // Configuration des champs pour les modales
  const profFields = [
    { name: 'nom_prenom', label: 'Nom Prénom', type: 'text', placeholder: 'Entrer le nom et prénom', required: true },
    { name: 'adresse', label: 'Adresse', type: 'text', placeholder: 'Entrer l\'adresse', required: true },
    { name: 'email', label: 'Email', type: 'email', placeholder: 'Entrer l\'email', required: true },
    { name: 'telephone', label: 'Téléphone', type: 'text', placeholder: 'Entrer le numéro de téléphone', required: true }
  ];

  // Configuration des en-têtes du tableau
  const tableHeaders = [
    { label: 'Nom', field: 'nom_prenom' },
    { label: 'Email', field: 'email' }
  ];

  // Filtrage et pagination
  const filteredProfs = profs.filter(prof =>
    Object.values(prof).some(val =>
      typeof val === 'string' && val.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const totalPages = Math.ceil(filteredProfs.length / itemsPerPage);
  const currentProfs = filteredProfs.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage
  );

  // Handlers
  const handleSearchChange = (value) => {
    setSearchTerm(value);
    setCurrentPage(0);
  };

  const handleFormChange = (field, value, isEdit = false) => {
    if (isEdit) {
      setEditProf(prev => ({ ...prev, [field]: value }));
    } else {
      setNewProf(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleCreate = async () => {
    setLoadingCreate(true);
    try {
      const response = await api.post(`/enseignants`, newProf);
      setProfs([...profs, response.data.enseignant]);
      setNewProf({ nom_prenom: '', adresse: '', email: '', telephone: '' });
      const modal = window.bootstrap.Modal.getInstance(document.getElementById('addModal'));
      modal.hide();
      setIdentifiants({
        nom: response.data.enseignant?.nom_prenom,
        email: response.data.user?.email,
        mot_de_passe: response.data.mot_de_passe,
      });
    } catch (error) {
      notify.error(errorMessage(error, "Erreur lors de l'ajout de l'enseignant."));
    } finally {
      setLoadingCreate(false);
    }
  };

  const handleUpdate = async () => {
    setLoadingUpdate(true);
    try {
      await api.put(
        `/enseignants/${editProf.id}`,
        editProf
      );
      const updatedList = profs.map((prof) =>
        prof.id === editProf.id ? { ...prof, ...editProf } : prof
      );
      setProfs(updatedList);
      const modal = window.bootstrap.Modal.getInstance(document.getElementById('editModal'));
      if (modal) modal.hide();
      setEditProf(null);
      notify.success('Enseignant modifié.');
    } catch (error) {
      notify.error(errorMessage(error, "Erreur lors de la modification de l'enseignant."));
    } finally {
      setLoadingUpdate(false);
    }
  };

  const handleDelete = async () => {
    setLoadingDeleteId(confirmDeleteId);
    try {
      await api.delete(`/enseignants/${confirmDeleteId}`);
      setProfs(profs.filter(prof => prof.id !== confirmDeleteId));
      const modal = window.bootstrap.Modal.getInstance(document.getElementById('deleteModal'));
      if (modal) modal.hide();
      notify.success('Enseignant et compte associé supprimés.');
    } catch (error) {
      notify.error(errorMessage(error, "Erreur lors de la suppression de l'enseignant."));
    } finally {
      setLoadingDeleteId(null);
    }
  };

  const openAddModal = () => {
    setNewProf({ nom_prenom: '', adresse: '', email: '', telephone: '' });
    const modal = new window.bootstrap.Modal(document.getElementById('addModal'));
    modal.show();
  };

  const openEditModal = (prof) => {
    setEditProf({ ...prof });
    const modal = new window.bootstrap.Modal(document.getElementById('editModal'));
    modal.show();
  };

  const openDeleteModal = (id) => {
    setConfirmDeleteId(id);
    const modal = new window.bootstrap.Modal(document.getElementById('deleteModal'));
    modal.show();
  };

  const openDetailModal = (prof) => {
    setDetailProf(prof);
    const modal = new window.bootstrap.Modal(document.getElementById('detailModal'));
    modal.show();
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status"></div>
        <p className="mt-3">Chargement des enseignants...</p>
      </div>
    );
  }

  return (
    <div className="container-xxl flex-grow-1 container-p-y">
      <h4 className="fw-bold py-3 mb-4">
        <span className="text-muted fw-light text-capitalize">{role} /</span> Enseignants
      </h4>

      {role === 'admin' && (
        <div className="mb-3">
          <button className="btn btn-primary" onClick={openAddModal}>
            Nouveau
          </button>
        </div>
      )}

      <div className="card">
        <h5 className="card-header">Liste des enseignants</h5>

        {/* Barre de recherche dans la carte */}
        <div className="card-body pb-0">
          <SearchBar
            searchTerm={searchTerm}
            onSearchChange={handleSearchChange}
            placeholder="Rechercher un professeur..."
          />
        </div>

        <DataTable
          headers={tableHeaders}
          data={currentProfs}
          onRowClick={openDetailModal}
          onEdit={openEditModal}
          onDelete={openDeleteModal}
          role={role}
          renderCell={(prof, field) => {
            const value = prof[field];
            // Email : ouvre l'espace de l'enseignant (lecture seule), administration uniquement
            if (field === 'email' && value && role === 'admin') {
              return (
                <button type="button" className="btn btn-link p-0 gstf-lien-espace"
                  title={`Ouvrir l'espace de ${prof.nom_prenom}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    ouvrirEspace({ userId: prof.id_user_cession, nom: prof.nom_prenom, role: 'prof', confirm, notify });
                  }}>
                  {value}<i className="bx bx-log-in-circle ms-1" aria-hidden="true"></i>
                </button>
              );
            }
            return value || '--';
          }}
        />
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Modales */}
      <AddModal
        modalId="addModal"
        title="Ajouter un professeur"
        fields={profFields}
        formData={newProf}
        onFormChange={(field, value) => handleFormChange(field, value, false)}
        onSubmit={handleCreate}
        loading={loadingCreate}
        buttonText="Ajouter"
      />

      <EditModal
        modalId="editModal"
        title="Modifier un professeur"
        fields={profFields}
        formData={editProf || {}}
        onFormChange={(field, value) => handleFormChange(field, value, true)}
        onSubmit={handleUpdate}
        loading={loadingUpdate}
        buttonText="Enregistrer"
      />

      <DeleteModal
        modalId="deleteModal"
        title="Confirmer la suppression"
        message="Voulez-vous vraiment supprimer ce professeur ?"
        onConfirm={handleDelete}
        loading={loadingDeleteId === confirmDeleteId}
      />

      <DetailModal
        modalId="detailModal"
        title={detailProf?.nom_prenom || 'Détail du professeur'}
        data={detailProf}
        fields={profFields}
      />
      <MotDePasseProvisoire identifiants={identifiants} onClose={() => setIdentifiants(null)} />
    </div>
  );
};

export default ListeProf;
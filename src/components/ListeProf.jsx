import React, { useState } from 'react';
import { useProf } from '../contexts/ProfContext';
import axios from 'axios';

// Import des composants modulaires
import SearchBar from './SearchBar';
import AddModal from './AddModal';
import EditModal from './EditModal';
import DeleteModal from './DeleteModal';
import DataTable from './DataTable';
import Pagination from './Pagination';
import DetailModal from './DetailModal';

const ListeProf = () => {
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
      const response = await axios.post(`http://127.0.0.1:8000/api/enseignants`, newProf);
      setProfs([...profs, response.data]);
      setNewProf({ nom_prenom: '', adresse: '', email: '', telephone: '' });
      const modal = window.bootstrap.Modal.getInstance(document.getElementById('addModal'));
      modal.hide();
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
        `http://127.0.0.1:8000/api/enseignants/${editProf.id}`,
        editProf
      );
      const updatedList = profs.map((prof) =>
        prof.id === editProf.id ? { ...prof, ...editProf } : prof
      );
      setProfs(updatedList);
      const modal = window.bootstrap.Modal.getInstance(document.getElementById('editModal'));
      if (modal) modal.hide();
      setEditProf(null);
    } catch (error) {
      console.error("Erreur lors de la mise à jour :", error.response?.data || error.message);
    } finally {
      setLoadingUpdate(false);
    }
  };

  const handleDelete = async () => {
    setLoadingDeleteId(confirmDeleteId);
    try {
      await axios.delete(`http://127.0.0.1:8000/api/enseignants/${confirmDeleteId}`);
      setProfs(profs.filter(prof => prof.id !== confirmDeleteId));
      const modal = window.bootstrap.Modal.getInstance(document.getElementById('deleteModal'));
      if (modal) modal.hide();
    } catch (error) {
      console.error("Erreur lors de la suppression :", error);
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
    </div>
  );
};

export default ListeProf;
import React, { useState } from 'react';
import { useInfo } from '../../contexts/InfoContext';
import axios from 'axios';

// Import des composants modulaires
import SearchBar from '../../components/SearchBar';
import AddModal from '../../components/AddModal';
import EditModal from '../../components/EditModal';
import DeleteModal from '../../components/DeleteModal';
import DataTable from '../../components/DataTable';
import DetailModal from '../../components/DetailModal';

const Info = () => {
  const { infos, fetchInfos } = useInfo();
  const [newInfo, setNewInfo] = useState({ auteur: '', titre: '', description: '' });
  const [editInfo, setEditInfo] = useState({ id: null, auteur: '', titre: '', description: '' });
  const [selectedInfo, setSelectedInfo] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [loadingUpdate, setLoadingUpdate] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);

  // Configuration des champs pour les modales
  const infoFields = [
    { name: 'titre', label: 'Titre', type: 'text', required: true },
    { name: 'auteur', label: 'Auteur', type: 'text', required: true },
    { name: 'description', label: 'Description', type: 'textarea', rows: 5, required: true }
  ];

  // Configuration des en-têtes du tableau
  const tableHeaders = [
    { label: 'Titre', field: 'titre' },
    { label: 'Auteur', field: 'auteur' },
    { label: 'Description', field: 'description' },
    { label: 'Date', field: 'created_at' }
  ];

  // Fonction pour tronquer le texte
  const truncate = (text, length = 60) =>
    text?.length > length ? text.slice(0, length) + '…' : text;

  // Fonction pour formater la date
  const formatDate = (dateString) => {
    if (!dateString) return 'Date inconnue';
    return new Date(dateString).toLocaleString('fr-FR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  // Filtrage des infos selon le terme de recherche
  const filteredInfos = infos.filter(info =>
    Object.values(info).some(val =>
      typeof val === 'string' && val.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  // Fonction personnalisée pour le rendu des cellules
  const renderCell = (item, field) => {
    switch (field) {
      case 'description':
        return truncate(item[field]);
      case 'created_at':
        return formatDate(item[field]);
      default:
        return item[field];
    }
  };

  // Handlers
  const handleSearchChange = (value) => {
    setSearchTerm(value);
  };

  const handleFormChange = (field, value, isEdit = false) => {
    if (isEdit) {
      setEditInfo(prev => ({ ...prev, [field]: value }));
    } else {
      setNewInfo(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleCreate = async () => {
    setLoadingCreate(true);
    try {
      await axios.post('http://127.0.0.1:8000/api/infos', newInfo);
      setNewInfo({ auteur: '', titre: '', description: '' });
      fetchInfos();
      window.bootstrap.Modal.getInstance(document.getElementById('addModal'))?.hide();
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingCreate(false);
    }
  };

  const handleUpdate = async () => {
    setLoadingUpdate(true);
    try {
      await axios.put(`http://127.0.0.1:8000/api/infos/${editInfo.id}`, editInfo);
      setEditInfo({ id: null, auteur: '', titre: '', description: '' });
      fetchInfos();
      window.bootstrap.Modal.getInstance(document.getElementById('editModal'))?.hide();
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingUpdate(false);
    }
  };

  const handleDelete = async () => {
    setLoadingDelete(true);
    try {
      await axios.delete(`http://127.0.0.1:8000/api/infos/${confirmDeleteId}`);
      fetchInfos();
      window.bootstrap.Modal.getInstance(document.getElementById('deleteModal'))?.hide();
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDelete(false);
    }
  };

  const openAddModal = () => {
    const modal = new window.bootstrap.Modal(document.getElementById('addModal'));
    modal.show();
  };

  const openEditModal = (info) => {
    setEditInfo({ ...info });
    const modal = new window.bootstrap.Modal(document.getElementById('editModal'));
    modal.show();
  };

  const openDeleteModal = (id) => {
    setConfirmDeleteId(id);
    const modal = new window.bootstrap.Modal(document.getElementById('deleteModal'));
    modal.show();
  };

  const openDetailModal = (info) => {
    setSelectedInfo(info);
    const modal = new window.bootstrap.Modal(document.getElementById('detailModal'));
    modal.show();
  };

  // Rendu personnalisé pour les détails
  const renderDetailContent = (info) => {
    if (!info) return <p>Aucune information disponible.</p>;
    
    return (
      <>
        <p className="fst-italic text-muted mb-3">
          <i className="bx bx-user" /> {info.auteur}
        </p>
        <div className="mb-4">
          <h6 className="fw-semibold text-decoration-underline text-dark">Description</h6>
          <p style={{ whiteSpace: 'pre-line' }}>{info.description}</p>
        </div>
        <div className="text-end">
          <small className="text-muted fst-italic">
            Publié le : {formatDate(info.created_at)}
          </small>
        </div>
      </>
    );
  };

  return (
    <div className="content-wrapper">
      <div className="container-xxl flex-grow-1 container-p-y">
        <h4 className="fw-bold py-3 mb-4">
          <span className="text-muted fw-light">Admin / </span>Info
        </h4>

        <div className="mb-3">
          <button className="btn btn-primary" onClick={openAddModal}>
            Nouveau
          </button>
        </div>

        <div className="card">
          <h5 className="card-header">Liste des infos publiées</h5>
          <div className="card-body pb-0">
            <SearchBar
              searchTerm={searchTerm}
              onSearchChange={handleSearchChange}
              placeholder="Rechercher un professeur..."
            />
          </div>
          <DataTable
            headers={tableHeaders}
            data={filteredInfos}
            onRowClick={openDetailModal}
            onEdit={openEditModal}
            onDelete={openDeleteModal}
            showActions={true}
            role="admin" // Assumé que l'admin peut tout faire
            renderCell={renderCell}
          />
        </div>

        {/* Modales */}
        <AddModal
          modalId="addModal"
          title="Nouvelle Info"
          fields={infoFields}
          formData={newInfo}
          onFormChange={(field, value) => handleFormChange(field, value, false)}
          onSubmit={handleCreate}
          loading={loadingCreate}
          buttonText="Publier"
        />

        <EditModal
          modalId="editModal"
          title="Modifier Info"
          fields={infoFields}
          formData={editInfo}
          onFormChange={(field, value) => handleFormChange(field, value, true)}
          onSubmit={handleUpdate}
          loading={loadingUpdate}
          buttonText="Enregistrer"
        />

        <DeleteModal
          modalId="deleteModal"
          title="Confirmer la suppression"
          message="Voulez-vous vraiment supprimer cette information ?"
          onConfirm={handleDelete}
          loading={loadingDelete}
        />

        <DetailModal
          modalId="detailModal"
          title={selectedInfo?.titre || 'Détail de l\'information'}
          data={selectedInfo}
          customRender={renderDetailContent}
        />
      </div>
    </div>
  );
};

export default Info;
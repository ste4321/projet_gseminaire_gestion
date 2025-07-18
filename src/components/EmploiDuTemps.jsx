import React, { useEffect, useState } from 'react';
import { PhotoProvider, PhotoView } from 'react-photo-view';
import 'react-photo-view/dist/react-photo-view.css';
import axios from 'axios';
import { FaAngleDoubleLeft, FaAngleDoubleRight } from 'react-icons/fa';
import { useEmploi } from '../contexts/EmploiContext';

// Import des composants modulaires
import AddModal from './AddModal';
import EditModal from './EditModal';
import DeleteModal from './DeleteModal';

const EmploiDuTemps = () => {
  const {
    emploiSemestre1,
    emploiSemestre2,
    setEmploiSemestre1,
    setEmploiSemestre2,
    loading
  } = useEmploi();

  const [semestre, setSemestre] = useState(1);
  const [page, setPage] = useState(0);
  const [role, setRole] = useState(null);
  const [editEmploi, setEditEmploi] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [newEmploi, setNewEmploi] = useState({
    image: null,
    semestre: 1
  });
  const [imageLoading, setImageLoading] = useState(true);
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [loadingUpdate, setLoadingUpdate] = useState(false);
  const [loadingDeleteId, setLoadingDeleteId] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  const emploiActuel = semestre === 1 ? emploiSemestre1 : emploiSemestre2;
  const totalPages = emploiActuel.length;

  // Configuration des champs pour les modales
  const emploiFields = [
    { 
      name: 'image', 
      label: 'Fichier image', 
      type: 'file', 
      accept: 'image/*', 
      required: true 
    },
    { 
      name: 'semestre', 
      label: 'Semestre', 
      type: 'select', 
      options: [
        { value: 1, label: 'Semestre 1' },
        { value: 2, label: 'Semestre 2' }
      ],
      required: true 
    }
  ];
  
  const editFields = [
    { 
      name: 'image', 
      label: 'Nouvelle image', 
      type: 'file', 
      accept: 'image/*', 
      required: true 
    }
  ];
  useEffect(() => {
    setRole(localStorage.getItem('role'));
  }, []);

  useEffect(() => {
    setImageLoading(true);
  }, [page, emploiActuel]);

  // Réinitialiser la page si elle dépasse la nouvelle longueur
  useEffect(() => {
    if (emploiActuel.length > 0 && page >= emploiActuel.length) {
      setPage(0);
    }
  }, [emploiActuel.length, page]);

  const handleChangeSemestre = (s) => {
    setSemestre(s);
    setPage(0);
  };

  const handleFormChange = (field, value, isEdit = false) => {
    let processedValue = value;
    
    // Pour le champ semestre, convertir en entier
    if (field === 'semestre') {
      processedValue = parseInt(value);
    }
    // Pour les fichiers, la valeur est déjà un objet File
    // Pas besoin de traitement supplémentaire
    
    if (isEdit) {
      setEditEmploi(prev => ({ ...prev, [field]: processedValue }));
    } else {
      setNewEmploi(prev => ({ ...prev, [field]: processedValue }));
    }
  };

  const handleCreate = async () => {
    if (!newEmploi.image) return;

    setLoadingCreate(true);
    const formData = new FormData();
    formData.append('image', newEmploi.image);
    formData.append('semestre', newEmploi.semestre);

    try {
      const response = await axios.post(`http://127.0.0.1:8000/api/emplois`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const addedEmploi = response.data;
      if (newEmploi.semestre === 1) {
        setEmploiSemestre1(prev => [...prev, addedEmploi]);
      } else {
        setEmploiSemestre2(prev => [...prev, addedEmploi]);
      }

      // Réinitialiser et fermer
      setNewEmploi({ image: null, semestre: 1 });
      const modal = window.bootstrap.Modal.getInstance(document.getElementById('addModal'));
      modal.hide();
      
      // Si on a ajouté dans le semestre actuel, aller à la nouvelle page
      if (newEmploi.semestre === semestre) {
        setPage(emploiActuel.length); // Nouvelle page sera à la fin
      }
      
      setSuccessMessage("L'emploi du temps a été ajouté avec succès !");
    } catch (error) {
      console.error("Erreur lors de l'ajout :", error);
    } finally {
      setLoadingCreate(false);
    }
  };

  const handleUpdate = async () => {
    if (!editEmploi.image || !emploiActuel[page]) return;

    setLoadingUpdate(true);
    const formData = new FormData();
    formData.append('image', editEmploi.image);
    formData.append('semestre', semestre);
    formData.append('email', localStorage.getItem('email'));

    try {
      const res = await axios.post(`http://127.0.0.1:8000/api/emplois/${emploiActuel[page].id}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const updatedList = [...emploiActuel];
      updatedList[page].image_url = res.data.image_url;
      (semestre === 1 ? setEmploiSemestre1 : setEmploiSemestre2)(updatedList);

      const modal = window.bootstrap.Modal.getInstance(document.getElementById('editModal'));
      if (modal) modal.hide();
      setEditEmploi(null);
      
      // Forcer le rechargement de l'image
      setImageLoading(true);
      setSuccessMessage("L'image a été mise à jour avec succès !");
    } catch (error) {
      console.error("Erreur lors de la mise à jour :", error.response?.data || error.message);
    } finally {
      setLoadingUpdate(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDeleteId) return;

    setLoadingDeleteId(confirmDeleteId);
    try {
      await axios.delete(`http://127.0.0.1:8000/api/emplois/${confirmDeleteId}`);
      const updatedList = emploiActuel.filter(item => item.id !== confirmDeleteId);
      (semestre === 1 ? setEmploiSemestre1 : setEmploiSemestre2)(updatedList);
      
      // Ajuster la page après suppression
      if (page >= updatedList.length && updatedList.length > 0) {
        setPage(updatedList.length - 1);
      } else if (updatedList.length === 0) {
        setPage(0);
      }
      
      const modal = window.bootstrap.Modal.getInstance(document.getElementById('deleteModal'));
      if (modal) modal.hide();
      setSuccessMessage("L'emploi du temps a été supprimé avec succès !");
    } catch (error) {
      console.error('Erreur lors de la suppression :', error);
    } finally {
      setLoadingDeleteId(null);
    }
  };

  const openAddModal = () => {
    setNewEmploi({ image: null, semestre: semestre }); // Prendre le semestre actuel
    const modal = new window.bootstrap.Modal(document.getElementById('addModal'));
    modal.show();
  };

  const openEditModal = () => {
    setEditEmploi({ image: null });
    const modal = new window.bootstrap.Modal(document.getElementById('editModal'));
    modal.show();
  };

  const openDeleteModal = () => {
    setConfirmDeleteId(emploiActuel[page].id);
    const modal = new window.bootstrap.Modal(document.getElementById('deleteModal'));
    modal.show();
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const maxVisiblePages = 5;
    let start = Math.max(0, page - Math.floor(maxVisiblePages / 2));
    let end = start + maxVisiblePages;
    if (end > totalPages) {
      end = totalPages;
      start = Math.max(0, end - maxVisiblePages);
    }

    const pages = Array.from({ length: end - start }, (_, i) => start + i);

    return (
      <nav className="mt-4" aria-label="Pagination">
        <ul className="pagination justify-content-center">
          <li className={`page-item ${page === 0 ? 'disabled' : ''}`}>
            <button className="page-link" onClick={() => setPage(0)}>
              <FaAngleDoubleLeft />
            </button>
          </li>
          {pages.map(pg => (
            <li key={pg} className={`page-item ${pg === page ? 'active' : ''}`}>
              <button className="page-link" onClick={() => setPage(pg)}>{pg + 1}</button>
            </li>
          ))}
          <li className={`page-item ${page === totalPages - 1 ? 'disabled' : ''}`}>
            <button className="page-link" onClick={() => setPage(totalPages - 1)}>
              <FaAngleDoubleRight />
            </button>
          </li>
        </ul>
      </nav>
    );
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status"></div>
        <p className="mt-3">Chargement de l'emploi du temps...</p>
      </div>
    );
  }

  return (
    <div className="container-xxl flex-grow-1 container-p-y">
      <h4 className="fw-bold py-3 mb-4">
        <span className="text-muted fw-light text-capitalize">{role} /</span> Emploi du temps
      </h4>

      {successMessage && (
        <div className="alert alert-success alert-dismissible fade show" role="alert">
          {successMessage}
          <button type="button" className="btn-close" onClick={() => setSuccessMessage('')} aria-label="Close"></button>
        </div>
      )}

      <div className="row">
        <div className="col-md-12">
          <ul className="nav nav-pills flex-column flex-md-row mb-3">
            <li className="nav-item">
              <button className={`nav-link ${semestre === 1 ? 'active' : ''}`} onClick={() => handleChangeSemestre(1)}>Premier semestre</button>
            </li>
            <li className="nav-item">
              <button className={`nav-link ${semestre === 2 ? 'active' : ''}`} onClick={() => handleChangeSemestre(2)}>Deuxième semestre</button>
            </li>
          </ul>

          <div className="card mb-4 text-center p-4 pt-5 position-relative">
            {/* Boutons d'action - Afficher "nouveau" toujours pour admin, autres boutons seulement s'il y a des images */}
            {role === 'admin' && (
              <div className="position-absolute top-0 end-0 m-3 d-flex gap-2">
                {emploiActuel.length > 0 && (
                  <>
                    <button className="btn btn-sm btn-outline-primary" onClick={openAddModal} title="nouveau">
                      <i className="bx bx-plus"></i>
                    </button>
                    <button className="btn btn-sm btn-outline-primary" onClick={openEditModal} title="modifier">
                      <i className="bx bx-edit"></i>
                    </button>
                    <button className="btn btn-sm btn-outline-primary" onClick={openDeleteModal} title="supprimer">
                      <i className="bx bx-trash"></i>
                    </button>
                  </>
                )}
              </div>
            )}
            <br />
          {emploiActuel.length > 0 ? (
            <>
              <div className="position-relative">
                {imageLoading && (
                  <div className="d-flex justify-content-center align-items-center bg-light rounded border" style={{ height: '60vh' }}>
                    <div className="spinner-border text-primary" role="status"></div>
                  </div>
                )}
                
                {/* Conteneur avec classes Bootstrap */}
                <div className="d-flex justify-content-center align-items-center bg-light rounded border overflow-hidden" style={{ height: '60vh' }}>
                  <PhotoProvider>
                    <PhotoView src={`http://127.0.0.1:8000${emploiActuel[page].image_url}`}>
                      <img
                        src={`http://127.0.0.1:8000${emploiActuel[page].image_url}`}
                        alt="emploi"
                        className="w-100 h-100"
                        style={{
                          objectFit: 'contain',
                          cursor: 'zoom-in',
                          display: imageLoading ? 'none' : 'block'
                        }}
                        onLoad={() => setImageLoading(false)}
                        onError={() => setImageLoading(false)}
                      />
                    </PhotoView>
                  </PhotoProvider>
                </div>
              </div>
              {renderPagination()}
            </>
          ) : (
            <div className="d-flex flex-column align-items-center justify-content-center bg-light rounded border" style={{ minHeight: '60vh' }}>
              <i className="bx bx-calendar-x display-1 text-muted mb-3"></i>
              <p className="text-muted fs-5">Aucun emploi du temps disponible pour ce semestre.</p>
              {role === 'admin' && (
                <button className="btn btn-primary mt-3" onClick={openAddModal}>
                  <i className="bx bx-plus me-2"></i>
                  Ajouter un emploi du temps
                </button>
              )}
            </div>
          )}
          </div>
        </div>
      </div>

      {/* Modales réutilisables */}
      <AddModal
        modalId="addModal"
        title="Ajouter un emploi du temps"
        fields={emploiFields}
        formData={newEmploi}
        onFormChange={(field, value) => handleFormChange(field, value, false)}
        onSubmit={handleCreate}
        loading={loadingCreate}
        buttonText="Ajouter"
      />

      <EditModal
        modalId="editModal"
        title="Modifier l'emploi du temps"
        fields={editFields}
        formData={editEmploi || {}}
        onFormChange={(field, value) => handleFormChange(field, value, true)}
        onSubmit={handleUpdate}
        loading={loadingUpdate}
        buttonText="Enregistrer"
      />

      <DeleteModal
        modalId="deleteModal"
        title="Confirmer la suppression"
        message="Voulez-vous vraiment supprimer cet emploi du temps ?"
        onConfirm={handleDelete}
        loading={loadingDeleteId === confirmDeleteId}
      />
    </div>
  );
};

export default EmploiDuTemps;
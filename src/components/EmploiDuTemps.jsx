import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { PhotoProvider, PhotoView } from 'react-photo-view';
import 'react-photo-view/dist/react-photo-view.css';
import api, { errorMessage } from '../api/client';
import { useFeedback } from '../contexts/FeedbackContext';
import { storageUrl } from '../config';
import { FaAngleDoubleLeft, FaAngleDoubleRight } from 'react-icons/fa';
import { useEmploi } from '../contexts/EmploiContext';

// Import des composants modulaires
import AddModal from './AddModal';
import EditModal from './EditModal';
import DeleteModal from './DeleteModal';

// Même limite que le serveur (EmploiDuTempsController::MAX_PAR_SEMESTRE)
const MAX_IMAGES = 5;

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
  const [imageLoading, setImageLoading] = useState({});
  const [imageErreur, setImageErreur] = useState({}); // id → image inaccessible
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [loadingUpdate, setLoadingUpdate] = useState(false);
  const [loadingDeleteId, setLoadingDeleteId] = useState(null);
  const { notify } = useFeedback();

  const emploiActuel = useMemo(() =>
    semestre === 1 ? emploiSemestre1 : emploiSemestre2,
    [semestre, emploiSemestre1, emploiSemestre2]
  );

  const totalPages = emploiActuel.length;
  const complet = emploiActuel.length >= MAX_IMAGES;
  const currentEmploi = emploiActuel[page];

  // Configuration des champs pour les modales
  const emploiFields = useMemo(() => [
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
  ], []);

  const editFields = useMemo(() => [
    {
      name: 'image',
      label: 'Nouvelle image',
      type: 'file',
      accept: 'image/*',
      required: true
    }
  ], []);

  useEffect(() => {
    setRole(localStorage.getItem('role'));
  }, []);

  // Gérer le chargement des images de manière plus fine
  const handleImageLoadStart = useCallback((imageId) => {
    setImageLoading(prev => ({ ...prev, [imageId]: true }));
  }, []);

  const handleImageLoadEnd = useCallback((imageId) => {
    setImageLoading(prev => ({ ...prev, [imageId]: false }));
  }, []);

  // Précharger les images adjacentes pour une navigation plus fluide
  useEffect(() => {
    if (currentEmploi) {
      const currentImageId = currentEmploi.id;
      handleImageLoadStart(currentImageId);

      // Précharger l'image précédente et suivante
      const preloadImages = [];
      if (page > 0 && emploiActuel[page - 1]) {
        preloadImages.push(emploiActuel[page - 1]);
      }
      if (page < emploiActuel.length - 1 && emploiActuel[page + 1]) {
        preloadImages.push(emploiActuel[page + 1]);
      }

      preloadImages.forEach(emploi => {
        const img = new Image();
        img.src = storageUrl(emploi.image_url);
      });
    }
  }, [currentEmploi, page, emploiActuel, handleImageLoadStart]);

  // Réinitialiser la page si elle dépasse la nouvelle longueur
  useEffect(() => {
    if (emploiActuel.length > 0 && page >= emploiActuel.length) {
      setPage(0);
    }
  }, [emploiActuel.length, page]);

  const handleChangeSemestre = useCallback((s) => {
    setSemestre(s);
    setPage(0);
    // Réinitialiser les états de chargement d'images
    setImageLoading({});
  }, []);

  const handleFormChange = useCallback((field, value, isEdit = false) => {
    let processedValue = value;

    // Pour le champ semestre, convertir en entier
    if (field === 'semestre') {
      processedValue = parseInt(value);
    }

    if (isEdit) {
      setEditEmploi(prev => ({ ...prev, [field]: processedValue }));
    } else {
      setNewEmploi(prev => ({ ...prev, [field]: processedValue }));
    }
  }, []);

  const handleCreate = useCallback(async () => {
    if (!newEmploi.image) return;

    setLoadingCreate(true);
    const formData = new FormData();
    formData.append('image', newEmploi.image);
    formData.append('semestre', newEmploi.semestre);

    try {
      const response = await api.post(`/emplois`, formData, {
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
      modal?.hide();

      // Si on a ajouté dans le semestre actuel, aller à la nouvelle page
      if (newEmploi.semestre === semestre) {
        setPage(emploiActuel.length); // Nouvelle page sera à la fin
      }

      notify.success("Emploi du temps ajouté.");
    } catch (error) {
      notify.error(errorMessage(error, "Erreur lors de l'ajout de l'emploi du temps."));
    } finally {
      setLoadingCreate(false);
    }
  }, [newEmploi, semestre, emploiActuel.length, setEmploiSemestre1, setEmploiSemestre2, notify]);

  const handleUpdate = useCallback(async () => {
    if (!editEmploi?.image || !currentEmploi) return;

    setLoadingUpdate(true);
    const formData = new FormData();
    formData.append('image', editEmploi.image);
    formData.append('semestre', semestre);

    try {
      const res = await api.post(`/emplois/${currentEmploi.id}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const updatedList = [...emploiActuel];
      updatedList[page].image_url = res.data.image_url;
      (semestre === 1 ? setEmploiSemestre1 : setEmploiSemestre2)(updatedList);

      const modal = window.bootstrap.Modal.getInstance(document.getElementById('editModal'));
      modal?.hide();
      setEditEmploi(null);

      // Réinitialiser le state de chargement pour forcer le rechargement
      setImageLoading(prev => ({ ...prev, [currentEmploi.id]: false }));
      notify.success("Image de l'emploi du temps remplacée.");
    } catch (error) {
      notify.error(errorMessage(error, "Erreur lors du remplacement de l'image."));
    } finally {
      setLoadingUpdate(false);
    }
  }, [editEmploi, currentEmploi, semestre, emploiActuel, page, setEmploiSemestre1, setEmploiSemestre2, notify]);

  const handleDelete = useCallback(async () => {
    if (!confirmDeleteId) return;

    setLoadingDeleteId(confirmDeleteId);
    try {
      await api.delete(`/emplois/${confirmDeleteId}`);
      const updatedList = emploiActuel.filter(item => item.id !== confirmDeleteId);
      (semestre === 1 ? setEmploiSemestre1 : setEmploiSemestre2)(updatedList);

      // Ajuster la page après suppression
      if (page >= updatedList.length && updatedList.length > 0) {
        setPage(updatedList.length - 1);
      } else if (updatedList.length === 0) {
        setPage(0);
      }

      const modal = window.bootstrap.Modal.getInstance(document.getElementById('deleteModal'));
      modal?.hide();
      notify.success("Emploi du temps supprimé.");
    } catch (error) {
      notify.error(errorMessage(error, "Erreur lors de la suppression de l'emploi du temps."));
    } finally {
      setLoadingDeleteId(null);
    }
  }, [confirmDeleteId, emploiActuel, semestre, page, setEmploiSemestre1, setEmploiSemestre2, notify]);

  const openAddModal = useCallback(() => {
    setNewEmploi({ image: null, semestre: semestre });
    const modal = new window.bootstrap.Modal(document.getElementById('addModal'));
    modal.show();
  }, [semestre]);

  const openEditModal = useCallback(() => {
    setEditEmploi({ image: null });
    const modal = new window.bootstrap.Modal(document.getElementById('editModal'));
    modal.show();
  }, []);

  const openDeleteModal = useCallback(() => {
    if (currentEmploi) {
      setConfirmDeleteId(currentEmploi.id);
      const modal = new window.bootstrap.Modal(document.getElementById('deleteModal'));
      modal.show();
    }
  }, [currentEmploi]);

  const handlePageChange = useCallback((newPage) => {
    setPage(newPage);
  }, []);

  const renderPagination = useCallback(() => {
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
            <button className="page-link" onClick={() => handlePageChange(0)} disabled={page === 0}>
              <FaAngleDoubleLeft />
            </button>
          </li>
          {pages.map(pg => (
            <li key={pg} className={`page-item ${pg === page ? 'active' : ''}`}>
              <button className="page-link" onClick={() => handlePageChange(pg)}>{pg + 1}</button>
            </li>
          ))}
          <li className={`page-item ${page === totalPages - 1 ? 'disabled' : ''}`}>
            <button className="page-link" onClick={() => handlePageChange(totalPages - 1)} disabled={page === totalPages - 1}>
              <FaAngleDoubleRight />
            </button>
          </li>
        </ul>
      </nav>
    );
  }, [totalPages, page, handlePageChange]);

  // Composant ImageViewer optimisé
  const ImageViewer = useMemo(() => {
    if (!currentEmploi) return null;

    const imageId = currentEmploi.id;
    const imageUrl = storageUrl(currentEmploi.image_url);
    const isLoading = imageLoading[imageId];

    // Fichier enregistré mais inaccessible (ex. lien public/storage manquant côté serveur)
    if (imageErreur[imageId] === imageUrl) {
      return (
        <div className="d-flex flex-column align-items-center justify-content-center bg-light rounded border p-4" style={{ minHeight: '40vh' }}>
          <i className="bx bx-image-alt display-4 text-muted mb-3"></i>
          <p className="fw-semibold mb-1">L'image de cet emploi du temps est introuvable.</p>
          <p className="text-muted small mb-3" style={{ maxWidth: 520 }}>
            {role === 'admin'
              ? "Le fichier n'est pas accessible sur le serveur. Remplacez l'image avec le bouton « Modifier », ou demandez à l'administrateur technique de vérifier le stockage (php artisan storage:link)."
              : "Réessayez plus tard ou contactez le secrétariat."}
          </p>
          <button type="button" className="btn btn-sm btn-outline-primary"
            onClick={() => setImageErreur(prev => ({ ...prev, [imageId]: null }))}>
            Réessayer
          </button>
        </div>
      );
    }

    return (
      <div className="position-relative">
        {isLoading && (
          <div className="position-absolute top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center bg-light rounded border" style={{ zIndex: 1 }}>
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Chargement...</span>
            </div>
          </div>
        )}

        <div className="d-flex justify-content-center align-items-center bg-light rounded border overflow-hidden" style={{ height: '60vh' }}>
          <PhotoProvider>
            <PhotoView src={imageUrl}>
              <img
                src={imageUrl}
                alt={`Emploi du temps ${semestre === 1 ? 'premier' : 'deuxième'} semestre`}
                className="w-100 h-100"
                style={{
                  objectFit: 'contain',
                  cursor: 'zoom-in',
                  opacity: isLoading ? 0 : 1,
                  transition: 'opacity 0.3s ease'
                }}
                onLoadStart={() => handleImageLoadStart(imageId)}
                onLoad={() => handleImageLoadEnd(imageId)}
                onError={() => {
                  handleImageLoadEnd(imageId);
                  setImageErreur(prev => ({ ...prev, [imageId]: imageUrl }));
                }}
                loading="lazy"
              />
            </PhotoView>
          </PhotoProvider>
        </div>
      </div>
    );
  }, [currentEmploi, imageLoading, imageErreur, role, semestre, handleImageLoadStart, handleImageLoadEnd]);

  if (loading) {
    return (
      <div className="container-xxl flex-grow-1 container-p-y">
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Chargement...</span>
          </div>
          <p className="mt-3">Chargement de l'emploi du temps...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-xxl flex-grow-1 container-p-y">
      <h4 className="fw-bold py-3 mb-4">
        <span className="text-muted fw-light text-capitalize">{role} /</span> Emploi du temps
      </h4>

      <div className="row">
        <div className="col-md-12">
          <ul className="nav nav-pills flex-column flex-md-row mb-3">
            <li className="nav-item">
              <button
                className={`nav-link ${semestre === 1 ? 'active' : ''}`}
                onClick={() => handleChangeSemestre(1)}
              >
                Semestre 1
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link ${semestre === 2 ? 'active' : ''}`}
                onClick={() => handleChangeSemestre(2)}
              >
                Semestre 2
              </button>
            </li>
          </ul>

          <div className="card mb-4 text-center p-4 pt-5 position-relative">
            {/* Boutons d'action */}
            {role === 'admin' && (
              <div className="position-absolute top-0 start-0 m-3 small text-muted" aria-live="polite">
                <i className="bx bx-images me-1"></i>
                {emploiActuel.length} / {MAX_IMAGES} images
                {complet && <span className="ms-1 d-none d-md-inline">— supprimez ou remplacez une image pour en ajouter</span>}
              </div>
            )}
            {role === 'admin' && (
              <div className="position-absolute top-0 end-0 m-3 d-flex gap-2">
                <button className="btn btn-sm btn-outline-primary" onClick={openAddModal} disabled={complet}
                  title={complet ? `Maximum ${MAX_IMAGES} images par semestre` : 'Ajouter une image'} aria-label="Ajouter une image">
                  <i className="bx bx-plus"></i>
                </button>
                {emploiActuel.length > 0 && (
                  <>
                    <button className="btn btn-sm btn-outline-primary" onClick={openEditModal} title="Remplacer cette image" aria-label="Remplacer cette image">
                      <i className="bx bx-edit"></i>
                    </button>
                    <button className="btn btn-sm btn-outline-primary" onClick={openDeleteModal} title="Supprimer cette image" aria-label="Supprimer cette image">
                      <i className="bx bx-trash"></i>
                    </button>
                  </>
                )}
              </div>
            )}
            <br />
            {emploiActuel.length > 0 ? (
              <>
                {ImageViewer}
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
        onFormChange={handleFormChange}
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
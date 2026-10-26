import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { PhotoProvider, PhotoView } from 'react-photo-view';
import 'react-photo-view/dist/react-photo-view.css';
import api, { errorMessage } from '../api/client';
import { useFeedback } from '../contexts/FeedbackContext';
import { storageUrl } from '../config';
import { useEmploi } from '../contexts/EmploiContext';

// Import des composants modulaires
import AddModal from './AddModal';
import EditModal from './EditModal';
import DeleteModal from './DeleteModal';
import { ROLE_LABELS } from '../navigation';

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
  const [role, setRole] = useState(() => localStorage.getItem('role')); // connu dès le premier rendu (titre et squelette)
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

  const semestreInitialChoisi = useRef(false);
  useEffect(() => {
    if (loading || semestreInitialChoisi.current) return;
    semestreInitialChoisi.current = true;
    if (emploiSemestre1.length === 0 && emploiSemestre2.length > 0) setSemestre(2);
  }, [loading, emploiSemestre1.length, emploiSemestre2.length]);

  const totalPages = emploiActuel.length;
  const admin = role === 'admin';
  const autreSemestre = semestre === 1 ? 2 : 1;
  const autreAContenu = (semestre === 1 ? emploiSemestre2 : emploiSemestre1).length > 0;
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
      // Déjà en cache : chargée avant cet effet, l'événement « load » ne viendra plus
      const actuelle = new Image();
      actuelle.src = storageUrl(currentEmploi.image_url);
      if (actuelle.complete) handleImageLoadEnd(currentImageId);

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
  }, [currentEmploi, page, emploiActuel, handleImageLoadStart, handleImageLoadEnd]);

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

  // Pages suivante / précédente : flèches sur l'image, miniatures, touches ← →
  const pagePrecedente = () => page > 0 && handlePageChange(page - 1);
  const pageSuivante = () => page < totalPages - 1 && handlePageChange(page + 1);
  const naviguerClavier = (e) => {
    if (e.key === 'ArrowLeft') pagePrecedente();
    if (e.key === 'ArrowRight') pageSuivante();
  };

  const imageUrl = currentEmploi ? storageUrl(currentEmploi.image_url) : '';

  const ImageViewer = (() => {
    if (!currentEmploi) return null;
    const imageId = currentEmploi.id;
    const isLoading = imageLoading[imageId];

    // Fichier enregistré mais inaccessible (ex. lien public/storage manquant côté serveur)
    if (imageErreur[imageId] === imageUrl) {
      return (
        <div className="gstf-edt__zone gstf-edt__zone--message">
          <i className="bx bx-image-alt display-5 text-muted mb-2"></i>
          <p className="fw-semibold mb-1">L'image de cet emploi du temps est introuvable.</p>
          <p className="text-muted small mb-3" style={{ maxWidth: 520 }}>
            {admin
              ? "Le fichier n'est pas accessible sur le serveur. Remplacez l'image, ou demandez à l'administrateur technique de vérifier le stockage (php artisan storage:link)."
              : 'Réessayez plus tard ou contactez le secrétariat.'}
          </p>
          <button type="button" className="btn btn-sm btn-outline-primary"
            onClick={() => setImageErreur(prev => ({ ...prev, [imageId]: null }))}>
            Réessayer
          </button>
        </div>
      );
    }

    return (
      <div className="gstf-edt__zone" tabIndex={totalPages > 1 ? 0 : undefined} onKeyDown={naviguerClavier}
        aria-label={totalPages > 1 ? 'Emploi du temps : flèches gauche et droite pour changer de page' : undefined}>
        {isLoading && (
          // Image en cours de téléchargement : squelette de la taille de la zone d'affichage
          <span className="gstf-squelette gstf-edt__chargement" aria-hidden="true" />
        )}
        {isLoading && <span className="visually-hidden" role="status">Chargement de l'image…</span>}
        <PhotoProvider>
          <PhotoView src={imageUrl}>
            <img
              src={imageUrl}
              alt={`Emploi du temps du semestre ${semestre}${totalPages > 1 ? `, page ${page + 1}` : ''}`}
              className="gstf-edt__image"
              style={{ opacity: isLoading ? 0 : 1 }}
              onLoad={() => handleImageLoadEnd(imageId)}
              onError={() => {
                handleImageLoadEnd(imageId);
                setImageErreur(prev => ({ ...prev, [imageId]: imageUrl }));
              }}
            />
          </PhotoView>
        </PhotoProvider>
        {totalPages > 1 && (
          <>
            <button type="button" className="gstf-edt__fleche gstf-edt__fleche--gauche" onClick={pagePrecedente}
              disabled={page === 0} aria-label="Page précédente">
              <i className="bx bx-chevron-left"></i>
            </button>
            <button type="button" className="gstf-edt__fleche gstf-edt__fleche--droite" onClick={pageSuivante}
              disabled={page === totalPages - 1} aria-label="Page suivante">
              <i className="bx bx-chevron-right"></i>
            </button>
          </>
        )}
      </div>
    );
  })();

  // Choix du semestre : boutons groupés (lisibles aussi sur téléphone)
  const choixSemestre = (
    <div className="btn-group" role="group" aria-label="Semestre">
      {[1, 2].map((s) => (
        <button key={s} type="button" disabled={loading}
          className={`btn ${semestre === s ? 'btn-primary' : 'btn-outline-primary'}`}
          aria-pressed={semestre === s} onClick={() => handleChangeSemestre(s)}>
          Semestre {s}
        </button>
      ))}
    </div>
  );

  const entete = (
    <div className="gstf-page-header">
      <h4 className="fw-bold mb-0">
        <span className="text-muted fw-light">{ROLE_LABELS[role]} /</span> Emploi du temps
      </h4>
      {choixSemestre}
    </div>
  );

  // Premier chargement : la page garde sa structure (en-tête, carte, image) en squelette
  if (loading) {
    return (
      <div className="container-xxl flex-grow-1 container-p-y" aria-busy="true">
        {entete}
        <span className="visually-hidden" role="status">Chargement de l'emploi du temps…</span>
        <div className="card" aria-hidden="true">
          <div className="card-header d-flex justify-content-between align-items-center gap-2">
            <span className="d-block">
              <span className="gstf-squelette mb-2" style={{ width: '7rem', height: '1.1rem' }} />
              <span className="gstf-squelette" style={{ width: '5rem', height: '0.75rem' }} />
            </span>
            <span className="gstf-squelette" style={{ width: '7.5rem', height: '1.9rem' }} />
          </div>
          <div className="card-body pt-0">
            <span className="gstf-squelette gstf-edt__zone d-block" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-xxl flex-grow-1 container-p-y">
      {entete}

      <div className="card">
        <div className="card-header d-flex flex-wrap justify-content-between align-items-center gap-2">
          <div>
            <h5 className="card-title gstf-section-title mb-1">Semestre {semestre}</h5>
            <small className="text-muted" aria-live="polite">
              {totalPages === 0
                ? 'Pas encore publié'
                : totalPages > 1 ? `Page ${page + 1} sur ${totalPages}` : 'Une page'}
              {admin && ` · ${emploiActuel.length} / ${MAX_IMAGES} images`}
            </small>
          </div>
          <div className="d-flex flex-wrap gap-2">
            {currentEmploi && !imageErreur[currentEmploi.id] && (
              <a href={imageUrl} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-secondary">
                <i className="bx bx-link-external me-1"></i>Ouvrir l'image
              </a>
            )}
            {admin && (
              <button className="btn btn-sm btn-primary" onClick={openAddModal} disabled={complet}
                title={complet ? `Maximum ${MAX_IMAGES} images par semestre : supprimez ou remplacez une image` : undefined}>
                <i className="bx bx-plus me-1"></i>Ajouter
              </button>
            )}
            {admin && currentEmploi && (
              <>
                <button className="btn btn-sm btn-outline-primary" onClick={openEditModal}>
                  <i className="bx bx-edit me-1"></i>Remplacer
                </button>
                <button className="btn btn-sm btn-outline-danger" onClick={openDeleteModal} aria-label="Supprimer cette image">
                  <i className="bx bx-trash"></i>
                </button>
              </>
            )}
          </div>
        </div>

        <div className="card-body pt-0">
          {currentEmploi ? (
            <>
              {ImageViewer}
              <p className="small text-muted text-center mt-2 mb-0 d-none d-md-block">
                <i className="bx bx-zoom-in me-1"></i>Cliquez sur l'image pour l'agrandir
              </p>
            </>
          ) : (
            <div className="gstf-empty">
              <i className="bx bx-calendar-x d-block"></i>
              <p className="mb-1 fw-semibold text-body">Aucun emploi du temps pour le semestre {semestre}.</p>
              <p className="mb-0">
                {admin ? 'Ajoutez une ou plusieurs images (5 au maximum).' : "Il s'affichera ici dès sa publication par l'administration."}
              </p>
              <div className="d-flex flex-wrap justify-content-center gap-2 mt-3">
                {admin && (
                  <button className="btn btn-sm btn-primary" onClick={openAddModal}>
                    <i className="bx bx-plus me-1"></i>Ajouter un emploi du temps
                  </button>
                )}
                {autreAContenu && (
                  <button className="btn btn-sm btn-outline-primary" onClick={() => handleChangeSemestre(autreSemestre)}>
                    Voir le semestre {autreSemestre}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Miniatures : une par page */}
        {totalPages > 1 && (
          <div className="card-footer gstf-edt__miniatures" role="group" aria-label="Pages de l'emploi du temps">
            {emploiActuel.map((emploi, i) => (
              <button key={emploi.id} type="button" className={`gstf-edt__miniature${i === page ? ' is-active' : ''}`}
                onClick={() => handlePageChange(i)} aria-label={`Page ${i + 1}`} aria-current={i === page ? 'page' : undefined}>
                <img src={storageUrl(emploi.image_url)} alt="" loading="lazy" />
                <span>{i + 1}</span>
              </button>
            ))}
          </div>
        )}
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
import React, { useState, useEffect } from 'react';
import api, { errorMessage } from '../api/client';
import { useFeedback } from '../contexts/FeedbackContext';
import { useProf } from '../contexts/ProfContext';
import { useAnnonce } from '../contexts/AnnonceContext';
import { useNiveau  } from '../contexts/NiveauContext';
import { useAnnee } from '../contexts/AnneeContext';

const AnnonceAdminProf = () => {
  const { notify } = useFeedback();
  const role = localStorage.getItem('role');
  const { annonces, fetchAnnonces } = useAnnonce();
  const { profs: enseignants } = useProf();
  const { niveaux } = useNiveau ();
  const { annees } = useAnnee();

  const [newAnnonce, setNewAnnonce] = useState({
    titre: '',
    description: '',
    fichier: null,
    id_niveau: '',
    id_annee_aca: '',
  });
  const [editAnnonce, setEditAnnonce] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [selectedAnnonce, setSelectedAnnonce] = useState(null);
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [loadingUpdate, setLoadingUpdate] = useState(false);
  const [loadingDeleteId, setLoadingDeleteId] = useState(null);

  useEffect(() => {
    fetchAnnonces();
  }, []);

  const openModal = (id) => {
    const modal = new window.bootstrap.Modal(document.getElementById(id));
    modal.show();
  };

  const openEditModal = (annonce) => {
    setEditAnnonce({ ...annonce, fichier: null });
    openModal('editModal');
  };

  const openDeleteModal = (id) => {
    setConfirmDeleteId(id);
    openModal('deleteModal');
  };

  const openDetailModal = (annonce) => {
    setSelectedAnnonce(annonce);
    openModal('detailModal');
  };

  const handleCreate = async () => {
    setLoadingCreate(true);
    const formData = new FormData();

    // L'expéditeur est déterminé par le serveur
    Object.entries(newAnnonce).forEach(([key, value]) => {
      if (value) formData.append(key, value);
    });

    try {
      await api.post('/annonces', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setNewAnnonce({ titre: '', description: '', fichier: null, id_niveau: '', id_annee_aca: '' });
      fetchAnnonces();
      window.bootstrap.Modal.getInstance(document.getElementById('addModal'))?.hide();
      notify.success('Annonce publiée.');
    } catch (err) {
      notify.error(errorMessage(err, "Erreur lors de la publication de l'annonce."));
    } finally {
      setLoadingCreate(false);
    }
  };

  const handleUpdate = async () => {
    setLoadingUpdate(true);
    const formData = new FormData();

    // Seuls les champs modifiables sont envoyés ; l'expéditeur est déterminé par le serveur
    ['titre', 'description', 'id_annee_aca', 'fichier'].forEach((key) => {
      if (editAnnonce[key]) formData.append(key, editAnnonce[key]);
    });
    // Toujours envoyé : vide = « Tous les niveaux »
    formData.append('id_niveau', editAnnonce.id_niveau || '');

    try {
      await api.post(`/annonces/${editAnnonce.id}?_method=PUT`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      fetchAnnonces();
      window.bootstrap.Modal.getInstance(document.getElementById('editModal'))?.hide();
      notify.success('Annonce modifiée.');
    } catch (err) {
      notify.error(errorMessage(err, "Erreur lors de la modification de l'annonce."));
    } finally {
      setLoadingUpdate(false);
    }
  };

  const handleDelete = async (id) => {
    setLoadingDeleteId(id);
    try {
      await api.delete(`/annonces/${id}`);
      fetchAnnonces();
      window.bootstrap.Modal.getInstance(document.getElementById('deleteModal'))?.hide();
      notify.success('Annonce supprimée.');
    } catch (err) {
      notify.error(errorMessage(err, "Erreur lors de la suppression de l'annonce."));
    } finally {
      setLoadingDeleteId(null);
    }
  };

  return (
    <div className="container-xxl flex-grow-1 container-p-y">
      <h4 className="fw-bold py-3 mb-4">
        <span className="text-muted fw-light text-capitalize">{role} /</span> Annonces
      </h4>

      {role === 'admin' && (
        <button className="btn btn-primary mb-3" onClick={() => openModal('addModal')}>
          Nouvelle annonce
        </button>
      )}

      <div className="card">
        <h5 className="card-header">Liste des annonces</h5>
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Titre</th>
                <th>Expéditeur</th>
                <th>Date</th>
                <th>Niveau</th>
                <th>Année</th>
                {role === 'admin' && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {annonces.map((a) => (
                <tr key={a.id} onClick={() => openDetailModal(a)} style={{ cursor: 'pointer' }}>
                  <td>{a.titre}</td>
                  <td>{a.expediteur}</td>
                  <td>{new Date(a.created_at).toLocaleDateString('fr-FR')}</td>
                  <td>{a.niveau?.niveau || 'Tous'}</td>
                  <td>{a.annee_aca?.annee_aca || '--'}</td>
                  {role === 'admin' && (
                    <td>
                      <button className="btn btn-sm btn-outline-primary me-2" onClick={(e) => { e.stopPropagation(); openEditModal(a); }}>
                        <i className="bx bx-edit"></i>
                      </button>
                      <button className="btn btn-sm btn-outline-danger" onClick={(e) => { e.stopPropagation(); openDeleteModal(a.id); }}>
                        <i className="bx bx-trash"></i>
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

        {/* Modal Ajouter */}
        <div className="modal fade" id="addModal" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content p-3">
              <div className="modal-header"><h5>Nouvelle Annonce</h5></div>
              <div className="modal-body">
                <label className="form-label">Titre</label>
                <input type="text" className="form-control mb-2" value={newAnnonce.titre} onChange={e => setNewAnnonce({ ...newAnnonce, titre: e.target.value })} />

                <label className="form-label">Description</label>
                <textarea className="form-control mb-2" value={newAnnonce.description} onChange={e => setNewAnnonce({ ...newAnnonce, description: e.target.value })}></textarea>

                <label className="form-label">Niveau</label>
                <select className="form-control mb-2" value={newAnnonce.id_niveau} onChange={e => setNewAnnonce({ ...newAnnonce, id_niveau: e.target.value })}>
                  <option value="">Tous les niveaux</option>
                  {niveaux.map(n => <option key={n.id} value={n.id}>{n.niveau}</option>)}
                </select>

                <label className="form-label">Année académique</label>
                <select className="form-control mb-2" value={newAnnonce.id_annee_aca} onChange={e => setNewAnnonce({ ...newAnnonce, id_annee_aca: e.target.value })}>
                  <option value="">-- Choisir une année --</option>
                  {annees.map(a => <option key={a.id} value={a.id}>{a.annee_aca}</option>)}
                </select>

                <label className="form-label">Fichier</label>
                <input type="file" className="form-control" onChange={e => setNewAnnonce({ ...newAnnonce, fichier: e.target.files[0] })} />
              </div>
              <div className="modal-footer">
                <button className="btn btn-outline-secondary" data-bs-dismiss="modal">Annuler</button>
                <button className="btn btn-primary" onClick={handleCreate} disabled={loadingCreate}>
                  Publier {loadingCreate && <span className="spinner-border spinner-border-sm ms-2"></span>}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Modifier */}
        <div className="modal fade" id="editModal" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content p-3">
              <div className="modal-header"><h5>Modifier l'annonce</h5></div>
              <div className="modal-body">
                <label className="form-label">Titre</label>
                <input type="text" className="form-control mb-2" value={editAnnonce?.titre || ''} onChange={e => setEditAnnonce({ ...editAnnonce, titre: e.target.value })} />

                <label className="form-label">Description</label>
                <textarea className="form-control mb-2" value={editAnnonce?.description || ''} onChange={e => setEditAnnonce({ ...editAnnonce, description: e.target.value })}></textarea>

                <label className="form-label">Niveau</label>
                <select className="form-control mb-2" value={editAnnonce?.id_niveau || ''} onChange={e => setEditAnnonce({ ...editAnnonce, id_niveau: e.target.value })}>
                  <option value="">Tous les niveaux</option>
                  {niveaux.map(n => <option key={n.id} value={n.id}>{n.niveau}</option>)}
                </select>

                <label className="form-label">Année académique</label>
                <select className="form-control mb-2" value={editAnnonce?.id_annee_aca || ''} onChange={e => setEditAnnonce({ ...editAnnonce, id_annee_aca: e.target.value })}>
                  <option value="">-- Choisir une année --</option>
                  {annees.map(a => <option key={a.id} value={a.id}>{a.annee_aca}</option>)}
                </select>

                <label className="form-label">Fichier</label>
                <input type="file" className="form-control" onChange={e => setEditAnnonce({ ...editAnnonce, fichier: e.target.files[0] })} />
              </div>
              <div className="modal-footer">
                <button className="btn btn-outline-secondary" data-bs-dismiss="modal">Annuler</button>
                <button className="btn btn-primary" onClick={handleUpdate} disabled={loadingUpdate}>
                  Enregistrer {loadingUpdate && <span className="spinner-border spinner-border-sm ms-2"></span>}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Supprimer */}
        <div className="modal fade" id="deleteModal" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header"><h5>Confirmation</h5></div>
              <div className="modal-body">Voulez-vous vraiment supprimer cette annonce ?</div>
              <div className="modal-footer">
                <button className="btn btn-outline-secondary" data-bs-dismiss="modal">Annuler</button>
                <button className="btn btn-danger" onClick={() => handleDelete(confirmDeleteId)} disabled={loadingDeleteId === confirmDeleteId}>
                  Supprimer {loadingDeleteId === confirmDeleteId && <span className="spinner-border spinner-border-sm ms-2"></span>}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Détail */}
        <div className="modal fade" id="detailModal" tabIndex="-1">
          <div className="modal-dialog modal-lg">
            <div className="modal-content p-3">
              <div className="modal-header"><h5>{selectedAnnonce?.titre}</h5></div>
              <div className="modal-body">
                <p><strong>Expéditeur:</strong> {selectedAnnonce?.expediteur}</p>
                <p><strong>Niveau:</strong> {selectedAnnonce?.niveau?.niveau || 'Tous les niveaux'}</p>
                <p><strong>Année académique:</strong> {selectedAnnonce?.annee_aca?.annee}</p>
                <p><strong>Description:</strong></p>
                <p>{selectedAnnonce?.description}</p>
                {selectedAnnonce?.fichier && (
                  <p><a href={selectedAnnonce.fichier} target="_blank" rel="noreferrer" className="btn btn-outline-primary">Télécharger le fichier</a></p>
                )}
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" data-bs-dismiss="modal">Fermer</button>
              </div>
            </div>
          </div>
        </div>
      </div>
  );
};

export default AnnonceAdminProf;
import React, { useState } from 'react';
import { useInfo } from '../../contexts/InfoContext';
import axios from 'axios';

const Info = () => {
  const { infos, fetchInfos } = useInfo();
  const [newInfo, setNewInfo] = useState({ auteur: '', titre: '', description: '' });
  const [editInfo, setEditInfo] = useState({ id: null, auteur: '', titre: '', description: '' });
  const [selectedInfo, setSelectedInfo] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [loadingUpdate, setLoadingUpdate] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);

  const openModal = (id) => {
    const modalEl = document.getElementById(id);
    if (modalEl) {
      const modal = new window.bootstrap.Modal(modalEl);
      modal.show();
    }
  };

  const openDetailModal = (info) => {
    setSelectedInfo(info);
    openModal('detailModal');
  };

  const openEditModal = (info) => {
    setEditInfo({ ...info });
    openModal('editModal');
  };

  const openDeleteModal = (id) => {
    setConfirmDeleteId(id);
    openModal('deleteModal');
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

  const truncate = (text, length = 60) =>
    text.length > length ? text.slice(0, length) + '…' : text;

  return (
    <div className="content-wrapper">
      <div className="container-xxl flex-grow-1 container-p-y">
        <h4 className="fw-bold py-3 mb-4"><span className="text-muted fw-light">Admin / </span>Info</h4>

        <div className="mb-3">
          <button className="btn btn-primary" onClick={() => openModal('addModal')}>
            Nouveau
          </button>
        </div>

        <div className="card">
          <h5 className="card-header">Liste des infos publiées</h5>
          <div className="table-responsive text-nowrap">
            <table className="table table-hover">
              <thead>
                <tr>
                  <th>Titre</th>
                  <th>Auteur</th>
                  <th>Description</th>
                  <th>Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {infos.map((a) => (
                  <tr key={a.id} onClick={() => openDetailModal(a)} style={{ cursor: 'pointer' }}>
                    <td>{a.titre}</td>
                    <td>{a.auteur}</td>
                    <td>{truncate(a.description)}</td>
                    <td>
                      {a.created_at
                        ? new Date(a.created_at).toLocaleString('fr-FR', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })
                        : 'Date inconnue'}
                    </td>
                    <td>
                      <button
                        className="btn btn-sm btn-outline-primary me-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(a);
                        }}
                      >
                        <i className="bx bx-edit"></i>
                      </button>
                      <button
                        className="btn btn-sm btn-outline-primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          openDeleteModal(a.id);
                        }}
                      >
                        <i className="bx bx-trash"></i>
                      </button>
                    </td>
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
              <h5>Nouvelle Info</h5>
              <label className="form-label">Titre</label>
              <input className="form-control mb-2" value={newInfo.titre}
                onChange={e => setNewInfo({ ...newInfo, titre: e.target.value })} />
              <label className="form-label">Auteur</label>
              <input className="form-control mb-2" value={newInfo.auteur}
                onChange={e => setNewInfo({ ...newInfo, auteur: e.target.value })} />
              <label className="form-label">Description</label>
              <textarea className="form-control mb-2 p-3" rows="5" value={newInfo.description}
                onChange={e => setNewInfo({ ...newInfo, description: e.target.value })}></textarea>
              <div className="text-end">
                <button className="btn btn-secondary me-2" data-bs-dismiss="modal">Annuler</button>
                <button className="btn btn-primary" onClick={handleCreate} disabled={loadingCreate}>
                  Publier {loadingCreate && <span className="spinner-border spinner-border-sm ms-2" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Modifier */}
        <div className="modal fade" id="editModal" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content p-3">
              <h5>Modifier Info</h5>
              <label className="form-label">Titre</label>
              <input className="form-control mb-2" value={editInfo.titre}
                onChange={e => setEditInfo({ ...editInfo, titre: e.target.value })} />
              <label className="form-label">Auteur</label>
              <input className="form-control mb-2" value={editInfo.auteur}
                onChange={e => setEditInfo({ ...editInfo, auteur: e.target.value })} />
              <label className="form-label">Description</label>
              <textarea className="form-control mb-2 p-3" rows="5" value={editInfo.description}
                onChange={e => setEditInfo({ ...editInfo, description: e.target.value })}></textarea>
              <div className="text-end">
                <button className="btn btn-secondary me-2" data-bs-dismiss="modal">Annuler</button>
                <button className="btn btn-primary" onClick={handleUpdate} disabled={loadingUpdate}>
                  Enregistrer {loadingUpdate && <span className="spinner-border spinner-border-sm ms-2" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Supprimer */}
        <div className="modal fade" id="deleteModal" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content p-3">
              <h5>Confirmer la suppression</h5>
              <p className="mb-4">Voulez-vous vraiment supprimer cette information ?</p>
              <div className="text-end">
                <button className="btn btn-secondary me-2" data-bs-dismiss="modal">Annuler</button>
                <button className="btn btn-danger" onClick={handleDelete} disabled={loadingDelete}>
                  Supprimer {loadingDelete && <span className="spinner-border spinner-border-sm ms-2" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Détail */}
        <div className="modal fade" id="detailModal" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content rounded-3 shadow-sm border-0">
              <div className="modal-header border-bottom-0 pb-0">
                <h4 className="modal-title w-100 text-center fw-semibold text-dark">
                  {selectedInfo?.titre}
                </h4>
              </div>
              <div className="modal-body px-4 py-3">
                <p className="fst-italic text-muted mb-3">
                  <i className="bx bx-user" /> {selectedInfo?.auteur}
                </p>
                <div className="mb-4">
                  <h6 className="fw-semibold text-decoration-underline text-dark">Description</h6>
                  <p style={{ whiteSpace: 'pre-line' }}>{selectedInfo?.description}</p>
                </div>
                <div className="text-end">
                  <small className="text-muted fst-italic">
                    Publié le : {selectedInfo?.created_at &&
                      new Date(selectedInfo.created_at).toLocaleString('fr-FR', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                  </small>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Info;

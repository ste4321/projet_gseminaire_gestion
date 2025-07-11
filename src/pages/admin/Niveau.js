import React, { useState } from 'react';
import { useNiveau } from '../../contexts/NiveauContext';
import axios from 'axios';

const Niveau = () => {
  const { niveaux, fetchNiveaux, loading } = useNiveau();
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ niveau: '' });
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [loadingDeleteId, setLoadingDeleteId] = useState(null);

  const openModal = (id) => {
    const modal = new window.bootstrap.Modal(document.getElementById(id));
    modal.show();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoadingSubmit(true);
    try {
      if (selected) {
        await axios.put(`/api/niveaux/${selected.id}`, form);
      } else {
        await axios.post(`/api/niveaux`, form);
      }
      fetchNiveaux();
      const modal = window.bootstrap.Modal.getInstance(document.getElementById(selected ? 'editModal' : 'addModal'));
      modal.hide();
      setForm({ niveau: '' });
      setSelected(null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSubmit(false);
    }
  };

  const handleDelete = async () => {
    setLoadingDeleteId(deleteId);
    try {
      await axios.delete(`/api/niveaux/${deleteId}`);
      fetchNiveaux();
      const modal = window.bootstrap.Modal.getInstance(document.getElementById('deleteModal'));
      modal.hide();
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDeleteId(null);
    }
  };

  const filtered = niveaux.filter(n => n.niveau.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="container-xxl flex-grow-1 container-p-y">
      <h4 className="fw-bold py-3 mb-4">Gestion des Niveaux</h4>

      <input
        type="text"
        placeholder="Rechercher un niveau..."
        className="form-control mb-3"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="mb-3">
        <button
          className="btn btn-primary"
          onClick={() => {
            setForm({ niveau: '' });
            setSelected(null);
            openModal('addModal');
          }}
        >
          Nouveau Niveau
        </button>
      </div>

      <div className="card">
        <h5 className="card-header">Liste des niveaux</h5>
        <div className="table-responsive text-nowrap">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Niveau</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((n) => (
                <tr key={n.id} onClick={() => { setDetail(n); openModal('detailModal'); }} style={{ cursor: 'pointer' }}>
                  <td>{n.id}</td>
                  <td>{n.niveau}</td>
                  <td>
                    <button
                      className="btn btn-sm btn-outline-primary me-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelected(n);
                        setForm({ niveau: n.niveau });
                        openModal('editModal');
                      }}
                    >
                      <i className="bx bx-edit"></i>
                    </button>
                    <button
                      className="btn btn-sm btn-outline-danger"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteId(n.id);
                        openModal('deleteModal');
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
            <div className="modal-header"><h5 className="modal-title">Ajouter un niveau</h5></div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <input
                  value={form.niveau}
                  onChange={(e) => setForm({ niveau: e.target.value })}
                  className="form-control"
                  placeholder="Nom du niveau"
                  required
                />
              </div>
              <div className="modal-footer">
                <button className="btn btn-outline-secondary" data-bs-dismiss="modal">Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={loadingSubmit}>
                  Ajouter
                  {loadingSubmit && <span className="spinner-border spinner-border-sm ms-2" />}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Modal Modifier */}
      <div className="modal fade" id="editModal" tabIndex="-1">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content p-3">
            <div className="modal-header"><h5 className="modal-title">Modifier le niveau</h5></div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <input
                  value={form.niveau}
                  onChange={(e) => setForm({ niveau: e.target.value })}
                  className="form-control"
                  placeholder="Nom du niveau"
                  required
                />
              </div>
              <div className="modal-footer">
                <button className="btn btn-outline-secondary" data-bs-dismiss="modal">Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={loadingSubmit}>
                  Modifier
                  {loadingSubmit && <span className="spinner-border spinner-border-sm ms-2" />}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Modal Détail */}
      <div className="modal fade" id="detailModal" tabIndex="-1">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content p-3">
            <div className="modal-header"><h5 className="modal-title">Détail du niveau</h5></div>
            <div className="modal-body">
              {detail ? (
                <>
                  <p><strong>ID :</strong> {detail.id}</p>
                  <p><strong>Niveau :</strong> {detail.niveau}</p>
                  <p><strong>Créé le :</strong> {new Date(detail.created_at).toLocaleDateString()}</p>
                </>
              ) : (
                <p>Aucune information disponible</p>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline-secondary" data-bs-dismiss="modal">Fermer</button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Suppression */}
      <div className="modal fade" id="deleteModal" tabIndex="-1">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header"><h5 className="modal-title">Supprimer un niveau</h5></div>
            <div className="modal-body">
              <p>Voulez-vous vraiment supprimer ce niveau ?</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline-secondary" data-bs-dismiss="modal">Annuler</button>
              <button className="btn btn-danger" onClick={handleDelete} disabled={loadingDeleteId}>
                Supprimer
                {loadingDeleteId && <span className="spinner-border spinner-border-sm ms-2" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Niveau;

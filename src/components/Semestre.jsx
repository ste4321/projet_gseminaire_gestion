import React, { useState } from 'react';
import { useSemestre } from '../contexts/SemestreContext';
import api, { errorMessage } from '../api/client';
import { useFeedback } from '../contexts/FeedbackContext';
import { plusRecentsDabord } from '../utils/tri';

const Semestre = () => {
  const { semestres, fetchSemestres, loading } = useSemestre();
  const [form, setForm] = useState({ semestre: '', code_semestre: '' });
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [loadingDeleteId, setLoadingDeleteId] = useState(null);
  const { notify } = useFeedback();

  // Pagination
  const itemsPerPage = 5;
  const [currentPage, setCurrentPage] = useState(1);
  const filtered = plusRecentsDabord(semestres).filter((s) =>
    s.semestre.toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const currentItems = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const showAlert = (type, message) => (type === 'success' ? notify.success(message) : notify.error(message));

  const openModal = (id) => {
    const modal = new window.bootstrap.Modal(document.getElementById(id));
    modal.show();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoadingSubmit(true);
    try {
      if (selected) {
        await api.put(`/semestres/${selected.id}`, form);
        showAlert('success', 'Semestre modifié avec succès.');
      } else {
        await api.post(`/semestres`, form);
        showAlert('success', 'Semestre ajouté avec succès.');
      }
      fetchSemestres();
      const modal = window.bootstrap.Modal.getInstance(
        document.getElementById(selected ? 'editModal' : 'addModal')
      );
      modal.hide();
      setForm({ semestre: '', code_semestre: '' });
      setSelected(null);
    } catch (err) {
      showAlert('danger', errorMessage(err, 'Erreur lors de l\'enregistrement.'));
      console.error(err);
    } finally {
      setLoadingSubmit(false);
    }
  };

  const handleDelete = async () => {
    setLoadingDeleteId(deleteId);
    try {
      await api.delete(`/semestres/${deleteId}`);
      fetchSemestres();
      showAlert('success', 'Semestre supprimé.');
      const modal = window.bootstrap.Modal.getInstance(document.getElementById('deleteModal'));
      modal.hide();
    } catch (err) {
      showAlert('danger', errorMessage(err, 'Erreur lors de la suppression.'));
    } finally {
      setLoadingDeleteId(null);
    }
  };

  return (
    <div className="container-xxl flex-grow-1 container-p-y">
      <h4 className="fw-bold py-3 mb-4">Gestion des Semestres</h4>

      <input
        type="text"
        placeholder="Rechercher un semestre..."
        className="form-control mb-3"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="mb-3">
        <button
          className="btn btn-primary"
          onClick={() => {
            setForm({ semestre: '', code_semestre: '' });
            setSelected(null);
            openModal('addModal');
          }}
        >
          Nouveau Semestre
        </button>
      </div>

      <div className="card">
        <h5 className="card-header">Liste des semestres</h5>
        <div className="table-responsive text-nowrap">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Semestre</th>
                <th>Code</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.map((s) => (
                <tr
                  key={s.id}
                  onClick={() => {
                    setDetail(s);
                    openModal('detailModal');
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <td>{s.id}</td>
                  <td>{s.semestre}</td>
                  <td>{s.code_semestre}</td>
                  <td>
                    <button
                      className="btn btn-sm btn-outline-primary me-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelected(s);
                        setForm({ semestre: s.semestre, code_semestre: s.code_semestre });
                        openModal('editModal');
                      }}
                    >
                      <i className="bx bx-edit"></i>
                    </button>
                    <button
                      className="btn btn-sm btn-outline-primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteId(s.id);
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

          {/* Pagination controls */}
          <div className="d-flex justify-content-center mt-3">
            <nav>
              <ul className="pagination">
                {[...Array(totalPages).keys()].map((num) => (
                  <li key={num} className={`page-item ${currentPage === num + 1 ? 'active' : ''}`}>
                    <button className="page-link" onClick={() => setCurrentPage(num + 1)}>
                      {num + 1}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>
      </div>
{/* Modal Ajouter */}
<div className="modal fade" id="addModal" tabIndex="-1">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content p-3">
            <div className="modal-header"><h5 className="modal-title">Ajouter un semestre</h5></div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <input
                  value={form.semestre}
                  onChange={(e) => setForm({ ...form, semestre: e.target.value })}
                  className="form-control mb-2"
                  placeholder="Nom du semestre"
                  required
                />
                <input
                  value={form.code_semestre}
                  onChange={(e) => setForm({ ...form, code_semestre: e.target.value })}
                  className="form-control"
                  placeholder="Code du semestre (facultatif)"
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
            <div className="modal-header"><h5 className="modal-title">Modifier le semestre</h5></div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <input
                  value={form.semestre}
                  onChange={(e) => setForm({ ...form, semestre: e.target.value })}
                  className="form-control mb-2"
                  placeholder="Nom du semestre"
                  required
                />
                <input
                  value={form.code_semestre}
                  onChange={(e) => setForm({ ...form, code_semestre: e.target.value })}
                  className="form-control"
                  placeholder="Code du semestre"
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
            <div className="modal-header"><h5 className="modal-title">Détail du semestre</h5></div>
            <div className="modal-body">
              {detail ? (
                <>
                  <p><strong>ID :</strong> {detail.id}</p>
                  <p><strong>Semestre :</strong> {detail.semestre}</p>
                  <p><strong>Code :</strong> {detail.code_semestre || '-'}</p>
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
            <div className="modal-header"><h5 className="modal-title">Supprimer un semestre</h5></div>
            <div className="modal-body">
              <p>Voulez-vous vraiment supprimer ce semestre ?</p>
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

export default Semestre;

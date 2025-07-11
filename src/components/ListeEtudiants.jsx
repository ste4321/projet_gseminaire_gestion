import React, { useState } from 'react';
import { useEtudiant } from '../contexts/EtudiantContext';
import axios from 'axios';

const ListeEtudiant = () => {
  const { etudiants, setEtudiants, loading } = useEtudiant();
  const [searchTerm, setSearchTerm] = useState('');
  const [editEtudiant, setEditEtudiant] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [detailEtudiant, setDetailEtudiant] = useState(null);
  const [newEtudiant, setNewEtudiant] = useState({ nom_prenom: '', diocese: '', email: '', telephone: '' });
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [loadingUpdate, setLoadingUpdate] = useState(false);
  const [loadingDeleteId, setLoadingDeleteId] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 10;
  const role = localStorage.getItem('role');

  const [selectedEtudiant, setSelectedEtudiant] = useState(null); // Pour le modal notes

  const filteredEtudiants = etudiants.filter(e =>
    Object.values(e).some(val =>
      typeof val === 'string' && val.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const totalPages = Math.ceil(filteredEtudiants.length / itemsPerPage);
  const currentEtudiants = filteredEtudiants.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage
  );

  const openModal = (id) => {
    const modal = new window.bootstrap.Modal(document.getElementById(id));
    modal.show();
  };

  const openEditModal = (etudiant) => {
    setEditEtudiant({ ...etudiant });
    openModal('editModal');
  };

  const openDeleteModal = (id) => {
    setConfirmDeleteId(id);
    openModal('deleteModal');
  };

  const openDetailModal = (etudiant) => {
    setDetailEtudiant(etudiant);
    openModal('detailModal');
  };

  // Nouvelle fonction pour ouvrir le modal des notes
  const openNotesModal = (etudiant) => {
    setSelectedEtudiant(etudiant);
    openModal('notesModal');
  };
  const handleCreate = async () => {
    setLoadingCreate(true);
    try {
      const res = await axios.post('http://127.0.0.1:8000/api/etudiants', newEtudiant);
      setEtudiants([...etudiants, res.data]);
      const modal = window.bootstrap.Modal.getInstance(document.getElementById('addModal'));
      modal.hide();
    } catch (error) {
      console.error('Erreur lors de la création', error);
    } finally {
      setLoadingCreate(false);
    }
  };

  const handleUpdate = async () => {
    setLoadingUpdate(true);
    try {
      await axios.put(`http://127.0.0.1:8000/api/etudiants/${editEtudiant.id}`, editEtudiant);
      setEtudiants(etudiants.map(e => e.id === editEtudiant.id ? { ...e, ...editEtudiant } : e));
      const modal = window.bootstrap.Modal.getInstance(document.getElementById('editModal'));
      modal.hide();
    } catch (error) {
      console.error('Erreur lors de la mise à jour', error);
    } finally {
      setLoadingUpdate(false);
    }
  };

  const handleDelete = async () => {
    setLoadingDeleteId(confirmDeleteId);
    try {
      await axios.delete(`http://127.0.0.1:8000/api/etudiants/${confirmDeleteId}`);
      setEtudiants(etudiants.filter(e => e.id !== confirmDeleteId));
      const modal = window.bootstrap.Modal.getInstance(document.getElementById('deleteModal'));
      modal.hide();
    } catch (error) {
      console.error('Erreur lors de la suppression', error);
    } finally {
      setLoadingDeleteId(null);
    }
  };
  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status"></div>
        <p className="mt-3">Chargement des étudiants...</p>
      </div>
    );
  }

  return (
    <div className="container-xxl flex-grow-1 container-p-y">
      <h4 className="fw-bold py-3 mb-4">
        <span className="text-muted fw-light text-capitalize">{role} /</span> Étudiants
      </h4>

      <input
        type="text"
        placeholder="Rechercher un étudiant..."
        className="form-control mb-3"
        onChange={(e) => {
          setSearchTerm(e.target.value);
          setCurrentPage(0);
        }}
      />

      {role === 'admin' && (
        <div className="mb-3 d-flex gap-2">
          <button
            className="btn btn-primary"
            onClick={() => {
              setNewEtudiant({ nom_prenom: '', diocese: '', email: '', telephone: '' });
              openModal('addModal');
            }}
          >
            Nouveau
          </button>
          <button className="btn btn-outline-secondary">Import fichier</button>
        </div>
      )}

      <div className="card">
        <h5 className="card-header">Liste des étudiants</h5>
        <div className="table-responsive text-nowrap">
          <table className="table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Email</th>
                {role === 'admin' && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {currentEtudiants.map((e) => (
                <tr key={e.id} style={{ cursor: 'pointer' }}>
                  <td onClick={() => openNotesModal(e)}>{e.nom_prenom}</td>
                  <td onClick={() => openNotesModal(e)}>{e.email}</td>
                  {role === 'admin' && (
                    <td>
                      <button
                        className="btn btn-sm btn-outline-primary me-2"
                        onClick={(ev) => { ev.stopPropagation(); openEditModal(e); }}
                        title="Modifier"
                      >
                        <i className="bx bx-edit"></i>
                      </button>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={(ev) => { ev.stopPropagation(); openDeleteModal(e.id); }}
                        title="Supprimer"
                      >
                        <i className="bx bx-trash"></i>
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <nav className="mt-3" aria-label="Pagination">
            <ul className="pagination justify-content-center">
              <li className={`page-item ${currentPage === 0 ? 'disabled' : ''}`}>
                <button className="page-link" onClick={() => setCurrentPage(0)}>&laquo;</button>
              </li>
              {Array.from({ length: totalPages }, (_, i) => (
                <li key={i} className={`page-item ${i === currentPage ? 'active' : ''}`}>
                  <button className="page-link" onClick={() => setCurrentPage(i)}>{i + 1}</button>
                </li>
              ))}
              <li className={`page-item ${currentPage === totalPages - 1 ? 'disabled' : ''}`}>
                <button className="page-link" onClick={() => setCurrentPage(totalPages - 1)}>&raquo;</button>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      {/* Modal des notes */}
      <div
        className="modal fade"
        id="notesModal"
        tabIndex="-1"
        aria-labelledby="notesModalLabel"
        aria-hidden="true"
      >
        <div className="modal-dialog modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">{selectedEtudiant?.nom_prenom}</h5>
              {/* <button
                type="button"
                className="btn-close"
                data-bs-dismiss="modal"
                aria-label="Fermer"
              ></button> */}
            </div>
            <div className="modal-body">
              {selectedEtudiant ? (
                <>
                  <p><strong>Immatricule :</strong> {selectedEtudiant.id}</p>
                  <p><strong>Diocèse :</strong> {selectedEtudiant.diocese}</p>
                  {/* Niveau non dispo dans ton modèle, donc tu peux ajuster ou retirer */}
                  {/* <p><strong>Niveau :</strong> L{selectedEtudiant.annee}</p> */}

                  <p><u><strong>Note :</strong></u></p>

                  <div className="table-responsive">
                    <table className="table table-bordered">
                      <thead>
                        <tr>
                          <th>Matière</th>
                          <th>Note /20</th>
                          <th>Coefficient</th>
                          <th>Mention</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[ // données statiques
                          { matiere: "Français", note: 12, coef: 2 },
                          { matiere: "Mathématiques", note: 16, coef: 3 },
                          { matiere: "Histoire", note: 10, coef: 2 },
                          { matiere: "Anglais", note: 14, coef: 1 },
                        ].map((m, i) => {
                          const mention =
                            m.note >= 16 ? "Très bien" :
                            m.note >= 14 ? "Bien" :
                            m.note >= 12 ? "Assez bien" :
                            m.note >= 10 ? "Passable" : "Insuffisant";

                          return (
                            <tr key={i}>
                              <td>{m.matiere}</td>
                              <td>{m.note}</td>
                              <td>{m.coef}</td>
                              <td>{mention}</td>
                            </tr>
                          );
                        })}

                        {/* Calcul moyenne */}
                        {
                          (() => {
                            const notes = [
                              { note: 12, coef: 2 },
                              { note: 16, coef: 3 },
                              { note: 10, coef: 2 },
                              { note: 14, coef: 1 },
                            ];
                            const totalCoef = notes.reduce((sum, n) => sum + n.coef, 0);
                            const totalNote = notes.reduce((sum, n) => sum + n.note * n.coef, 0);
                            const moyenne = (totalNote / totalCoef).toFixed(2);

                            const mentionGlobale =
                              moyenne >= 16 ? "Très bien" :
                              moyenne >= 14 ? "Bien" :
                              moyenne >= 12 ? "Assez bien" :
                              moyenne >= 10 ? "Passable" : "Insuffisant";

                            return (
                              <>
                                <tr className="table-active">
                                  <td colSpan="2"><strong>Total coefficients :</strong> {totalCoef}</td>
                                  <td colSpan="2"><strong>Total pondéré :</strong> {totalNote}</td>
                                </tr>
                                <tr>
                                  <td colSpan="4" className="text-end">
                                    <strong>Moyenne Générale : {moyenne}/20</strong>
                                    <span className="ms-3 badge bg-primary">{mentionGlobale}</span>
                                  </td>
                                </tr>
                              </>
                            );
                          })()
                        }
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <p>Chargement…</p>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" data-bs-dismiss="modal">Fermer</button>
            </div>
          </div>
        </div>
      </div>

{/* Modal Modifier */}
<div className="modal fade" id="editModal" tabIndex="-1">
<div className="modal-dialog modal-dialog-centered">
  <div className="modal-content p-3">
    <h5 className="modal-title">Modifier un étudiant</h5>
    <input className="form-control mb-2" value={editEtudiant?.nom_prenom || ''} onChange={e => setEditEtudiant({ ...editEtudiant, nom_prenom: e.target.value })} />
    <input className="form-control mb-2" value={editEtudiant?.diocese || ''} onChange={e => setEditEtudiant({ ...editEtudiant, diocese: e.target.value })} />
    <input className="form-control mb-2" value={editEtudiant?.email || ''} onChange={e => setEditEtudiant({ ...editEtudiant, email: e.target.value })} />
    <input className="form-control mb-2" value={editEtudiant?.telephone || ''} onChange={e => setEditEtudiant({ ...editEtudiant, telephone: e.target.value })} />
    <div className="modal-footer">
      <button className="btn btn-secondary" data-bs-dismiss="modal">Annuler</button>
      <button className="btn btn-primary" onClick={handleUpdate} disabled={loadingUpdate}>
        {loadingUpdate ? 'Modification...' : 'Modifier'}
      </button>
    </div>
  </div>
</div>
</div>

{/* Modal Détail */}
<div className="modal fade" id="detailModal" tabIndex="-1">
<div className="modal-dialog modal-dialog-centered">
  <div className="modal-content p-3">
    <h5 className="modal-title">Détail Étudiant</h5>
    {detailEtudiant && (
      <>
        <p><strong>Nom :</strong> {detailEtudiant.nom_prenom}</p>
        <p><strong>Diocèse :</strong> {detailEtudiant.diocese}</p>
        <p><strong>Email :</strong> {detailEtudiant.email || '--'}</p>
        <p><strong>Téléphone :</strong> {detailEtudiant.telephone || '--'}</p>
      </>
    )}
    <div className="modal-footer">
      <button className="btn btn-secondary" data-bs-dismiss="modal">Fermer</button>
    </div>
  </div>
</div>
</div>

{/* Modal Supprimer */}
<div className="modal fade" id="deleteModal" tabIndex="-1">
<div className="modal-dialog modal-dialog-centered">
  <div className="modal-content p-3">
    <h5 className="modal-title">Confirmation</h5>
    <p>Voulez-vous vraiment supprimer cet étudiant ?</p>
    <div className="modal-footer">
      <button className="btn btn-secondary" data-bs-dismiss="modal">Annuler</button>
      <button className="btn btn-danger" onClick={() => handleDelete(confirmDeleteId)} disabled={loadingDeleteId === confirmDeleteId}>
        {loadingDeleteId === confirmDeleteId ? 'Suppression...' : 'Supprimer'}
      </button>
    </div>
  </div>
</div>
</div>
    </div>
  );
};

export default ListeEtudiant;

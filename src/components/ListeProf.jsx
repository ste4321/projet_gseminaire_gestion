import React, { useState } from 'react';
import { useProf } from '../contexts/ProfContext';
import axios from 'axios';

const ListeProf = () => {
  const { profs, setProfs, loading } = useProf();
  const [searchTerm, setSearchTerm] = useState('');
  const [editProf, setEditProf] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [role, setRole] = useState(localStorage.getItem('role'));
  const [newProf, setNewProf] = useState({
    nom_prenom: '',
    adresse: '',
    mail: '',
    telephone: '',
  });
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [loadingUpdate, setLoadingUpdate] = useState(false);
  const [loadingDeleteId, setLoadingDeleteId] = useState(null); // pour bouton Supprimer
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 10;

  const filteredProfs = profs.filter(prof =>
    Object.values(prof).some(val =>
      typeof val === 'string' && val.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );
  //Pagination
  const totalPages = Math.ceil(filteredProfs.length / itemsPerPage);
  const currentProfs = filteredProfs.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage
  );
  //-----------------------------------------
  const handleCreate = async () => {
    setLoadingCreate(true);
    try {
      const response = await axios.post(`http://127.0.0.1:8000/api/enseignants`, newProf);
      setProfs([...profs, response.data]);
      setNewProf({ nom_prenom: '', adresse: '', mail: '', telephone: '' });
      const modal = window.bootstrap.Modal.getInstance(document.getElementById('addModal'));
      modal.hide();
    } catch (error) {
      console.error("Erreur lors de l'ajout :", error.response?.data);
    } finally {
      setLoadingCreate(false);
    }
  };
  //-----------------------------------------
  const handleUpdate = async () => {
    setLoadingUpdate(true);
    try {
      const response = await axios.put(
        `http://127.0.0.1:8000/api/enseignants/${editProf.id}`,
        editProf
      );
  
      // Mettre à jour la liste localement
      const updatedList = profs.map((prof) =>
        prof.id === editProf.id ? { ...prof, ...editProf } : prof
      );
      setProfs(updatedList);
  
      // Fermer le modal
      const modal = window.bootstrap.Modal.getInstance(document.getElementById('editModal'));
      if (modal) modal.hide();
  
      // Réinitialiser le prof en cours d'édition
      setEditProf(null);
    } catch (error) {
      console.error("Erreur lors de la mise à jour :", error.response?.data || error.message);
    } finally {
      setLoadingUpdate(false);
    }
  };
  
  //-----------------------------------------
  const handleDelete = async (id) => {
    setLoadingDeleteId(id);
    try {
      await axios.delete(`http://127.0.0.1:8000/api/enseignants/${id}`);
      setProfs(profs.filter(prof => prof.id !== id));
  
      // Fermer le modal de suppression
      const modal = window.bootstrap.Modal.getInstance(document.getElementById('deleteModal'));
      if (modal) modal.hide();
    } catch (error) {
      console.error("Erreur lors de la suppression :", error);
    } finally {
      setLoadingDeleteId(null);
    }
  };
  
  //-----------------------------------------
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
      <h4 className="fw-bold py-3 mb-4"><span className="text-muted fw-light text-capitalize">{role} /</span> Enseignants</h4>

      <input
        type="text"
        placeholder="Rechercher un professeur..."
        className="form-control mb-3"
        onChange={(e) => {
          setSearchTerm(e.target.value);
          setCurrentPage(0); // revient à la première page lors d'une recherche
        }}
        
      />
        {role === 'admin' && (
          <div className="mb-3">
            <button
              className="btn btn-primary"
              onClick={() => {
                setNewProf({ nom_prenom: '', adresse: '', mail: '', telephone: '' });
                const modal = new window.bootstrap.Modal(document.getElementById('addModal'));
                modal.show();
              }}
            >
              Nouveau
            </button>
          </div>
        )}

      <div className="card">
        <h5 className="card-header">Liste des enseignants</h5>
        <div className="table-responsive text-nowrap">
          <table className="table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Adresse</th>
                <th>Email</th>
                <th>Téléphone</th>
                {role === 'admin' && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {currentProfs.map(prof => (
                <tr key={prof.id}>
                  <td>{prof.nom_prenom}</td>
                  <td>{prof.adresse}</td>
                  <td>{prof.mail}</td>
                  <td>{prof.telephone}</td>
                  {role === 'admin' && (
                    <td>
                      <button
                        className="btn btn-sm btn-outline-primary me-2"
                        onClick={() => openEditModal(prof)}
                        title="Modifier"
                      >
                        <i className="bx bx-edit"></i>
                      </button>
                      <button
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => openDeleteModal(prof.id)}
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

      {/* Modal Modifier */}
      <div className="modal fade" id="editModal" tabIndex="-1" aria-labelledby="editModalLabel" aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content p-3">
            <div className="modal-header">
              <h5 className="modal-title" id="editModalLabel">Modifier un professeur</h5>
              {/* <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button> */}
            </div>
            <div className="modal-body">
              <label htmlFor="nameBasic" className="form-label">Nom Prénom</label>
              <input type="text" className="form-control mb-2" value={editProf?.nom_prenom || ''} onChange={e => setEditProf({ ...editProf, nom_prenom: e.target.value })} />
              <label htmlFor="nameBasic" className="form-label">Adresse</label>
              <input type="text" className="form-control mb-2" value={editProf?.adresse || ''} onChange={e => setEditProf({ ...editProf, adresse: e.target.value })} />
              <label htmlFor="nameBasic" className="form-label">Email</label>
              <input type="email" className="form-control mb-2" value={editProf?.mail || ''} onChange={e => setEditProf({ ...editProf, mail: e.target.value })} />
              <label htmlFor="nameBasic" className="form-label">Téléphone</label>
              <input type="text" className="form-control mb-2" value={editProf?.telephone || ''} onChange={e => setEditProf({ ...editProf, telephone: e.target.value })} />
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline-secondary" data-bs-dismiss="modal">Annuler</button>
              <button className="btn btn-primary d-flex align-items-center" onClick={handleUpdate} disabled={loadingUpdate}>
                Enregistrer
                {loadingUpdate && <span className="spinner-border spinner-border-sm ms-2" role="status" aria-hidden="true"></span>}
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* Modal Ajout */}
      <div className="modal fade" id="addModal" tabIndex="-1" aria-labelledby="addModalLabel" aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content p-3">
            <div className="modal-header">
              <h5 className="modal-title" id="addModalLabel">Ajouter un professeur</h5>
            </div>
            <div className="modal-body">
              <label htmlFor="nameBasic" className="form-label">Nom Prénom</label>
              <input type="text" className="form-control mb-2" placeholder="Entrer votre nom et prénom" value={newProf.nom_prenom} onChange={e => setNewProf({ ...newProf, nom_prenom: e.target.value })} required/>
              <label htmlFor="nameBasic" className="form-label">Adresse</label>
              <input type="text" className="form-control mb-2" placeholder="Entrer votre adresse" value={newProf.adresse} onChange={e => setNewProf({ ...newProf, adresse: e.target.value })} required/>
              <label htmlFor="nameBasic" className="form-label">Mail</label>
              <input type="email" className="form-control mb-2" placeholder="Entrer votre email" value={newProf.mail} onChange={e => setNewProf({ ...newProf, mail: e.target.value })} required/>
              <label htmlFor="nameBasic" className="form-label">Téléphone</label>
              <input type="text" className="form-control mb-2" placeholder="Entrer votre numéro de téléphone" value={newProf.telephone} onChange={e => setNewProf({ ...newProf, telephone: e.target.value })} required/>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline-secondary" data-bs-dismiss="modal">Annuler</button>
              <button className="btn btn-primary d-flex align-items-center" onClick={handleCreate} disabled={loadingCreate}>
                Ajouter
                {loadingCreate && <span className="spinner-border spinner-border-sm ms-2" role="status" aria-hidden="true"></span>}
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* Modal Suppression */}
      <div className="modal fade" id="deleteModal" tabIndex="-1" aria-labelledby="deleteModalLabel" aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="deleteModalLabel">Confirmer la suppression</h5>
              {/* <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button> */}
            </div>
            <div className="modal-body">
              <p>Voulez-vous vraiment supprimer ce professeur ?</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline-secondary" data-bs-dismiss="modal">Annuler</button>
              <button
                className="btn btn-danger d-flex align-items-center"
                onClick={() => handleDelete(confirmDeleteId)}
                disabled={loadingDeleteId === confirmDeleteId}
              >
                Supprimer
                {loadingDeleteId === confirmDeleteId && (
                  <span className="spinner-border spinner-border-sm ms-2" role="status" aria-hidden="true"></span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ListeProf;

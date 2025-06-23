import React, { useEffect, useState } from 'react';
import { useProf } from '../contexts/ProfContext';
import axios from 'axios';

const ListeProf = () => {
  const { profs, setProfs, loading } = useProf();
  const [searchTerm, setSearchTerm] = useState('');
  const [editProf, setEditProf] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [role, setRole] = useState(localStorage.getItem('role'));

  const filteredProfs = profs.filter(prof =>
    Object.values(prof).some(val =>
      typeof val === 'string' && val.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const handleUpdate = async () => {
    console.log('🔧 Prof à modifier :', editProf);
    try {
      await axios.put(`http://127.0.0.1:8000/api/enseignants/${editProf.id}`, editProf);
      const updated = profs.map(p => (p.id === editProf.id ? editProf : p));
      setProfs(updated);
      setEditProf(null);
    } catch (error) {
      console.error("❌ Erreur lors de la mise à jour :", error.response?.data || error.message);
    }
  };
  

  const handleDelete = async (id) => {
    try {
      await axios.delete(`http://127.0.0.1:8000/api/enseignants/${id}`);
      setProfs(profs.filter(p => p.id !== id));
      setConfirmDeleteId(null);
    } catch (error) {
      console.error("Erreur lors de la suppression :", error);
    }
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
        onChange={(e) => setSearchTerm(e.target.value)}
      />

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
              {filteredProfs.map(prof => (
                <tr key={prof.id}>
                  <td>{prof.nom_prenom}</td>
                  <td>{prof.adresse}</td>
                  <td>{prof.mail}</td>
                  <td>{prof.telephone}</td>
                  {role === 'admin' && (
                    <td>
                      <button className="btn btn-sm btn-primary me-2" onClick={() => setEditProf({ ...prof })}>Modifier</button>
                      <button className="btn btn-sm btn-danger" onClick={() => setConfirmDeleteId(prof.id)}>Supprimer</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Modifier */}
      {editProf && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content p-3">
              <div className="modal-header">
                <h5 className="modal-title">Modifier un professeur</h5>
              </div>
              <div className="modal-body">
                <input type="text" className="form-control mb-2" value={editProf.nom_prenom} onChange={e => setEditProf({ ...editProf, nom_prenom: e.target.value })} />
                <input type="text" className="form-control mb-2" value={editProf.adresse} onChange={e => setEditProf({ ...editProf, adresse: e.target.value })} />
                <input type="email" className="form-control mb-2" value={editProf.mail} onChange={e => setEditProf({ ...editProf, mail: e.target.value })} />
                <input type="text" className="form-control mb-2" value={editProf.telephone} onChange={e => setEditProf({ ...editProf, telephone: e.target.value })} />
              </div>
              <div className="modal-footer">
                <button className="btn btn-outline-secondary" onClick={() => setEditProf(null)}>Annuler</button>
                <button className="btn btn-primary" onClick={handleUpdate}>Enregistrer</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Suppression */}
      {confirmDeleteId !== null && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header"><h5 className="modal-title">Confirmer la suppression</h5></div>
              <div className="modal-body">
                <p>Voulez-vous vraiment supprimer ce professeur ?</p>
              </div>
              <div className="modal-footer">
                <button className="btn btn-outline-secondary" onClick={() => setConfirmDeleteId(null)}>Annuler</button>
                <button className="btn btn-danger" onClick={() => handleDelete(confirmDeleteId)}>Supprimer</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ListeProf;

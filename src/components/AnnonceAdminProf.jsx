import React, { useState, useEffect } from 'react';
import axios from 'axios';
// import { Editor } from '@tinymce/tinymce-react';
import { useProf } from '../contexts/ProfContext';
import { useAnnonce } from '../contexts/AnnonceContext';

const AnnonceAdminProf = () => {
  const [role, setRole] = useState(localStorage.getItem('role'));
  const { annonces, fetchAnnonces } = useAnnonce();
  const [newAnnonce, setNewAnnonce] = useState({
    titre: '',
    enseignant_id: '',
    description: '',
    fichier: null,
  });
  const [editAnnonce, setEditAnnonce] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [loadingUpdate, setLoadingUpdate] = useState(false);
  const [loadingDeleteId, setLoadingDeleteId] = useState(null);
  const { profs: enseignants, loading } = useProf();
  const [selectedAnnonce, setSelectedAnnonce] = useState(null);
  const openDetailModal = (annonce) => {
    setSelectedAnnonce(annonce);
    const modal = new window.bootstrap.Modal(document.getElementById('detailModal'));
    modal.show();
  };
  
  const handleCreate = async () => {
    setLoadingCreate(true);
    const formData = new FormData();
    formData.append('titre', newAnnonce.titre);
    formData.append('description', newAnnonce.description);
    if (newAnnonce.fichier) {
      formData.append('fichier', newAnnonce.fichier);
    }
  
    if (role === 'admin') {
      formData.append('expediteur', 'admin'); // ← clé ici
    } else {
      formData.append('enseignant_id', newAnnonce.enseignant_id);
    }
  
    try {
      await axios.post('http://127.0.0.1:8000/api/annonces', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setNewAnnonce({ titre: '', enseignant_id: '', description: '', fichier: null });
      fetchAnnonces();
      const modal = window.bootstrap.Modal.getInstance(document.getElementById('addModal'));
      modal.hide();
    } catch (error) {
      console.error("Erreur création:", error.response?.data || error);
    } finally {
      setLoadingCreate(false);
    }
  };
  

  const handleUpdate = async () => {
    setLoadingUpdate(true);
    const formData = new FormData();
    formData.append('titre', editAnnonce.titre);
    formData.append('description', editAnnonce.description);
    if (editAnnonce.fichier) {
      formData.append('fichier', editAnnonce.fichier);
    }
  
    if (role === 'admin') {
      formData.append('expediteur', 'admin'); // important pour Laravel
    } else {
      formData.append('enseignant_id', editAnnonce.enseignant_id);
    }
  
    try {
      await axios.post(`http://127.0.0.1:8000/api/annonces/${editAnnonce.id}?_method=PUT`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setEditAnnonce(null);
      fetchAnnonces();
      const modal = window.bootstrap.Modal.getInstance(document.getElementById('editModal'));
      modal.hide();
    } catch (err) {
      console.error("Erreur update:", err.response?.data || err);
    } finally {
      setLoadingUpdate(false);
    }
  };
  

  const handleDelete = async (id) => {
    setLoadingDeleteId(id);
    try {
      await axios.delete(`http://127.0.0.1:8000/api/annonces/${id}`);
      fetchAnnonces();
      const modal = window.bootstrap.Modal.getInstance(document.getElementById('deleteModal'));
      modal.hide();
    } catch (err) {
      console.error("Erreur suppression:", err);
    } finally {
      setLoadingDeleteId(null);
    }
  };

  const openEditModal = (annonce) => {
    setEditAnnonce({ ...annonce, fichier: null });
    const modal = new window.bootstrap.Modal(document.getElementById('editModal'));
    modal.show();
  };

  const openDeleteModal = (id) => {
    setConfirmDeleteId(id);
    const modal = new window.bootstrap.Modal(document.getElementById('deleteModal'));
    modal.show();
  };

  return (
    <div className="content-wrapper">
      <div className="container-xxl flex-grow-1 container-p-y">
        <h4 className="fw-bold py-3 mb-4">
          <span className="text-muted fw-light text-capitalize">{role} /</span> Annonce
        </h4>

        {(role === 'admin' || role === 'prof') && (
          <div className="mb-3">
            <button
              className="btn btn-primary"
              onClick={() => {
                setNewAnnonce({ titre: '', enseignant_id: '', description: '', fichier: null });
                const modal = new window.bootstrap.Modal(document.getElementById('addModal'));
                modal.show();
              }}
            >
              Nouveau
            </button>
          </div>
        )}

        <div className="card">
          <h5 className="card-header">Liste des annonces</h5>
          <div className="table-responsive text-nowrap">
            <table className="table table-hover">
              <thead>
                <tr>
                  <th>Titre</th>
                  <th>Expéditeur</th>
                  {/* <th>Description</th> */}
                  <th>Date de sortie</th>
                  {role === 'admin' && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {annonces.map(a => (
                <tr key={a.id} onClick={() => openDetailModal(a)} style={{ cursor: 'pointer' }}>
                  <td>{a.titre}</td>
                  <td>{a.expediteur}</td>
                  <td>
                    {a.created_at ? new Date(a.created_at).toLocaleString('fr-FR', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })
                      : 'Date inconnue'}
                  </td>
                  {role === 'admin' && (
                    <td>
                      <button
                        className="btn btn-sm btn-outline-primary me-2"
                        onClick={(e) => {
                          e.stopPropagation(); // 👈 empêche l'ouverture du modal de détail
                          openEditModal(a);
                        }}
                      >
                        <i className="bx bx-edit"></i>
                      </button>
                      <button
                        className="btn btn-sm btn-outline-primary"
                        onClick={(e) => {
                          e.stopPropagation(); // 👈 idem ici
                          openDeleteModal(a.id);
                        }}
                      >
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
                <input type="text" className="form-control mb-2" placeholder="Titre de l'annonce"
                  value={newAnnonce.titre} onChange={e => setNewAnnonce({ ...newAnnonce, titre: e.target.value })} required/>
                  {role === 'admin' ? (
                      <>
                        <label className="form-label">Expéditeur</label>
                        <input type="text" className="form-control mb-2" value="admin" disabled />
                      </>
                    ) : (
                      <>
                      <label className="form-label">Expéditeur</label>
                      <select className="form-control mb-2" value={newAnnonce.enseignant_id}
                        onChange={e => setNewAnnonce({ ...newAnnonce, enseignant_id: e.target.value })}>
                        <option value="">-- Sélectionner un professeur --</option>
                        {enseignants.map(e => (
                          <option key={e.id} value={e.id}>{e.nom_prenom}</option>
                        ))}
                      </select>
                    </>
                  )}
                <label className="form-label">Description</label>
                <textarea className="form-control mb-2 p-3" rows="5" placeholder="Description"
                  value={newAnnonce.description} onChange={e => setNewAnnonce({ ...newAnnonce, description: e.target.value })}>
                </textarea>
                {/* <Editor
                  apiKey="j521yvicgiyjbzlflhexg8vckgjnkfjgm5670wbkf8pcl8x7" // ou utilise ta clé TinyMCE gratuite si besoin
                  init={{
                    height: 300,
                    menubar: true,
                    plugins: [
                      'advlist autolink lists link image charmap preview anchor',
                      'searchreplace visualblocks code fullscreen',
                      'insertdatetime media table paste help wordcount'
                    ],
                    toolbar:
                      'undo redo | formatselect | bold italic backcolor | \
                      alignleft aligncenter alignright alignjustify | \
                      bullist numlist outdent indent | removeformat | help | link image',
                    file_picker_types: 'file image media',
                    file_picker_callback: (callback, value, meta) => {
                      const input = document.createElement('input');
                      input.setAttribute('type', 'file');
                      input.setAttribute('accept', meta.filetype === 'image' ? 'image/*' : '*');

                      input.onchange = async () => {
                        const file = input.files[0];
                        const reader = new FileReader();
                        reader.onload = () => {
                          callback(reader.result, { title: file.name });
                        };
                        reader.readAsDataURL(file); // 👈 transforme le fichier en base64
                      };
                      input.click();
                    }
                  }}
                  value={newAnnonce.description}
                  onEditorChange={(content) =>
                    setNewAnnonce({ ...newAnnonce, description: content })
                  }
                /> */}
                <label className="form-label">Import de fichier</label>                
                <input type="file" accept=".zip,.pdf,.doc,.docx" className="form-control"
                  onChange={e => setNewAnnonce({ ...newAnnonce, fichier: e.target.files[0] })} />
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
                <input type="text" className="form-control mb-2" value={editAnnonce?.titre || ''}
                  onChange={e => setEditAnnonce({ ...editAnnonce, titre: e.target.value })} />
                <label className="form-label">Expéditeur</label>                
                <select className="form-control mb-2" value={editAnnonce?.enseignant_id || ''}
                  onChange={e => setEditAnnonce({ ...editAnnonce, enseignant_id: e.target.value })}>
                  <option value="">-- Expéditeur --</option>
                  {enseignants.map(e => <option key={e.id} value={e.id}>{e.nom_prenom}</option>)}
                </select>
                <label className="form-label">Description</label>
                <textarea className="form-control mb-2 p-3" rows="5" value={editAnnonce?.description || ''}
                  onChange={e => setEditAnnonce({ ...editAnnonce, description: e.target.value })}></textarea>
                <label className="form-label">Import de fichier</label>
                <input type="file" accept=".zip,.pdf,.doc,.docx" className="form-control"
                  onChange={e => setEditAnnonce({ ...editAnnonce, fichier: e.target.files[0] })} />
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
              <div className="modal-body"><p>Supprimer cette annonce ?</p></div>
              <div className="modal-footer">
                <button className="btn btn-outline-secondary" data-bs-dismiss="modal">Annuler</button>
                <button className="btn btn-danger" onClick={() => handleDelete(confirmDeleteId)} disabled={loadingDeleteId === confirmDeleteId}>
                  Supprimer {loadingDeleteId === confirmDeleteId && <span className="spinner-border spinner-border-sm ms-2"></span>}
                </button>
              </div>
            </div>
          </div>
        </div>
        {/* Modal Détail Professionnel */}
        <div className="modal fade" id="detailModal" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content rounded-3 shadow-sm border-0">
              <div className="modal-header border-bottom-0 pb-0">
                <h4 className="modal-title w-100 text-center fw-semibold text-dark">
                  {selectedAnnonce?.titre}
                </h4>
                {/* <button type="button" className="btn-close" data-bs-dismiss="modal" /> */}
              </div>
              <div className="modal-body px-4 py-3">
                <p className="fst-italic text-muted mb-3 ">
                  <i className="bx bx-user"> {selectedAnnonce?.expediteur}</i>
                </p>

                <div className="mb-4">
                  <h6 className="fw-semibold mb-2 text-decoration-underline text-dark">Description</h6>
                  <p className="text-justify text-dark" style={{ whiteSpace: 'pre-line' }}>
                    {selectedAnnonce?.description || 'Aucune description fournie.'}
                  </p>
                </div>
                {selectedAnnonce?.fichier && (
                  <div className="mb-4">
                    <h6 className="fw-semibold mb-3 text-decoration-underline text-dark">Fichier joint</h6>
                    <a
                      href={selectedAnnonce.fichier}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-outline-dark"
                    >
                      <i className="bx bx-download me-1"></i> Télécharger
                    </a>
                  </div>
                )}

                <div className="text-end">
                  <small className="text-muted fst-italic">
                    Publié le :{' '}
                    {selectedAnnonce?.created_at
                      ? new Date(selectedAnnonce.created_at).toLocaleString('fr-FR', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })
                      : 'Date inconnue'}
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

export default AnnonceAdminProf;

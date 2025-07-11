import React, { useState } from 'react';
import { useMatiere } from '../contexts/MatiereContext';
import { useNiveau } from '../contexts/NiveauContext';
import { useSemestre } from '../contexts/SemestreContext';
import axios from 'axios';

const Matiere = () => {
  const { matieres, fetchMatieres } = useMatiere();
  const { niveaux } = useNiveau();
  const { semestres } = useSemestre();
  const [niveauFilter, setNiveauFilter] = useState('');
  const [semestreFilter, setSemestreFilter] = useState('');
  
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    matiere: '',
    heures: '',
    id_niveau: '',
    id_semestre: '',
    code_matiere: '',
    coefficient: ''
  });
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [loadingDeleteId, setLoadingDeleteId] = useState(null);
  const [alert, setAlert] = useState({ message: '', type: '' });

  const openModal = (id) => {
    const modal = new window.bootstrap.Modal(document.getElementById(id));
    modal.show();
  };

  const handleEdit = (matiere) => {
    setSelected(matiere);
    setForm({
      matiere: matiere.matiere,
      heures: matiere.heures,
      id_niveau: matiere.id_niveau,
      id_semestre: matiere.id_semestre,
      code_matiere: matiere.code_matiere,
      coefficient: matiere.coefficient
    });
    openModal('editModal');
  };

  const handleDelete = async () => {
    setLoadingDeleteId(deleteId);
    try {
      await axios.delete(`http://127.0.0.1:8000/api/matieres/${deleteId}`);
      fetchMatieres();
      setAlert({ message: 'Matière supprimée avec succès', type: 'success' });
      window.bootstrap.Modal.getInstance(document.getElementById('deleteModal')).hide();
    } catch (err) {
      console.error(err);
      setAlert({ message: 'Erreur lors de la suppression', type: 'danger' });
    } finally {
      setLoadingDeleteId(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoadingSubmit(true);
    try {
      if (selected) {
        await axios.put(`http://127.0.0.1:8000/api/matieres/${selected.id}`, form);
        setAlert({ message: 'Matière modifiée avec succès', type: 'success' });
      } else {
        await axios.post('http://127.0.0.1:8000/api/matieres', form);
        setAlert({ message: 'Matière ajoutée avec succès', type: 'success' });
      }
      fetchMatieres();
      const modalId = selected ? 'editModal' : 'addModal';
      window.bootstrap.Modal.getInstance(document.getElementById(modalId)).hide();
      setForm({ matiere: '', heures: '', id_niveau: '', id_semestre: '', code_matiere: '', coefficient: '' });
      setSelected(null);
    } catch (err) {
      console.error(err);
      setAlert({ message: 'Erreur lors de l\'enregistrement', type: 'danger' });
    } finally {
      setLoadingSubmit(false);
    }
  };

  const filtered = matieres
    .filter(m => m.matiere.toLowerCase().includes(search.toLowerCase()))
    .filter(m => !niveauFilter || m.id_niveau === parseInt(niveauFilter))
    .filter(m => !semestreFilter || m.id_semestre === parseInt(semestreFilter));


  return (
    <div className="container-xxl flex-grow-1 container-p-y">
      <h4 className="fw-bold py-3 mb-4">Gestion des matières</h4>

      {alert.message && (
        <div className={`alert alert-${alert.type} alert-dismissible`} role="alert">
          {alert.message}
          <button type="button" className="btn-close" data-bs-dismiss="alert"></button>
        </div>
      )}

      <input
        type="text"
        placeholder="Rechercher une matière..."
        className="form-control mb-3"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="mb-3">
        <button
          className="btn btn-primary"
          onClick={() => {
            setForm({ matiere: '', heures: '', id_niveau: '', id_semestre: '', code_matiere: '', coefficient: '' });
            setSelected(null);
            openModal('addModal');
          }}
        >
          Nouvelle Matière
        </button>
      </div>

      <div className="card">
        <h5 className="card-header">Liste des matières</h5>
        <div className="row px-3 py-2">
          <div className="col-md-6 mb-2">
            <select
              className="form-control"
              value={niveauFilter}
              onChange={(e) => setNiveauFilter(e.target.value)}
            >
              <option value="">-- Filtrer par niveau --</option>
              {niveaux.map(n => (
                <option key={n.id} value={n.id}>{n.niveau}</option>
              ))}
            </select>
          </div>
          <div className="col-md-6 mb-2">
            <select
              className="form-control"
              value={semestreFilter}
              onChange={(e) => setSemestreFilter(e.target.value)}
            >
              <option value="">-- Filtrer par semestre --</option>
              {semestres.map(s => (
                <option key={s.id} value={s.id}>{s.code_semestre}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="table-responsive text-nowrap">
          <table className="table">
            <thead>
              <tr>
                <th>Matière</th>
                {/* <th>Heures</th> */}
                <th>Code</th>
                <th>Coeff</th>
                <th>Niveau</th>
                <th>Semestre</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(m => (
                <tr key={m.id} onClick={() => { setDetail(m); openModal('detailModal'); }} style={{ cursor: 'pointer' }}>
                  <td>{m.matiere}</td>
                  {/* <td>{m.heures}</td> */}
                  <td>{m.code_matiere || '--'}</td>
                  <td>{m.coefficient || '--'}</td>
                  <td>{m.niveau?.niveau}</td>
                  <td>{m.semestre?.code_semestre || '--'}</td>
                  <td>
                    <button className="btn btn-sm btn-outline-primary me-2" onClick={(e) => { e.stopPropagation(); handleEdit(m); }}>
                      <i className="bx bx-edit"></i>
                    </button>
                    <button className="btn btn-sm btn-outline-danger" onClick={(e) => { e.stopPropagation(); setDeleteId(m.id); openModal('deleteModal'); }}>
                      <i className="bx bx-trash"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
{/* Modals */}
      {/* Add/Edit */}
      <div className="modal fade" id="addModal" tabIndex="-1">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content p-3">
            <div className="modal-header">
              <h5 className="modal-title">Ajouter une matière</h5>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <input className="form-control mb-2" value={form.matiere} onChange={e => setForm({ ...form, matiere: e.target.value })} placeholder="Matière" required />
                <input className="form-control mb-2" type="number" value={form.heures} onChange={e => setForm({ ...form, heures: e.target.value })} placeholder="Heures" required />
                <select className="form-control mb-2" value={form.id_niveau} onChange={e => setForm({ ...form, id_niveau: e.target.value })} required>
                  <option value="">Sélectionner un niveau</option>
                  {niveaux.map(n => <option key={n.id} value={n.id}>{n.niveau}</option>)}
                </select>
                <select className="form-control mb-2" value={form.id_semestre} onChange={e => setForm({ ...form, id_semestre: e.target.value })} required>
                  <option value="">Sélectionner une semeste</option>
                  {semestres.map(s => <option key={s.id} value={s.id}>{s.code_semestre}</option>)}
                </select>
                <input className="form-control mb-2" value={form.code_matiere} onChange={e => setForm({ ...form, code_matiere: e.target.value })} placeholder="Code matière (facultatif)" />
                <input className="form-control mb-2" type="number" value={form.coefficient} onChange={e => setForm({ ...form, coefficient: e.target.value })} placeholder="Coefficient (facultatif)" />
              </div>
              <div className="modal-footer">
                <button className="btn btn-outline-secondary" data-bs-dismiss="modal">Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={loadingSubmit}>
                  Enregistrer
                  {loadingSubmit && <span className="spinner-border spinner-border-sm ms-2" />}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Edit modal reuse same ID */}
      <div className="modal fade" id="editModal" tabIndex="-1">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content p-3">
            <div className="modal-header">
              <h5 className="modal-title">Modifier la matière</h5>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <input className="form-control mb-2" value={form.matiere} onChange={e => setForm({ ...form, matiere: e.target.value })} placeholder="Matière" required />
                <input className="form-control mb-2" type="number" value={form.heures} onChange={e => setForm({ ...form, heures: e.target.value })} placeholder="Heures" required />
                <select className="form-control mb-2" value={form.id_niveau} onChange={e => setForm({ ...form, id_niveau: e.target.value })} required>
                  <option value="">Sélectionner un niveau</option>
                  {niveaux.map(n => <option key={n.id} value={n.id}>{n.niveau}</option>)}
                </select>
                <select className="form-control mb-2" value={form.id_semestre} onChange={e => setForm({ ...form, id_semestre: e.target.value })} required>
                  <option value="">Sélectionner un niveau</option>
                  {semestres.map(s => <option key={s.id} value={s.id}>{s.code_semestre}</option>)}
                </select>
                <input className="form-control mb-2" value={form.code_matiere} onChange={e => setForm({ ...form, code_matiere: e.target.value })} placeholder="Code matière" />
                <input className="form-control mb-2" type="number" value={form.coefficient} onChange={e => setForm({ ...form, coefficient: e.target.value })} placeholder="Coefficient" />
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

      {/* Detail modal */}
      <div className="modal fade" id="detailModal" tabIndex="-1">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content p-3">
            <div className="modal-header">
              <h5 className="modal-title">Détail de la matière</h5>
            </div>
            <div className="modal-body">
              {detail ? (
                <>
                  <p><strong>Matière :</strong> {detail.matiere}</p>
                  <p><strong>Heures :</strong> {detail.heures}</p>
                  <p><strong>Niveau :</strong> {detail.niveau?.niveau}</p>
                  <p><strong>Code :</strong> {detail.code_matiere || '--'}</p>
                  <p><strong>Coefficient :</strong> {detail.coefficient || '--'}</p>
                </>
              ) : <p>Aucune information</p>}
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline-secondary" data-bs-dismiss="modal">Fermer</button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete confirmation */}
      <div className="modal fade" id="deleteModal" tabIndex="-1">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Confirmer la suppression</h5>
            </div>
            <div className="modal-body">
              <p>Voulez-vous vraiment supprimer cette matière ?</p>
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

export default Matiere;
import React, { useState, useEffect} from 'react';
import { useMatiere } from '../contexts/MatiereContext';
import { useNiveau } from '../contexts/NiveauContext';
import { useSemestre } from '../contexts/SemestreContext';
import axios from 'axios';
import SearchBar from './SearchBar';
import DataTable from './DataTable';
import AddModal from './AddModal';
import EditModal from './EditModal';
import DeleteModal from './DeleteModal';
import DetailModal from './DetailModal';
import Pagination from './Pagination';

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
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 10;
  
  useEffect(() => {
    setCurrentPage(0);
  }, [search, niveauFilter, semestreFilter]);
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
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice(
      currentPage * itemsPerPage,
      (currentPage + 1) * itemsPerPage
  );
  const matiereFields = [
    { name: 'matiere', label: 'Matière', required: true },
    { name: 'heures', label: 'Heures', type: 'number', required: true },
    {
      name: 'id_niveau',
      label: 'Niveau',
      type: 'select',
      options: niveaux.map(n => ({ value: n.id, label: n.niveau })),
      required: true
    },
    {
      name: 'id_semestre',
      label: 'Semestre',
      type: 'select',
      options: semestres.map(s => ({ value: s.id, label: s.code_semestre })),
      required: true
    },
    { name: 'code_matiere', label: 'Code matière' },
    { name: 'coefficient', label: 'Coefficient', type: 'number' },
  ];

  const tableHeaders = [
    { label: 'Matière', field: 'matiere' },
    { label: 'Code', field: 'code_matiere' },
    { label: 'Coeff', field: 'coefficient' },
    { label: 'Niveau', field: 'niveau.niveau' },
    { label: 'Semestre', field: 'semestre.code_semestre' }
  ]
  
  return (
    <div className="container-xxl flex-grow-1 container-p-y">
      <h4 className="fw-bold py-3 mb-4">Gestion des matières</h4>

      {alert.message && (
        <div className={`alert alert-${alert.type} alert-dismissible`} role="alert">
          {alert.message}
          <button type="button" className="btn-close" data-bs-dismiss="alert"></button>
        </div>
      )}

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
        <div className="card-body pb-0">
          <SearchBar 
          searchTerm={search} 
          onSearchChange={setSearch} 
          placeholder="Rechercher une matière..."
        />
        </div>
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
        <DataTable
          headers={tableHeaders}
          data={paginated}
          role="admin"
          onRowClick={(matiere) => {
            setDetail(matiere);
            openModal('detailModal');
          }}
          onEdit={(matiere) => {
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
          }}
          onDelete={(id) => {
            setDeleteId(id);
            openModal('deleteModal');
          }}
          renderCell={(item, field) => {
            const value = field.split('.').reduce((acc, part) => acc?.[part], item);
            return value || '--';
          }}
        />
      <Pagination 
        currentPage={currentPage} 
        totalPages={totalPages} 
        onPageChange={setCurrentPage} 
      />
      </div>
      <AddModal
        modalId="addModal"
        title="Ajouter une matière"
        fields={matiereFields}
        formData={form}
        onFormChange={(name, value) => setForm({ ...form, [name]: value })}
        onSubmit={handleSubmit}
        loading={loadingSubmit}
      />

      <EditModal
        modalId="editModal"
        title="Modifier la matière"
        fields={matiereFields}
        formData={form}
        onFormChange={(name, value) => setForm({ ...form, [name]: value })}
        onSubmit={handleSubmit}
        loading={loadingSubmit}
      />

      <DetailModal
        modalId="detailModal"
        title="Détail de la matière"
        data={detail}
        fields={[
          { name: 'matiere', label: 'Matière' },
          { name: 'heures', label: 'Heures' },
          { name: 'code_matiere', label: 'Code' },
          { name: 'coefficient', label: 'Coefficient' },
          { name: 'niveau.niveau', label: 'Niveau' },
          { name: 'semestre.code_semestre', label: 'Semestre' }
        ]}
        customRender={(data) => (
          <>
            <p><strong>Matière :</strong> {data?.matiere}</p>
            <p><strong>Heures :</strong> {data?.heures}</p>
            <p><strong>Code :</strong> {data?.code_matiere || '--'}</p>
            <p><strong>Coefficient :</strong> {data?.coefficient || '--'}</p>
            <p><strong>Niveau :</strong> {data?.niveau?.niveau}</p>
            <p><strong>Semestre :</strong> {data?.semestre?.code_semestre}</p>
          </>
        )}
      />

      <DeleteModal
        modalId="deleteModal"
        message="Voulez-vous vraiment supprimer cette matière ?"
        onConfirm={handleDelete}
        loading={loadingDeleteId}
      />

  </div>
  );
};

export default Matiere;
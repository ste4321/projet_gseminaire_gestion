import React, { useMemo, useState } from 'react';
import { useProf } from '../contexts/ProfContext';
import api, { errorMessage } from '../api/client';
import { useFeedback } from '../contexts/FeedbackContext';
import { ouvrirEspace } from '../auth/consultation';

// Import des composants modulaires
import SearchBar from './SearchBar';
import AddModal from './AddModal';
import EditModal from './EditModal';
import DataTable from './DataTable';
import Pagination from './Pagination';
import FicheEnseignant from './FicheEnseignant';
import MotDePasseProvisoire from './MotDePasseProvisoire';
import BoutonCopier from './BoutonCopier';
import { plusRecentsDabord } from '../utils/tri';
import { ROLE_LABELS } from '../navigation';

const FORMULAIRE_VIDE = { nom_prenom: '', adresse: '', email: '', telephone: '' };

// Recherche sans tenir compte des majuscules ni des accents, sur les champs visibles seulement
// (pas sur les dates ou identifiants : « 2026 » ne doit pas trouver tout le monde)
const normaliser = (texte) => String(texte ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const CHAMPS_RECHERCHE = ['nom_prenom', 'email', 'telephone', 'adresse'];

const modal = (id) => window.bootstrap.Modal.getOrCreateInstance(document.getElementById(id));

const ListeProf = () => {
  const { notify, confirm } = useFeedback();
  const { profs, setProfs, loading } = useProf();
  const role = localStorage.getItem('role');
  const admin = role === 'admin';

  const [searchTerm, setSearchTerm] = useState('');
  const [editProf, setEditProf] = useState(null);
  const [detailProf, setDetailProf] = useState(null);
  const [newProf, setNewProf] = useState(FORMULAIRE_VIDE);
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [loadingUpdate, setLoadingUpdate] = useState(false);
  const [identifiants, setIdentifiants] = useState(null); // mot de passe provisoire à afficher une fois
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 10;

  // Seul le nom est obligatoire (comme côté serveur) ; sans email, un identifiant de connexion est généré
  const profFields = [
    { name: 'nom_prenom', label: 'Nom et prénom', type: 'text', placeholder: 'ex. Père Jean Rakoto', required: true },
    { name: 'email', label: 'Email', type: 'email', placeholder: 'ex. jean.rakoto@exemple.mg', optional: true,
      help: "Sert d'identifiant de connexion. Sans email, un identifiant est généré et affiché après l'ajout." },
    { name: 'telephone', label: 'Téléphone', type: 'text', placeholder: 'ex. 034 12 345 67', optional: true },
    { name: 'adresse', label: 'Adresse', type: 'text', placeholder: 'ex. Ambatoroka, Antananarivo', optional: true },
  ];

  const tableHeaders = [
    { label: 'Nom', field: 'nom_prenom' },
    { label: 'Email', field: 'email' },
    { label: 'Téléphone', field: 'telephone' },
  ];

  // Filtrage et pagination
  const terme = normaliser(searchTerm);
  const filteredProfs = useMemo(
    () => plusRecentsDabord(profs).filter((p) => !terme || CHAMPS_RECHERCHE.some((c) => normaliser(p[c]).includes(terme))),
    [profs, terme]
  );
  const totalPages = Math.ceil(filteredProfs.length / itemsPerPage);
  const currentProfs = filteredProfs.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage);

  const handleSearchChange = (value) => {
    setSearchTerm(value);
    setCurrentPage(0);
  };

  const handleCreate = async () => {
    setLoadingCreate(true);
    try {
      const response = await api.post('/enseignants', newProf);
      setProfs([...profs, response.data.enseignant]);
      setNewProf(FORMULAIRE_VIDE);
      modal('addModal').hide();
      // Identifiant (email ou identifiant généré) et mot de passe provisoire : affichés une seule fois
      setIdentifiants({
        nom: response.data.enseignant?.nom_prenom,
        email: response.data.user?.email,
        mot_de_passe: response.data.mot_de_passe,
      });
    } catch (error) {
      notify.error(errorMessage(error, "Erreur lors de l'ajout de l'enseignant."));
    } finally {
      setLoadingCreate(false);
    }
  };

  const handleUpdate = async () => {
    setLoadingUpdate(true);
    try {
      await api.put(`/enseignants/${editProf.id}`, editProf);
      setProfs(profs.map((prof) => (prof.id === editProf.id ? { ...prof, ...editProf } : prof)));
      modal('editModal').hide();
      setEditProf(null);
      notify.success('Enseignant modifié.');
    } catch (error) {
      notify.error(errorMessage(error, "Erreur lors de la modification de l'enseignant."));
    } finally {
      setLoadingUpdate(false);
    }
  };

  // Confirmation qui nomme l'enseignant et dit ce qui disparaît avec lui
  const handleDelete = async (id) => {
    const prof = profs.find((p) => p.id === id);
    const ok = await confirm({
      title: `Supprimer ${prof?.nom_prenom ?? 'cet enseignant'} ?`,
      message: prof?.id_user_cession
        ? 'Sa fiche et son compte de connexion seront supprimés. Cette action est définitive.'
        : 'Sa fiche sera supprimée. Cette action est définitive.',
      confirmLabel: 'Supprimer',
      danger: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/enseignants/${id}`);
      setProfs(profs.filter((p) => p.id !== id));
      notify.success(prof?.id_user_cession ? 'Enseignant et compte associé supprimés.' : 'Enseignant supprimé.');
    } catch (error) {
      notify.error(errorMessage(error, "Erreur lors de la suppression de l'enseignant."));
    }
  };

  const openAddModal = () => {
    setNewProf(FORMULAIRE_VIDE);
    modal('addModal').show();
  };

  const openEditModal = (prof) => {
    setEditProf({ ...prof });
    modal('editModal').show();
  };

  const openDetailModal = (prof) => {
    setDetailProf(prof);
    modal('detailModal').show();
  };

  // Action lancée depuis la fiche : la fiche se ferme d'abord, pour ne pas empiler deux fenêtres
  const depuisFiche = (action) => {
    const el = document.getElementById('detailModal');
    el.addEventListener('hidden.bs.modal', () => action(), { once: true });
    modal('detailModal').hide();
  };

  return (
    <div className="container-xxl flex-grow-1 container-p-y">
      <h4 className="fw-bold py-3 mb-4">
        <span className="text-muted fw-light">{ROLE_LABELS[role]} /</span> Enseignants
      </h4>
      {loading && <span className="visually-hidden" role="status">Chargement des enseignants…</span>}

      <div className="card">
        <h5 className="card-header">
          Liste des enseignants
          {loading ? (
            <span className="gstf-squelette d-inline-block align-middle ms-2" style={{ width: '7rem', height: '1rem' }} aria-hidden="true" />
          ) : (
            <small className="text-muted fw-normal ms-2">
              · {terme ? `${filteredProfs.length} sur ${profs.length}` : profs.length} enseignant{profs.length > 1 ? 's' : ''}
            </small>
          )}
        </h5>

        {admin && (
          <div className="mb-3 ms-4">
            <button className="btn btn-primary" onClick={openAddModal} disabled={loading}>
              <i className="bx bx-plus me-1"></i>Nouvel enseignant
            </button>
          </div>
        )}

        <div className="card-body pb-0">
          <SearchBar
            searchTerm={searchTerm}
            onSearchChange={handleSearchChange}
            placeholder="Rechercher par nom, email, téléphone…"
          />
        </div>

        <DataTable
          headers={tableHeaders}
          data={currentProfs}
          onRowClick={openDetailModal}
          onEdit={openEditModal}
          onDelete={handleDelete}
          role={role}
          loading={loading}
          skeletonRows={6}
          renderCell={(prof, field) => {
            const value = prof[field];
            if (field === 'nom_prenom') return <span className="fw-semibold">{value}</span>;
            if (field === 'email') {
              if (!value) return <span className="text-muted">—</span>;
              return (
                <span className="d-inline-flex align-items-center gap-1">
                  {/* Administration : ouvre l'espace de l'enseignant en lecture seule, sans ouvrir la fiche */}
                  {admin && prof.id_user_cession ? (
                    <button type="button" className="btn btn-link p-0 gstf-lien-espace"
                      title={`Ouvrir l'espace de ${prof.nom_prenom}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        ouvrirEspace({ userId: prof.id_user_cession, nom: prof.nom_prenom, role: 'prof', confirm, notify });
                      }}>
                      {value}
                    </button>
                  ) : value}
                  <BoutonCopier texte={value} libelle={`Copier l'email de ${prof.nom_prenom}`} />
                </span>
              );
            }
            return value || <span className="text-muted">—</span>;
          }}
        />

        {!loading && filteredProfs.length === 0 && (
          <div className="gstf-empty">
            {terme ? (
              <>
                <i className="bx bx-search-alt d-block"></i>
                Aucun enseignant ne correspond à « {searchTerm.trim()} ».
                <div className="mt-3">
                  <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => handleSearchChange('')}>Effacer la recherche</button>
                </div>
              </>
            ) : (
              <>
                <i className="bx bx-user-voice d-block"></i>
                Aucun enseignant n'est encore enregistré.
                {admin && (
                  <div className="mt-3">
                    <button type="button" className="btn btn-sm btn-primary" onClick={openAddModal}>Ajouter un enseignant</button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
      </div>

      {/* Modales */}
      <AddModal
        modalId="addModal"
        title="Nouvel enseignant"
        fields={profFields}
        formData={newProf}
        onFormChange={(field, value) => setNewProf((prev) => ({ ...prev, [field]: value }))}
        onSubmit={handleCreate}
        loading={loadingCreate}
        buttonText="Ajouter"
      />

      <EditModal
        modalId="editModal"
        title="Modifier l'enseignant"
        fields={profFields}
        formData={editProf || {}}
        onFormChange={(field, value) => setEditProf((prev) => ({ ...prev, [field]: value }))}
        onSubmit={handleUpdate}
        loading={loadingUpdate}
        buttonText="Enregistrer"
      />

      <FicheEnseignant
        modalId="detailModal"
        enseignant={detailProf}
        role={role}
        onModifier={() => depuisFiche(() => openEditModal(detailProf))}
        onSupprimer={() => depuisFiche(() => handleDelete(detailProf.id))}
        onOuvrirEspace={() => depuisFiche(() =>
          ouvrirEspace({ userId: detailProf.id_user_cession, nom: detailProf.nom_prenom, role: 'prof', confirm, notify }))}
      />
      <MotDePasseProvisoire identifiants={identifiants} onClose={() => setIdentifiants(null)} />
    </div>
  );
};

export default ListeProf;

import React, { useEffect, useState } from 'react';
import { useEtudiant } from '../contexts/EtudiantContext';
import api, { errorMessage as messageErreur } from '../api/client';
import { useFeedback } from '../contexts/FeedbackContext';
import { ouvrirEspace } from '../auth/consultation';
import { useEtudiantParcours } from '../contexts/EtudiantParcoursContext';

// Import des composants modulaires
import SearchBar from './SearchBar';
import AddModal from './AddModal';
import EditModal from './EditModal';
import DeleteModal from './DeleteModal';
import DataTable from './DataTable';
import Pagination from './Pagination';
import DetailModal from './DetailModal';
import ImportModal from './ImportModal';
import MotDePasseProvisoire from './MotDePasseProvisoire';
import { telechargerIdentifiants } from '../utils/identifiants';

const ListeEtudiant = () => {
  const { notify, confirm } = useFeedback();
  const { etudiantParcours, refetchParcours, loading: loadingParcours } = useEtudiantParcours();
  const { etudiants, setEtudiants } = useEtudiant();
  // Squelette seulement au premier chargement : les rechargements (ajout, import) gardent le tableau affiché
  const chargement = loadingParcours && etudiantParcours.length === 0;

  // États pour les filtres
  const [selectedAnnee, setSelectedAnnee] = useState('');
  const [niveau, setNiveau] = useState(1); // Par défaut L1
  const [searchTerm, setSearchTerm] = useState('');

  // États pour les modales
  const [editEtudiant, setEditEtudiant] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [detailEtudiant, setDetailEtudiant] = useState(null);
  const [newEtudiant, setNewEtudiant] = useState({
    nom_prenom: '',
    diocese: '',
    email: '',
    telephone: '',
    matricule: '',
    niveau: ''
  });

  // États pour les loadings
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [loadingUpdate, setLoadingUpdate] = useState(false);
  const [loadingDeleteId, setLoadingDeleteId] = useState(null);
  const [loadingImport, setLoadingImport] = useState(false);
  const [identifiants, setIdentifiants] = useState(null); // mot de passe provisoire à afficher une fois

  // État pour la pagination
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 10;

  // État pour le rôle
  const [role, setRole] = useState(localStorage.getItem('role'));

  // Effet pour initialiser les valeurs par défaut
  useEffect(() => {
    if (etudiantParcours.length > 0) {
      // Trouver l'année académique actuelle (la plus récente)
      const anneeIds = etudiantParcours
        .map(p => p.annee_academique?.id)
        .filter(Boolean);

      if (anneeIds.length > 0) {
        const maxAnneeId = Math.max(...anneeIds);
        setSelectedAnnee(String(maxAnneeId));
      }
    }
  }, [etudiantParcours]);

  // Obtenir les années académiques uniques
  const annees = etudiantParcours
    .map(p => p.annee_academique)
    .filter((annee, index, self) =>
      annee && self.findIndex(a => a?.id === annee.id) === index
    )
    .sort((a, b) => b.id - a.id); // Trier par ID décroissant (plus récent en premier)

  // Filtrage des étudiants basé sur l'année et le niveau
  const filteredParcours = etudiantParcours.filter(p => {
    const matchAnnee = !selectedAnnee || p.annee_academique?.id == selectedAnnee;
    const matchNiveau = p.niveau?.niveau === `L${niveau}`;
    return matchAnnee && matchNiveau;
  });

  const filteredEtudiants = filteredParcours
    .map(parcours => {
      const etu = parcours.etudiant;
      return {
        id: etu?.id,
        nom_prenom: etu?.nom_prenom,
        matricule: etu?.matricule,
        id_user_cession: etu?.id_user_cession,
        email: etu?.email,
        telephone: etu?.telephone,
        diocese: etu?.diocese,
        niveau: parcours?.niveau?.niveau,
        original: parcours
      };
    })
    .filter(etudiant =>
      Object.values(etudiant).some(val =>
        typeof val === 'string' && val.toLowerCase().includes(searchTerm.toLowerCase())
      )
    );

  const totalPages = Math.ceil(filteredEtudiants.length / itemsPerPage);
  const currentEtudiants = filteredEtudiants.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage
  );

  // Configuration des champs pour les modales
  const etudiantFields = [
    { name: 'nom_prenom', label: 'Nom Prénom', type: 'text', placeholder: 'Entrer le nom et prénom', required: true },
    { name: 'matricule', label: 'Matricule', type: 'text', placeholder: 'Entrer le numéro d\'étudiant', required: true },
    { name: 'email', label: 'Email', type: 'email', placeholder: 'Entrer l\'email', required: true },
    { name: 'telephone', label: 'Téléphone', type: 'text', placeholder: 'Entrer le numéro de téléphone', required: true },
    { name: 'diocese', label: 'Diocese', type: 'text', placeholder: 'Entrer le nom de la diocese ', required: true },
    { name: 'niveau', label: 'Niveau', type: 'select', placeholder: 'Sélectionner le niveau', required: true, options: [
      { value: 'L1', label: 'Licence 1' },
      { value: 'L2', label: 'Licence 2' },
      { value: 'L3', label: 'Licence 3' },
      { value: 'M1', label: 'Master 1' },
      { value: 'M2', label: 'Master 2' }
    ]}
  ];

  // Configuration des en-têtes du tableau
  const tableHeaders = [
    { label: 'Nom', field: 'nom_prenom' },
    { label: 'Matricule', field: 'matricule' },
    { label: 'Email', field: 'email' },
    { label: 'Niveau', field: 'niveau' }
  ];

  // Handlers
  const handleSearchChange = (value) => {
    setSearchTerm(value);
    setCurrentPage(0);
  };

  const handleNiveauChange = (newNiveau) => {
    setNiveau(newNiveau);
    setCurrentPage(0);
  };

  const handleAnneeChange = (newAnnee) => {
    setSelectedAnnee(newAnnee);
    setCurrentPage(0);
  };

  const handleFormChange = (field, value, isEdit = false) => {
    if (isEdit) {
      setEditEtudiant(prev => ({ ...prev, [field]: value }));
    } else {
      setNewEtudiant(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleCreate = async () => {
    setLoadingCreate(true);
    try {
      const response = await api.post(`/etudiants`, newEtudiant);
      setIdentifiants({
        nom: response.data.etudiant?.nom_prenom,
        email: response.data.user?.email,
        mot_de_passe: response.data.mot_de_passe,
      });

      // Fermer la modal
      const modal = window.bootstrap.Modal.getInstance(document.getElementById('addModal'));
      modal.hide();

      // Réinitialiser le formulaire
      setNewEtudiant({
        nom_prenom: '',
        diocese: '',
        email: '',
        telephone: '',
        matricule: '',
        niveau: ''
      });

      // 🔹 Recharger les données du contexte
      await refetchParcours();

      console.log("Étudiant ajouté avec succès et données rechargées");

    } catch (error) {
      if ([409, 422].includes(error.response?.status)) {
        notify.error(error.response.data.message); // matricule ou email déjà existant, champ invalide
      } else {
        notify.error(messageErreur(error, "Erreur lors de l'ajout de l'étudiant."));
      }
    }
     finally {
      setLoadingCreate(false);
    }
  };


  const handleUpdate = async () => {
    setLoadingUpdate(true);
    try {
      await api.put(
        `/etudiants/${editEtudiant.id}`,
        editEtudiant
      );

      // Fermer la modal
      const modal = window.bootstrap.Modal.getInstance(document.getElementById('editModal'));
      if (modal) modal.hide();
      setEditEtudiant(null);

      // 🔹 Recharger les données du contexte
      await refetchParcours();

      notify.success('Étudiant modifié.');
    } catch (error) {
      notify.error(messageErreur(error, "Erreur lors de la modification de l'étudiant."));
    } finally {
      setLoadingUpdate(false);
    }
  };

  const handleDelete = async () => {
    setLoadingDeleteId(confirmDeleteId);
    try {
      await api.delete(`/etudiants/${confirmDeleteId}`);

      // Fermer la modal
      const modal = window.bootstrap.Modal.getInstance(document.getElementById('deleteModal'));
      if (modal) modal.hide();

      // 🔹 Recharger les données du contexte
      await refetchParcours();

      notify.success('Étudiant et compte associé supprimés.');
    } catch (error) {
      notify.error(messageErreur(error, "Erreur lors de la suppression de l'étudiant."));
    } finally {
      setLoadingDeleteId(null);
    }
  };

  // Fonction handleImport améliorée pour ListeEtudiant.jsx
  const handleImport = async (file) => {
    setLoadingImport(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post(
        '/etudiants/import',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          },
          timeout: 300000,
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            console.log(`Upload: ${percentCompleted}%`);
          }
        }
      );


      // Résumé de l'import
      const erreurs = response.data.errors || [];
      let message = `${response.data.processed_rows} étudiant(s) sur ${response.data.total_rows} importé(s).`;
      if (erreurs.length > 0) {
        message += `\n${erreurs.length} ligne(s) à vérifier :\n` + erreurs.slice(0, 5).join('\n');
        if (erreurs.length > 5) message += `\n… et ${erreurs.length - 5} autre(s)`;
      }

      // Identifiants provisoires des nouveaux comptes : fichier Excel téléchargé chez l'admin uniquement
      const comptes = response.data.comptes || [];
      if (comptes.length > 0) {
        telechargerIdentifiants(comptes, `identifiants_${file.name.replace(/\.(xlsx|xls|csv)$/i, '')}.xlsx`);
        notify.info(
          `${comptes.length} compte(s) créé(s) : le fichier des mots de passe provisoires a été téléchargé.\n` +
          'Il ne pourra pas être régénéré : conservez-le en lieu sûr et supprimez-le après distribution.',
          { title: 'Identifiants provisoires', duration: 20000 }
        );
      }

      if (erreurs.length > 0) {
        notify.warning(message, { title: 'Import partiel', duration: 15000 });
      } else {
        notify.success(message, { title: 'Import terminé' });
      }

      // Fermer la modal
      const modal = window.bootstrap.Modal.getInstance(document.getElementById('importModal'));
      if (modal) modal.hide();

      // 🔹 Recharger les données du contexte
      await refetchParcours();

      console.log("Import terminé et données rechargées");

    } catch (error) {
      console.error("Erreur lors de l'import :", error.response?.data, error);

      let errorMessage = "Erreur lors de l'import du fichier";

      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = "L'import prend trop de temps. Essayez avec un fichier plus petit.";
      } else if (error.message === 'Network Error') {
        errorMessage = "Serveur injoignable. Vérifiez votre connexion internet.";
      }

      notify.error(errorMessage, { title: 'Import impossible' });
    } finally {
      setLoadingImport(false);
    }
  };

  // Fonctions pour les modales
  const openAddModal = () => {
    setNewEtudiant({
      nom_prenom: '',
      diocese: '',
      email: '',
      telephone: '',
      matricule: '',
      niveau: ''
    });
    const modal = new window.bootstrap.Modal(document.getElementById('addModal'));
    modal.show();
  };

  const openEditModal = (etudiant) => {
    setEditEtudiant({ ...etudiant });
    const modal = new window.bootstrap.Modal(document.getElementById('editModal'));
    modal.show();
  };

  const openDeleteModal = (id) => {
    setConfirmDeleteId(id);
    const modal = new window.bootstrap.Modal(document.getElementById('deleteModal'));
    modal.show();
  };

  const openDetailModal = (etudiant) => {
    setDetailEtudiant(etudiant);
    const modal = new window.bootstrap.Modal(document.getElementById('detailModal'));
    modal.show();
  };

  const openImportModal = () => {
    const modal = new window.bootstrap.Modal(document.getElementById('importModal'));
    modal.show();
  };

  return (
    <div className="container-xxl flex-grow-1 container-p-y">
      <h4 className="fw-bold py-3 mb-4">
        <span className="text-muted fw-light text-capitalize">{role} /</span> Étudiants
      </h4>
      {chargement && <span className="visually-hidden" role="status">Chargement des étudiants…</span>}

      {/* 🔹 Filtre année académique */}
      <div className="mb-3">
        <label className="form-label">Année académique:</label>
        {chargement ? (
          <span className="gstf-squelette d-inline-block align-middle ms-2" style={{ width: '9rem', height: '2.4rem' }} />
        ) : (
          <select
            className="form-select w-auto d-inline ms-2"
            value={selectedAnnee || ''}
            onChange={e => handleAnneeChange(e.target.value)}
          >
            {annees.map(a => (
              <option key={a.id} value={a.id}>{a.annee_aca}</option>
            ))}
          </select>
        )}
      </div>

      {/* 🔹 Sélecteur de niveau (L1–L3) */}
      <ul className="nav nav-pills mb-3">
        {[1, 2, 3].map(i => (
          <li className="nav-item" key={i}>
            <button
              className={`nav-link ${niveau === i ? 'active' : ''}`}
              onClick={() => handleNiveauChange(i)}
            >
              L{i}
            </button>
          </li>
        ))}
      </ul>

      <div className="card">
        <h5 className="card-header">
          Liste des étudiants en L{niveau}
          {selectedAnnee && annees.find(a => a.id == selectedAnnee) && (
            <span className="text-muted ms-2">
              - {annees.find(a => a.id == selectedAnnee)?.annee_aca}
            </span>
          )}
        </h5>
        {role === 'admin' && (
        <div className="mb-3 ms-4">
          <button className="btn btn-primary me-2" onClick={openAddModal}>
            Nouveau
          </button>
          <button className="btn btn-outline-primary" onClick={openImportModal}>
            <i className="bx bx-import me-1"></i>
            Importer un fichier Excel
          </button>
        </div>
      )}
        {/* Barre de recherche dans la carte */}
        <div className="card-body pb-0">
          <SearchBar
            searchTerm={searchTerm}
            onSearchChange={handleSearchChange}
            placeholder="Rechercher un étudiant..."
          />
        </div>

        <DataTable
          headers={tableHeaders}
          data={currentEtudiants}
          onRowClick={openDetailModal}
          onEdit={openEditModal}
          onDelete={openDeleteModal}
          role={role}
          loading={chargement}
          renderCell={(etudiant, field) => {
            const value = etudiant[field];
            // Matricule : ouvre l'espace de l'étudiant (lecture seule), sans déclencher le clic sur la ligne
            if (field === 'matricule' && value && role === 'admin') {
              return (
                <button type="button" className="btn btn-link p-0 gstf-lien-espace"
                  title={`Ouvrir l'espace de ${etudiant.nom_prenom}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    ouvrirEspace({ userId: etudiant.id_user_cession, nom: etudiant.nom_prenom, role: 'etudiant', confirm, notify });
                  }}>
                  {value}<i className="bx bx-log-in-circle ms-1" aria-hidden="true"></i>
                </button>
              );
            }
            return value ? value : '--';
          }}
        />

        {!chargement && currentEtudiants.length === 0 && (
          <div className="text-center py-4 text-warning">
            Aucun étudiant trouvé pour L{niveau}
            {selectedAnnee && annees.find(a => a.id == selectedAnnee) && (
              <span> en {annees.find(a => a.id == selectedAnnee)?.annee_aca}</span>
            )}
          </div>
        )}

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Modales */}
      <AddModal
        modalId="addModal"
        title="Ajouter un étudiant"
        fields={etudiantFields}
        formData={newEtudiant}
        onFormChange={(field, value) => handleFormChange(field, value, false)}
        onSubmit={handleCreate}
        loading={loadingCreate}
        buttonText="Ajouter"
      />

      <EditModal
        modalId="editModal"
        title="Modifier un étudiant"
        fields={etudiantFields}
        formData={editEtudiant || {}}
        onFormChange={(field, value) => handleFormChange(field, value, true)}
        onSubmit={handleUpdate}
        loading={loadingUpdate}
        buttonText="Enregistrer"
      />

      <DeleteModal
        modalId="deleteModal"
        title="Confirmer la suppression"
        message="Voulez-vous vraiment supprimer cet étudiant ?"
        onConfirm={handleDelete}
        loading={loadingDeleteId === confirmDeleteId}
      />

      <DetailModal
        modalId="detailModal"
        title={detailEtudiant?.nom_prenom || 'Détail de l\'étudiant'}
        data={detailEtudiant}
        fields={etudiantFields}
        customRender={(data) => (
          <div className="row">
            {/* <div className="mb-3">
              <strong>Nom Prénom:</strong> {data?.nom_prenom || '--'}
            </div> */}
            <div className="mb-3">
              <strong>Matricule:</strong> {data?.matricule || '--'}
            </div>
            <div className="mb-3">
              <strong>Email:</strong> {data?.email || '--'}
            </div>
            <div className="mb-3">
              <strong>Téléphone:</strong> {data?.telephone || '--'}
            </div>
            <div className="mb-3">
              <strong>Diocese:</strong> {data?.diocese || '--'}
            </div>
            <div className="mb-3">
              <strong>Niveau:</strong> {data?.niveau || '--'}
            </div>
            <div className="mb-3">
            </div>
          </div>
        )}
      />

      <ImportModal
        modalId="importModal"
        title="Importer des étudiants"
        onImport={handleImport}
        loading={loadingImport}
        acceptedFormats=".csv,.xlsx,.xls"
        // description="Sélectionnez un fichier CSV ou Excel contenant les données des étudiants"
      />
      <MotDePasseProvisoire identifiants={identifiants} onClose={() => setIdentifiants(null)} />
    </div>
  );
};

export default ListeEtudiant;
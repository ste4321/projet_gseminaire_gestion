import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errorMessage as messageErreur } from '../api/client';
import { useFeedback } from '../contexts/FeedbackContext';
import { useAnnee } from '../contexts/AnneeContext';
import useParcoursPagines from '../hooks/useParcoursPagines';

// Import des composants modulaires
import SearchBar from './SearchBar';
import AddModal from './AddModal';
import EditModal from './EditModal';
import DeleteModal from './DeleteModal';
import DataTable from './DataTable';
import Pagination from './Pagination';
import FicheEtudiant from './FicheEtudiant';
import ImportModal from './ImportModal';
import MotDePasseProvisoire from './MotDePasseProvisoire';
import { telechargerIdentifiants } from '../utils/identifiants';
import BoutonCopier from './BoutonCopier';
import { ouvrirEspace } from '../auth/consultation';
import { useNiveau } from '../contexts/NiveauContext';
import { trierNiveaux, libelleNiveau, optionsNiveaux } from '../utils/niveaux';

const ListeEtudiant = () => {
  const { notify, confirm } = useFeedback();
  const { annees: anneesListe, loading: loadingAnnees } = useAnnee();
  const { niveaux, loading: loadingNiveaux } = useNiveau();

  // États pour les filtres
  // Année la plus récente choisie dès le premier rendu si les années sont déjà en mémoire (pas de squelette au retour sur la page)
  const [selectedAnnee, setSelectedAnnee] = useState(() =>
    anneesListe.length > 0 ? String(Math.max(...anneesListe.map(a => a.id))) : ''
  );
  const [niveau, setNiveau] = useState('L1'); // code du niveau (table `niveaux`), L1 par défaut
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

  // Année affichée par défaut : la plus récente
  const annees = [...anneesListe].sort((a, b) => b.id - a.id);
  useEffect(() => {
    if (!selectedAnnee && annees.length > 0) setSelectedAnnee(String(annees[0].id));
  }, [annees, selectedAnnee]);

  // Niveaux de la base, dans l'ordre (L1, L2, L3, M1…) ; si L1 n'existe pas, le premier niveau est affiché
  const niveauxTries = trierNiveaux(niveaux);
  useEffect(() => {
    if (niveauxTries.length > 0 && !niveauxTries.some(n => n.niveau === niveau)) setNiveau(niveauxTries[0].niveau);
  }, [niveauxTries, niveau]);

  // Filtrage, recherche et pagination faits par le serveur : seule la page affichée est chargée
  const { lignes, total, pages: totalPages, premierChargement, attente, actualisation, erreur: erreurListe, recharger } =
    useParcoursPagines({ annee: selectedAnnee, niveau, recherche: searchTerm, page: currentPage, parPage: itemsPerPage });
  const chargement = premierChargement && !erreurListe && (loadingAnnees || anneesListe.length > 0);

  // Page devenue vide (suppression du dernier étudiant de la page) : retour à la dernière page existante
  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages - 1) setCurrentPage(totalPages - 1);
  }, [totalPages, currentPage]);

  const currentEtudiants = lignes.map(parcours => {
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
  });

  // Configuration des champs pour les modales
  const etudiantFields = [
    { name: 'nom_prenom', label: 'Nom Prénom', type: 'text', placeholder: 'Entrer le nom et prénom', required: true },
    { name: 'matricule', label: 'Matricule', type: 'text', placeholder: 'Entrer le numéro d\'étudiant', required: true },
    { name: 'email', label: 'Email', type: 'email', placeholder: 'Entrer l\'email', required: true },
    { name: 'telephone', label: 'Téléphone', type: 'text', placeholder: 'Entrer le numéro de téléphone', required: true },
    { name: 'diocese', label: 'Diocese', type: 'text', placeholder: 'Entrer le nom de la diocese ', required: true },
    // Niveaux lus en base : le serveur valide le code reçu contre la table `niveaux`
    { name: 'niveau', label: 'Niveau', type: 'select', placeholder: 'Sélectionner le niveau', required: true,
      options: optionsNiveaux(niveaux), disabled: loadingNiveaux && niveaux.length === 0 }
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
      recharger();

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
      recharger();

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
      recharger();

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
      recharger();

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
      niveau // niveau de l'onglet affiché, modifiable dans le formulaire
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
    window.bootstrap.Modal.getOrCreateInstance(document.getElementById('detailModal')).show();
  };

  // Action lancée depuis la fiche : la fiche se ferme d'abord, pour ne pas empiler deux fenêtres
  const depuisFiche = (action) => {
    const el = document.getElementById('detailModal');
    el.addEventListener('hidden.bs.modal', () => action(), { once: true });
    window.bootstrap.Modal.getOrCreateInstance(el).hide();
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

      {/* Premier lancement : sans année, l'ajout manuel d'un étudiant est impossible */}
      {!loadingAnnees && anneesListe.length === 0 && (
        <div className="alert alert-info d-flex flex-wrap align-items-center gap-2">
          <i className="bx bx-calendar"></i>
          <span className="flex-grow-1">
            Aucune année académique n'est encore enregistrée. Importez un fichier Etudiant_L1_2026-2027.xlsx,
            ou créez l'année dans le module Matières pour ajouter les étudiants à la main.
          </span>
          {role === 'admin' && <Link className="btn btn-sm btn-primary" to="/admin/matiere">Créer l'année académique</Link>}
        </div>
      )}

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

      {/* 🔹 Sélecteur de niveau : niveaux enregistrés en base */}
      <ul className="nav nav-pills mb-3">
        {loadingNiveaux && niveauxTries.length === 0
          ? [0, 1, 2].map(i => (
              <li className="nav-item me-2" key={i}>
                <span className="gstf-squelette" style={{ width: '3.5rem', height: '2.4rem' }} />
              </li>
            ))
          : niveauxTries.map(n => (
              <li className="nav-item" key={n.id}>
                <button
                  className={`nav-link ${niveau === n.niveau ? 'active' : ''}`}
                  title={libelleNiveau(n.niveau)}
                  onClick={() => handleNiveauChange(n.niveau)}
                >
                  {n.niveau}
                </button>
              </li>
            ))}
      </ul>

      <div className="card">
        <h5 className="card-header">
          Liste des étudiants en {niveau}
          {chargement ? (
            // Année et effectif inconnus au premier chargement : squelette à leur place
            <span className="gstf-squelette d-inline-block align-middle ms-2" style={{ width: '11rem', height: '1rem' }} aria-hidden="true" />
          ) : (
            <>
              {selectedAnnee && annees.find(a => a.id == selectedAnnee) && (
                <span className="text-muted ms-2">
                  - {annees.find(a => a.id == selectedAnnee)?.annee_aca}
                </span>
              )}
              {!erreurListe && (actualisation ? (
                // Effectif d'un autre filtre en attente de la réponse : squelette plutôt qu'un nombre périmé
                <span className="gstf-squelette d-inline-block align-middle ms-2" style={{ width: '6rem', height: '0.875rem' }} aria-hidden="true" />
              ) : (
                <small className="text-muted fw-normal ms-2">· {total} étudiant{total > 1 ? 's' : ''}</small>
              ))}
            </>
          )}
        </h5>
        {role === 'admin' && (
        <div className="mb-3 ms-4">
          <button className="btn btn-primary me-2" onClick={openAddModal}>
            Nouveau
          </button>
          <button className="btn btn-outline-primary" onClick={openImportModal}>
            <i className="bx bx-import me-1"></i>
            Importer fichier
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
          refreshing={actualisation}
          renderCell={(etudiant, field) => {
            const value = etudiant[field];
            // Matricule : ouvre l'espace de l'étudiant (lecture seule), sans déclencher le clic sur la ligne
            if (field === 'matricule' && value) {
              return (
                <span className="d-inline-flex align-items-center gap-1">
                  {role === 'admin' ? (
                    <button type="button" className="btn btn-link p-0 gstf-lien-espace"
                      title={`Ouvrir l'espace de ${etudiant.nom_prenom}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        ouvrirEspace({ userId: etudiant.id_user_cession, nom: etudiant.nom_prenom, role: 'etudiant', confirm, notify });
                      }}>
                      {value}
                    </button>
                  ) : value}
                  <BoutonCopier texte={value} libelle={`Copier le matricule ${value}`} />
                </span>
              );
            }
            return value ? value : '--';
          }}
        />

        {erreurListe && (
          <div className="alert alert-danger d-flex justify-content-between align-items-center m-3" role="alert">
            <span>{erreurListe}</span>
            <button type="button" className="btn btn-sm btn-outline-danger" onClick={recharger}>Réessayer</button>
          </div>
        )}

        {!chargement && !erreurListe && !attente && currentEtudiants.length === 0 && (
          <div className="text-center py-4 text-warning">
            Aucun étudiant trouvé pour {niveau}
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

      <FicheEtudiant
        modalId="detailModal"
        etudiant={detailEtudiant}
        role={role}
        onModifier={() => depuisFiche(() => openEditModal(detailEtudiant))}
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

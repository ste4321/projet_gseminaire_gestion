import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useNiveau } from '../contexts/NiveauContext';
import { useSemestre } from '../contexts/SemestreContext';
import { useAnnee } from '../contexts/AnneeContext';
import useMatieresAnnee from '../hooks/useMatieresAnnee';
import api, { errorMessage } from '../api/client';
import { useFeedback } from '../contexts/FeedbackContext';
import SearchBar from './SearchBar';
import DataTable from './DataTable';
import AddModal from './AddModal';
import EditModal from './EditModal';
import Pagination from './Pagination';
import { plusRecentsDabord } from '../utils/tri';
import { trierNiveaux } from '../utils/niveaux';

// Programme par année académique : le catalogue des matières (nom, code, niveau, semestre) est commun,
// chaque année choisit ses matières et leur coefficient. Retirer une matière d'une année ou changer
// son coefficient ne modifie pas les relevés des autres années.

const FORMULAIRE_VIDE = { matiere: '', heures: '', id_niveau: '', id_semestre: '', code_matiere: '', coefficient: '' };
const SANS_SEMESTRE = 'aucun';

// Recherche sans tenir compte des majuscules ni des accents (« theologie » trouve « Théologie »)
const normaliser = (texte) => String(texte ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const parNom = (a, b) => a.matiere.localeCompare(b.matiere);

// Année proposée à la création : celle qui suit la plus récente, sinon l'année en cours (rentrée en septembre)
const anneeSuivante = (plusRecente) => {
  const m = /^(\d{4})-(\d{4})$/.exec(plusRecente || '');
  if (m) return `${Number(m[1]) + 1}-${Number(m[2]) + 1}`;
  const d = new Date();
  const debut = d.getMonth() >= 8 ? d.getFullYear() : d.getFullYear() - 1;
  return `${debut}-${debut + 1}`;
};

const modal = (id) => window.bootstrap.Modal.getOrCreateInstance(document.getElementById(id));

const Matiere = () => {
  const { niveaux, loading: loadingNiveaux } = useNiveau();
  const { semestres, loading: loadingSemestres } = useSemestre();
  const { annees: anneesListe, loading: loadingAnnees, fetchAnnees } = useAnnee();
  const { notify, confirm } = useFeedback();
  const role = localStorage.getItem('role');
  const admin = role === 'admin';

  // ---------- Année ----------
  const annees = useMemo(() => [...anneesListe].sort((a, b) => b.id - a.id), [anneesListe]);
  const [selectedAnnee, setSelectedAnnee] = useState(() =>
    anneesListe.length > 0 ? String(Math.max(...anneesListe.map((a) => a.id))) : ''
  );
  useEffect(() => {
    if (!selectedAnnee && annees.length > 0) setSelectedAnnee(String(annees[0].id));
  }, [annees, selectedAnnee]);
  const anneeCourante = annees.find((a) => String(a.id) === String(selectedAnnee));
  const libelleAnnee = anneeCourante?.annee_aca ?? '';
  const anneePassee = Boolean(anneeCourante) && anneeCourante.id !== annees[0]?.id;
  const aucuneAnnee = !loadingAnnees && annees.length === 0;
  // Référentiels à créer avant les matières (premier lancement)
  const aucunNiveau = !loadingNiveaux && niveaux.length === 0;
  const aucunSemestre = !loadingSemestres && semestres.length === 0;

  const { matieres, chargement: chargementMatieres, recharger } = useMatieresAnnee(selectedAnnee);

  // ---------- Niveau ----------
  const onglets = trierNiveaux(niveaux);
  const [niveauActif, setNiveauActif] = useState(null);
  const niveauFilter = niveauActif ?? onglets[0]?.id ?? null;
  const niveauCourant = onglets.find((n) => n.id === niveauFilter);

  const [semestreFilter, setSemestreFilter] = useState(''); // '' = tous, id, ou SANS_SEMESTRE
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(FORMULAIRE_VIDE);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [enCours, setEnCours] = useState(null); // id de la matière (ou 'copie') dont l'action est en cours
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 10;
  const [nouvelleAnnee, setNouvelleAnnee] = useState({ annee_aca: '' });
  const [loadingAnnee, setLoadingAnnee] = useState(false);

  useEffect(() => {
    setCurrentPage(0);
  }, [search, niveauFilter, semestreFilter, selectedAnnee]);

  // Matières du niveau : au programme de l'année (le tableau) / ailleurs dans le catalogue (à remettre)
  const duNiveau = useMemo(() => matieres.filter((m) => m.id_niveau === niveauFilter), [matieres, niveauFilter]);
  const programme = useMemo(() => plusRecentsDabord(duNiveau.filter((m) => m.au_programme)), [duNiveau]);
  const horsProgramme = useMemo(() => duNiveau.filter((m) => !m.au_programme).sort(parNom), [duNiveau]);

  const memeSemestre = (m, filtre) =>
    !filtre || (filtre === SANS_SEMESTRE ? !m.id_semestre : m.id_semestre === Number(filtre));
  const terme = normaliser(search);
  const filtered = programme
    .filter((m) => memeSemestre(m, semestreFilter))
    .filter((m) => !terme || normaliser(m.matiere).includes(terme) || normaliser(m.code_matiere).includes(terme));

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage);

  // Segments du filtre semestre, avec le nombre de matières du programme dans chacun
  const segments = [
    { valeur: '', label: 'Tous', total: programme.length },
    ...[...semestres]
      .sort((a, b) => String(a.code_semestre).localeCompare(String(b.code_semestre)))
      .map((s) => ({ valeur: String(s.id), label: s.code_semestre, titre: s.semestre, total: programme.filter((m) => m.id_semestre === s.id).length })),
  ];
  const sansSemestre = programme.filter((m) => !m.id_semestre).length;
  if (sansSemestre > 0) segments.push({ valeur: SANS_SEMESTRE, label: 'Sans semestre', total: sansSemestre });

  const filtresActifs = Boolean(terme || semestreFilter);
  const effacerFiltres = () => {
    setSearch('');
    setSemestreFilter('');
  };

  // Année d'où reprendre un programme : la précédente si elle existe, sinon la plus récente des autres
  const anneesSources = annees.filter((a) => String(a.id) !== String(selectedAnnee));
  const [source, setSource] = useState('');
  const sourceParDefaut = anneesSources.find((a) => anneeCourante && a.id < anneeCourante.id) || anneesSources[0];
  const sourceChoisie = anneesSources.find((a) => String(a.id) === String(source)) || sourceParDefaut;

  // ---------- Actions ----------
  const ouvrirAjout = () => {
    setForm({ ...FORMULAIRE_VIDE, id_niveau: niveauFilter ?? '', id_semestre: semestreFilter && semestreFilter !== SANS_SEMESTRE ? semestreFilter : '' });
    setSelected(null);
    modal('addModal').show();
  };

  const ouvrirModification = (matiere) => {
    setSelected(matiere);
    setForm({
      matiere: matiere.matiere,
      heures: matiere.heures,
      id_niveau: matiere.id_niveau,
      id_semestre: matiere.id_semestre ?? '',
      code_matiere: matiere.code_matiere ?? '',
      coefficient: matiere.coefficient,
    });
    modal('editModal').show();
  };

  const ouvrirDetail = (matiere) => {
    setDetail(matiere);
    modal('detailModal').show();
  };

  // Depuis une fenêtre : la fermer d'abord, pour ne pas empiler deux fenêtres
  const depuis = (id, action) => {
    const el = document.getElementById(id);
    el.addEventListener('hidden.bs.modal', () => action(), { once: true });
    modal(id).hide();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoadingSubmit(true);
    try {
      const donnees = { ...form, id_annee_aca: selectedAnnee };
      if (selected) {
        await api.put(`/matieres/${selected.id}`, donnees);
        notify.success('Matière modifiée.');
      } else {
        await api.post('/matieres', donnees);
        notify.success(`Matière ajoutée au programme ${libelleAnnee}.`);
      }
      recharger();
      modal(selected ? 'editModal' : 'addModal').hide();
      setForm(FORMULAIRE_VIDE);
      setSelected(null);
    } catch (err) {
      notify.error(errorMessage(err, "Erreur lors de l'enregistrement."));
    } finally {
      setLoadingSubmit(false);
    }
  };

  const executer = async (id, requete, messageErreur) => {
    setEnCours(id);
    try {
      const res = await requete();
      notify.success(res.data.message);
      recharger();
      return true;
    } catch (err) {
      notify.error(errorMessage(err, messageErreur));
      return false;
    } finally {
      setEnCours(null);
    }
  };

  const retirer = async (matiere) => {
    // Notes déjà saisies : conservées, mais elles ne comptent plus tant que la matière est hors programme
    const avecNotes = matiere.notes_annee > 0
      ? `\n\n⚠️ ${matiere.notes_annee} note(s) sont déjà saisies pour ${libelleAnnee} : elles ne compteront plus dans les moyennes, ` +
        'mais elles sont conservées et reviendront si vous remettez la matière au programme.'
      : '';
    const ok = await confirm({
      title: `Retirer ${matiere.matiere} du programme ${libelleAnnee} ?`,
      message:
        `Elle ne comptera plus dans les relevés de ${niveauCourant?.niveau} pour ${libelleAnnee}.\n` +
        'Les autres années ne changent pas, et la matière reste dans le catalogue : vous pourrez la remettre au programme.' +
        avecNotes,
      confirmLabel: 'Retirer du programme',
      danger: true,
    });
    if (ok) {
      executer(matiere.id, () => api.delete('/programme', { data: { id_annee_aca: selectedAnnee, id_matiere: matiere.id } }), 'Le retrait a échoué.');
    }
  };

  const remettre = (matiere) =>
    executer(matiere.id, () => api.post('/programme', { id_annee_aca: selectedAnnee, id_matiere: matiere.id }), "L'ajout au programme a échoué.");

  const supprimerDuCatalogue = async (matiere) => {
    const ok = await confirm({
      title: `Supprimer ${matiere.matiere} du catalogue ?`,
      message: "Elle n'a aucune note : elle disparaîtra de toutes les années. Cette action est définitive.",
      confirmLabel: 'Supprimer définitivement',
      danger: true,
    });
    if (ok) executer(matiere.id, () => api.delete(`/matieres/${matiere.id}`), 'La suppression a échoué.');
  };

  const reprendre = () => {
    if (!sourceChoisie) return;
    executer(
      'copie',
      () => api.post('/programme/copier', { id_annee_aca: selectedAnnee, depuis: sourceChoisie.id, id_niveau: niveauFilter }),
      'La reprise du programme a échoué.'
    );
  };

  const ouvrirNouvelleAnnee = () => {
    setNouvelleAnnee({ annee_aca: anneeSuivante(annees[0]?.annee_aca) });
    modal('anneeModal').show();
  };

  const creerAnnee = async (e) => {
    e.preventDefault();
    setLoadingAnnee(true);
    try {
      const res = await api.post('/annee_aca', nouvelleAnnee);
      notify.success(res.data.message);
      await fetchAnnees();
      setSelectedAnnee(String(res.data.annee.id)); // on arrive directement sur son programme
      modal('anneeModal').hide();
    } catch (err) {
      notify.error(errorMessage(err, "La création de l'année a échoué."));
    } finally {
      setLoadingAnnee(false);
    }
  };

  // ---------- Fiche détail ----------
  const detailAJour = detail && (matieres.find((m) => m.id === detail.id) || detail);
  const voisines = detailAJour
    ? programme.filter((m) => (m.id_semestre ?? null) === (detailAJour.id_semestre ?? null) && m.id_niveau === detailAJour.id_niveau)
    : [];
  const coefSemestre = voisines.reduce((s, m) => s + (Number(m.coefficient) || 0), 0);
  const poids = coefSemestre > 0 ? Math.round(((Number(detailAJour?.coefficient) || 0) * 100) / coefSemestre) : 0;
  const heuresSemestre = voisines.reduce((s, m) => s + (Number(m.heures) || 0), 0);
  const libelleSemestre = detailAJour?.semestre?.semestre || 'Hors semestre';
  // La matière affichée est déjà détaillée en haut : la liste ne montre que les autres
  const autres = voisines.filter((m) => m.id !== detailAJour?.id).sort(parNom);

  // ---------- Formulaires ----------
  const champsCommuns = [
    { name: 'matiere', label: 'Matière', required: true, placeholder: 'ex. Philosophie morale' },
    { name: 'code_matiere', label: 'Code matière', optional: true, placeholder: 'ex. PHM',
      help: 'Utile pour importer les notes par fichier (NOTES_CODE_L1_S1_2025-2026.xlsx). Un même code peut servir à plusieurs niveaux, mais pas deux fois dans le même niveau et le même semestre. Sans « _ ».' },
    {
      name: 'id_niveau',
      label: 'Niveau',
      type: 'select',
      options: onglets.map((n) => ({ value: n.id, label: n.niveau })),
      required: true,
      // Les notes déjà saisies appartiennent à des inscriptions de ce niveau
      disabled: Boolean(selected?.notes_total),
      help: selected?.notes_total ? 'Des notes sont enregistrées pour cette matière : son niveau ne peut plus changer.' : undefined,
    },
    {
      name: 'id_semestre',
      label: 'Semestre',
      type: 'select',
      options: semestres.map((s) => ({ value: s.id, label: `${s.code_semestre} · ${s.semestre}` })),
      required: true,
    },
  ];
  const champsAnnee = [
    { name: 'coefficient', label: `Coefficient en ${libelleAnnee}`, type: 'number', required: true, placeholder: 'ex. 2',
      help: selected ? 'Pour cette année seulement : les autres années gardent leur coefficient.' : undefined },
    { name: 'heures', label: `Volume horaire en ${libelleAnnee} (heures)`, type: 'number', required: true, placeholder: 'ex. 30' },
  ];
  const champsAjout = [...champsCommuns, ...champsAnnee];
  const champsModification = [
    { ...champsCommuns[0], help: 'Nom, code, niveau et semestre valent pour toutes les années où la matière est enseignée.' },
    ...champsCommuns.slice(1),
    ...champsAnnee,
  ];

  const tableHeaders = [
    { label: 'Matière', field: 'matiere' },
    { label: 'Code', field: 'code_matiere' },
    { label: 'Coef.', field: 'coefficient' },
    { label: 'Heures', field: 'heures' },
    { label: 'Semestre', field: 'semestre' },
  ];

  const chargement = !aucuneAnnee && !aucunNiveau && (chargementMatieres || onglets.length === 0);
  const pret = !aucuneAnnee && !aucunNiveau; // programme consultable

  return (
    <div className="container-xxl flex-grow-1 container-p-y">
      <h4 className="fw-bold py-3 mb-4">
        <span className="text-muted fw-light text-capitalize">{role} /</span> Matières
      </h4>

      {/* 🔹 Année académique : chaque année a son programme */}
      <div className="mb-3">
        <label className="form-label" htmlFor="matiere-annee">Programme de l'année :</label>
        {loadingAnnees && annees.length === 0 ? (
          <span className="gstf-squelette d-inline-block align-middle ms-2" style={{ width: '9rem', height: '2.4rem' }} />
        ) : (
          <select
            id="matiere-annee"
            className="form-select w-auto d-inline ms-2"
            value={selectedAnnee || ''}
            onChange={(e) => setSelectedAnnee(e.target.value)}
            disabled={aucuneAnnee}
          >
            {annees.map((a) => (
              <option key={a.id} value={a.id}>{a.annee_aca}</option>
            ))}
          </select>
        )}
        {admin && !loadingAnnees && (
          <button type="button" className="btn btn-outline-primary ms-2 align-baseline" onClick={ouvrirNouvelleAnnee}>
            <i className="bx bx-calendar-plus me-1"></i>Nouvelle année
          </button>
        )}
      </div>

      {/* 🔹 Sélecteur de niveau */}
      <ul className="nav nav-pills mb-3">
        {aucunNiveau ? null : onglets.length === 0
          ? [0, 1, 2].map((i) => (
              <li className="nav-item me-2" key={i}>
                <span className="gstf-squelette" style={{ width: '3.5rem', height: '2.4rem' }} />
              </li>
            ))
          : onglets.map((n) => (
              <li className="nav-item" key={n.id}>
                <button className={`nav-link ${niveauFilter === n.id ? 'active' : ''}`} onClick={() => setNiveauActif(n.id)}>
                  {n.niveau}
                </button>
              </li>
            ))}
      </ul>

      {/* Premier lancement : ce qu'il manque, avec un accès direct */}
      {aucunNiveau && (
        <div className="alert alert-warning d-flex flex-wrap align-items-center gap-2">
          <i className="bx bx-layer"></i>
          <span className="flex-grow-1">Aucun niveau n'est encore créé : les matières sont rangées par niveau (L1, L2…).</span>
          {admin && <Link className="btn btn-sm btn-warning" to="/admin/niveau">Créer les niveaux</Link>}
        </div>
      )}
      {aucunSemestre && (
        <div className="alert alert-warning d-flex flex-wrap align-items-center gap-2">
          <i className="bx bx-calendar-check"></i>
          <span className="flex-grow-1">Aucun semestre n'est encore créé : chaque matière doit être rattachée à un semestre.</span>
          {admin && <Link className="btn btn-sm btn-warning" to="/admin/semestre">Créer les semestres</Link>}
        </div>
      )}
      {aucuneAnnee && (
        <div className="alert alert-info d-flex flex-wrap align-items-center gap-2">
          <i className="bx bx-calendar"></i>
          <span className="flex-grow-1">
            Aucune année académique n'est encore enregistrée. Créez-la pour préparer son programme avant l'arrivée des étudiants
            (l'import d'un fichier Etudiant_L1_2026-2027.xlsx la crée aussi).
          </span>
          {admin && (
            <button type="button" className="btn btn-sm btn-primary" onClick={ouvrirNouvelleAnnee}>
              <i className="bx bx-calendar-plus me-1"></i>Créer l'année académique
            </button>
          )}
        </div>
      )}

      {anneePassee && admin && (
        <div className="alert alert-warning small d-flex align-items-start gap-2" role="note">
          <i className="bx bx-history mt-1"></i>
          <span>
            Vous modifiez le programme d'une année passée ({libelleAnnee}) : les relevés de cette année seront recalculés.
            Les autres années ne changent pas.
          </span>
        </div>
      )}

      <div className="card">
        <h5 className="card-header">
          Programme{!chargement && niveauCourant && ` ${niveauCourant.niveau}`}
          {chargement ? (
            <span className="gstf-squelette d-inline-block align-middle ms-2" style={{ width: '11rem', height: '1rem' }} aria-hidden="true" />
          ) : (
            <>
              {libelleAnnee && <span className="text-muted ms-2">- {libelleAnnee}</span>}
              <small className="text-muted fw-normal ms-2">
                · {filtresActifs ? `${filtered.length} sur ${programme.length}` : programme.length} matière{programme.length > 1 ? 's' : ''}
              </small>
            </>
          )}
        </h5>

        {admin && pret && (
          <div className="mb-3 ms-4 d-flex flex-wrap gap-2">
            <button className="btn btn-primary" onClick={ouvrirAjout} disabled={chargement || aucunSemestre}
              title={aucunSemestre ? "Créez d'abord les semestres" : undefined}>
              <i className="bx bx-plus me-1"></i>Nouvelle matière
            </button>
            <button
              className="btn btn-outline-primary"
              onClick={() => modal('horsProgrammeModal').show()}
              disabled={chargement}
            >
              <i className="bx bx-book-add me-1"></i>Ajouter une matière existante
              {!chargement && horsProgramme.length > 0 && <span className="badge bg-primary ms-2">{horsProgramme.length}</span>}
            </button>
          </div>
        )}

        {/* Recherche + filtre semestre */}
        <div className="card-body pb-0">
          <div className="gstf-filtres">
            <SearchBar
              className="gstf-filtres__recherche"
              searchTerm={search}
              onSearchChange={setSearch}
              placeholder="Rechercher par nom ou code…"
            />
            <div className="gstf-segments" role="group" aria-label="Filtrer par semestre">
              {chargement
                ? <span className="gstf-squelette" style={{ width: '14rem', height: '2.4rem' }} />
                : segments.map((s) => (
                    <button
                      key={s.valeur || 'tous'}
                      type="button"
                      className={`gstf-segments__item ${semestreFilter === s.valeur ? 'is-active' : ''}`}
                      aria-pressed={semestreFilter === s.valeur}
                      title={s.titre}
                      onClick={() => setSemestreFilter(s.valeur)}
                    >
                      {s.label}
                      <span className="gstf-segments__nombre">{s.total}</span>
                    </button>
                  ))}
            </div>
          </div>
        </div>

        <DataTable
          headers={tableHeaders}
          data={paginated}
          role={role}
          loading={chargement}
          skeletonRows={6}
          onRowClick={ouvrirDetail}
          onEdit={ouvrirModification}
          onDelete={(id) => retirer(programme.find((m) => m.id === id))}
          deleteTitle="Retirer du programme de l'année"
          deleteIcon="bx-minus-circle"
          renderCell={(item, field) => {
            if (field === 'matiere') return <span className="fw-semibold">{item.matiere}</span>;
            if (field === 'code_matiere') {
              return item.code_matiere
                ? <span className="badge bg-label-primary">{item.code_matiere}</span>
                : <span className="text-muted">—</span>;
            }
            if (field === 'heures') return item.heures ? `${item.heures} h` : '—';
            if (field === 'semestre') {
              return item.semestre
                ? <span title={item.semestre.semestre}>{item.semestre.code_semestre}</span>
                : <span className="text-muted">—</span>;
            }
            return item[field] ?? '—';
          }}
        />

        {!chargement && pret && filtered.length === 0 && (
          <div className="gstf-empty">
            {filtresActifs ? (
              <>
                <i className="bx bx-search-alt d-block"></i>
                Aucune matière du programme ne correspond à ces critères en {niveauCourant?.niveau}.
                <div className="mt-3">
                  <button type="button" className="btn btn-sm btn-outline-primary" onClick={effacerFiltres}>Effacer les filtres</button>
                </div>
              </>
            ) : (
              <>
                <i className="bx bx-book-open d-block"></i>
                Aucune matière au programme {niveauCourant?.niveau} pour {libelleAnnee}.
                {admin && (
                  <div className="mt-3 d-flex flex-wrap justify-content-center align-items-center gap-2">
                    {sourceChoisie && (
                      <div className="input-group input-group-sm w-auto">
                        <label className="input-group-text" htmlFor="programme-source">Reprendre le programme de</label>
                        <select
                          id="programme-source"
                          className="form-select"
                          value={sourceChoisie.id}
                          onChange={(e) => setSource(e.target.value)}
                        >
                          {anneesSources.map((a) => (
                            <option key={a.id} value={a.id}>{a.annee_aca}</option>
                          ))}
                        </select>
                        <button type="button" className="btn btn-primary" onClick={reprendre} disabled={enCours === 'copie'}>
                          {enCours === 'copie' ? 'Patientez…' : 'Reprendre'}
                        </button>
                      </div>
                    )}
                    <span className="text-muted small">ou</span>
                    <button type="button" className="btn btn-sm btn-outline-primary" onClick={ouvrirAjout} disabled={aucunSemestre}>Créer une matière</button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
      </div>

      <AddModal
        modalId="addModal"
        title={`Nouvelle matière au programme ${libelleAnnee}`}
        fields={champsAjout}
        formData={form}
        onFormChange={(name, value) => setForm({ ...form, [name]: value })}
        onSubmit={handleSubmit}
        loading={loadingSubmit}
      />

      <EditModal
        modalId="editModal"
        title="Modifier la matière"
        fields={champsModification}
        formData={form}
        onFormChange={(name, value) => setForm({ ...form, [name]: value })}
        onSubmit={handleSubmit}
        loading={loadingSubmit}
      />

      <AddModal
        modalId="anneeModal"
        title="Nouvelle année académique"
        fields={[{
          name: 'annee_aca', label: 'Année académique', required: true, placeholder: 'ex. 2026-2027',
          help: (annees[0]
            ? `Elle reprendra le programme ${annees[0].annee_aca}, que vous pourrez ensuite ajuster. `
            : 'Son programme sera vide : vous y ajouterez les matières. ')
            + "Elle devient l'année par défaut : les étudiants ajoutés à la main y seront inscrits.",
        }]}
        formData={nouvelleAnnee}
        onFormChange={(name, value) => setNouvelleAnnee({ ...nouvelleAnnee, [name]: value })}
        onSubmit={creerAnnee}
        loading={loadingAnnee}
        buttonText="Créer l'année"
      />

      {/* Matières du catalogue de ce niveau qui ne sont pas au programme de l'année */}
      <div className="modal fade" id="horsProgrammeModal" tabIndex="-1" aria-labelledby="horsProgrammeTitre" aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <div>
                <h5 className="modal-title mb-1" id="horsProgrammeTitre">Ajouter au programme {niveauCourant?.niveau} · {libelleAnnee}</h5>
                <small className="text-muted">Matières du catalogue qui ne sont pas enseignées cette année.</small>
              </div>
              <button type="button" className="btn-close align-self-start" data-bs-dismiss="modal" aria-label="Fermer"></button>
            </div>
            <div className="modal-body p-0">
              {horsProgramme.length === 0 ? (
                // Rien à remettre : expliquer pourquoi et orienter vers la création
                <div className="text-center py-4 px-4">
                  <i className="bx bx-check-circle display-6 text-success d-block mb-2"></i>
                  <p className="mb-1">
                    Toutes les matières du catalogue {niveauCourant?.niveau} sont déjà au programme {libelleAnnee}.
                  </p>
                  <p className="text-muted small mb-3">
                    Cette liste montre les matières retirées du programme ou enseignées seulement d'autres années.
                    Pour une matière qui n'existe pas encore, créez-la.
                  </p>
                  <button type="button" className="btn btn-sm btn-primary" onClick={() => depuis('horsProgrammeModal', ouvrirAjout)}>
                    <i className="bx bx-plus me-1"></i>Nouvelle matière
                  </button>
                </div>
              ) : (
                <ul className="list-group list-group-flush">
                  {horsProgramme.map((m) => {
                    const derniere = m.historique?.[0];
                    return (
                      <li className="list-group-item d-flex flex-wrap align-items-center gap-2 px-4" key={m.id}>
                        <div className="flex-grow-1 min-w-0">
                          <div className="fw-semibold text-truncate">
                            {m.matiere}
                            {m.code_matiere && <span className="badge bg-label-primary ms-2">{m.code_matiere}</span>}
                          </div>
                          <small className="text-muted">
                            {m.semestre?.code_semestre ?? 'Sans semestre'} ·{' '}
                            {derniere
                              ? `dernière année : ${derniere.annee_aca} (coef. ${derniere.coefficient}${derniere.heures ? ` · ${derniere.heures} h` : ''})`
                              : 'jamais enseignée'}
                          </small>
                        </div>
                        {m.notes_total === 0 && (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => depuis('horsProgrammeModal', () => supprimerDuCatalogue(m))}
                            disabled={enCours === m.id}
                            title="Supprimer définitivement du catalogue (aucune note enregistrée)"
                            aria-label={`Supprimer ${m.matiere} du catalogue`}
                          >
                            <i className="bx bx-trash"></i>
                          </button>
                        )}
                        <button type="button" className="btn btn-sm btn-primary" onClick={() => remettre(m)} disabled={enCours === m.id}>
                          {enCours === m.id ? 'Patientez…' : <><i className="bx bx-plus me-1"></i>Ajouter</>}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <div className="modal-footer">
              <small className="text-muted me-auto">Le coefficient repris est celui de la dernière année enseignée ; modifiable ensuite.</small>
              <button type="button" className="btn btn-outline-secondary" data-bs-dismiss="modal">Fermer</button>
            </div>
          </div>
        </div>
      </div>

      {/* Fiche détail d'une matière */}
      <div className="modal fade" id="detailModal" tabIndex="-1" aria-labelledby="detailMatiereTitre" aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content">
            {detailAJour && (
              <>
                <div className="modal-header gstf-fiche__entete">
                  <div className="min-w-0">
                    <h4 className="modal-title mb-1" id="detailMatiereTitre">{detailAJour.matiere}</h4>
                    {/* Niveau, semestre et code : une seule fois, en sous-titre */}
                    <div className="d-flex flex-wrap align-items-center gap-2 small text-muted">
                      <span>{detailAJour.niveau?.niveau} · {libelleSemestre} · {libelleAnnee}</span>
                      {detailAJour.code_matiere && <span className="badge bg-label-primary">Code {detailAJour.code_matiere}</span>}
                    </div>
                  </div>
                  <button type="button" className="btn-close align-self-start" data-bs-dismiss="modal" aria-label="Fermer"></button>
                </div>

                <div className="modal-body">
                  {/* Chaque chiffre porte sa part du semestre : plus besoin d'une ligne de totaux à part */}
                  <div className="gstf-fiche__chiffres">
                    <div>
                      <span>Coefficient</span>
                      <strong>{detailAJour.coefficient ?? '—'}</strong>
                      <small className="text-muted d-block">sur {coefSemestre} au semestre</small>
                    </div>
                    <div>
                      <span>Volume horaire</span>
                      <strong>{detailAJour.heures ? `${detailAJour.heures} h` : '—'}</strong>
                      <small className="text-muted d-block">sur {heuresSemestre} h au semestre</small>
                    </div>
                    <div>
                      <span>Poids dans la moyenne</span>
                      <strong>{poids} %</strong>
                      <div className="gstf-bar mt-2" role="presentation"><span style={{ width: `${poids}%` }}></span></div>
                    </div>
                  </div>

                  {!detailAJour.code_matiere && (
                    <div className="alert alert-warning small d-flex align-items-start gap-2 mt-3 mb-0 py-2" role="note">
                      <i className="bx bx-info-circle mt-1"></i>
                      <span>Pas de code matière : les notes se saisissent à la main, l'import par fichier n'est pas possible.</span>
                    </div>
                  )}

                  {/* Années où la matière a été enseignée : un coefficient changé une année n'a pas touché les autres */}
                  {detailAJour.historique?.length > 1 && (
                    <>
                      <h6 className="gstf-section-title mt-4 mb-2">
                        Enseignée en
                        <small className="text-muted fw-normal ms-2">{detailAJour.historique.length} années</small>
                      </h6>
                      <div className="d-flex flex-wrap gap-2">
                        {detailAJour.historique.map((h) => (
                          <span
                            key={h.id_annee_aca}
                            className={`badge ${String(h.id_annee_aca) === String(selectedAnnee) ? 'bg-primary' : 'bg-label-secondary'}`}
                          >
                            {h.annee_aca} · coef. {h.coefficient}{h.heures ? ` · ${h.heures} h` : ''}
                          </span>
                        ))}
                      </div>
                    </>
                  )}

                  {autres.length > 0 && (
                    <>
                      <h6 className="gstf-section-title mt-4 mb-2">
                        Autres matières du semestre
                        <small className="text-muted fw-normal ms-2">{autres.length}</small>
                      </h6>
                      <ul className="list-unstyled mb-0 gstf-fiche__liste">
                        {autres.map((m) => (
                          <li key={m.id}>
                            <button type="button" className="gstf-fiche__ligne" onClick={() => setDetail(m)} title={`Voir la fiche de ${m.matiere}`}>
                              <span className="text-truncate">{m.matiere}</span>
                              <span className="text-muted small text-nowrap">coef. {m.coefficient}{m.heures ? ` · ${m.heures} h` : ''}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>

                <div className="modal-footer">
                  {admin && detailAJour.au_programme && (
                    <button type="button" className="btn btn-outline-danger me-auto" onClick={() => depuis('detailModal', () => retirer(detailAJour))}>
                      <i className="bx bx-minus-circle me-1"></i>Retirer du programme
                    </button>
                  )}
                  <button type="button" className="btn btn-outline-secondary" data-bs-dismiss="modal">Fermer</button>
                  {admin && (
                    <button type="button" className="btn btn-primary" onClick={() => depuis('detailModal', () => ouvrirModification(detailAJour))}>
                      <i className="bx bx-edit me-1"></i>Modifier
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Matiere;

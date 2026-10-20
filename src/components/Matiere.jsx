import React, { useState, useEffect, useMemo } from 'react';
import { useMatiere } from '../contexts/MatiereContext';
import { useNiveau } from '../contexts/NiveauContext';
import { useSemestre } from '../contexts/SemestreContext';
import api, { errorMessage } from '../api/client';
import { useFeedback } from '../contexts/FeedbackContext';
import SearchBar from './SearchBar';
import DataTable from './DataTable';
import AddModal from './AddModal';
import EditModal from './EditModal';
import DeleteModal from './DeleteModal';
import Pagination from './Pagination';
import { plusRecentsDabord } from '../utils/tri';

const FORMULAIRE_VIDE = { matiere: '', heures: '', id_niveau: '', id_semestre: '', code_matiere: '', coefficient: '' };
const SANS_SEMESTRE = 'aucun';

// Recherche sans tenir compte des majuscules ni des accents (« theologie » trouve « Théologie »)
const normaliser = (texte) => String(texte ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

const modal = (id) => window.bootstrap.Modal.getOrCreateInstance(document.getElementById(id));

const Matiere = () => {
  const { matieres, fetchMatieres, loading } = useMatiere();
  const { niveaux } = useNiveau();
  const { semestres } = useSemestre();
  const { notify } = useFeedback();
  const role = localStorage.getItem('role');

  // Un onglet par niveau (L1, L2, L3…), comme dans la gestion des notes
  const onglets = [...niveaux].sort((a, b) => a.niveau.localeCompare(b.niveau));
  const [niveauActif, setNiveauActif] = useState(null);
  const niveauFilter = niveauActif ?? onglets[0]?.id ?? null;
  const niveauCourant = onglets.find((n) => n.id === niveauFilter);

  const [semestreFilter, setSemestreFilter] = useState(''); // '' = tous, id, ou SANS_SEMESTRE
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(FORMULAIRE_VIDE);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [loadingDeleteId, setLoadingDeleteId] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 10;

  useEffect(() => {
    setCurrentPage(0);
  }, [search, niveauFilter, semestreFilter]);

  // Matières de l'onglet, puis filtre semestre et recherche (nom ou code)
  const duNiveau = useMemo(
    () => plusRecentsDabord(matieres).filter((m) => m.id_niveau === niveauFilter),
    [matieres, niveauFilter]
  );
  const memeSemestre = (m, filtre) =>
    !filtre || (filtre === SANS_SEMESTRE ? !m.id_semestre : m.id_semestre === Number(filtre));
  const terme = normaliser(search);
  const filtered = duNiveau
    .filter((m) => memeSemestre(m, semestreFilter))
    .filter((m) => !terme || normaliser(m.matiere).includes(terme) || normaliser(m.code_matiere).includes(terme));

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage);

  // Segments du filtre semestre, avec le nombre de matières du niveau dans chacun
  const segments = [
    { valeur: '', label: 'Tous', total: duNiveau.length },
    ...[...semestres]
      .sort((a, b) => String(a.code_semestre).localeCompare(String(b.code_semestre)))
      .map((s) => ({ valeur: String(s.id), label: s.code_semestre, titre: s.semestre, total: duNiveau.filter((m) => m.id_semestre === s.id).length })),
  ];
  const sansSemestre = duNiveau.filter((m) => !m.id_semestre).length;
  if (sansSemestre > 0) segments.push({ valeur: SANS_SEMESTRE, label: 'Sans semestre', total: sansSemestre });

  const filtresActifs = Boolean(terme || semestreFilter);
  const effacerFiltres = () => {
    setSearch('');
    setSemestreFilter('');
  };

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

  const ouvrirSuppression = (id) => {
    setDeleteId(id);
    modal('deleteModal').show();
  };

  const ouvrirDetail = (matiere) => {
    setDetail(matiere);
    modal('detailModal').show();
  };

  // Depuis la fiche détail : la fermer d'abord, pour ne pas empiler deux fenêtres
  const depuisDetail = (action) => {
    const el = document.getElementById('detailModal');
    el.addEventListener('hidden.bs.modal', () => action(), { once: true });
    modal('detailModal').hide();
  };

  const handleDelete = async () => {
    setLoadingDeleteId(deleteId);
    try {
      await api.delete(`/matieres/${deleteId}`);
      fetchMatieres();
      notify.success('Matière supprimée.');
      modal('deleteModal').hide();
    } catch (err) {
      notify.error(errorMessage(err, 'Erreur lors de la suppression.'));
    } finally {
      setLoadingDeleteId(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoadingSubmit(true);
    try {
      if (selected) {
        await api.put(`/matieres/${selected.id}`, form);
        notify.success('Matière modifiée.');
      } else {
        await api.post('/matieres', form);
        notify.success('Matière ajoutée.');
      }
      fetchMatieres();
      modal(selected ? 'editModal' : 'addModal').hide();
      setForm(FORMULAIRE_VIDE);
      setSelected(null);
    } catch (err) {
      notify.error(errorMessage(err, "Erreur lors de l'enregistrement."));
    } finally {
      setLoadingSubmit(false);
    }
  };

  // ---------- Fiche détail ----------
  const detailAJour = detail && (matieres.find((m) => m.id === detail.id) || detail);
  const voisines = detailAJour
    ? matieres.filter((m) => m.id_niveau === detailAJour.id_niveau && (m.id_semestre ?? null) === (detailAJour.id_semestre ?? null))
    : [];
  const coefSemestre = voisines.reduce((s, m) => s + (Number(m.coefficient) || 0), 0);
  const poids = coefSemestre > 0 ? Math.round(((Number(detailAJour?.coefficient) || 0) * 100) / coefSemestre) : 0;
  const heuresSemestre = voisines.reduce((s, m) => s + (Number(m.heures) || 0), 0);
  const libelleSemestre = detailAJour?.semestre?.semestre || 'Hors semestre';

  const matiereFields = [
    { name: 'matiere', label: 'Matière', required: true, placeholder: 'ex. Philosophie morale' },
    { name: 'code_matiere', label: 'Code matière', optional: true, placeholder: 'ex. PHM',
      help: 'Utile pour importer les notes par fichier (NOTES_CODE_L1_S1_2025-2026.xlsx). Un même code peut servir à plusieurs niveaux, mais pas deux fois dans le même niveau et le même semestre. Sans « _ ».' },
    {
      name: 'id_niveau',
      label: 'Niveau',
      type: 'select',
      options: onglets.map((n) => ({ value: n.id, label: n.niveau })),
      required: true,
    },
    {
      name: 'id_semestre',
      label: 'Semestre',
      type: 'select',
      options: semestres.map((s) => ({ value: s.id, label: `${s.code_semestre} · ${s.semestre}` })),
      required: true,
    },
    { name: 'coefficient', label: 'Coefficient', type: 'number', required: true, placeholder: 'ex. 2' },
    { name: 'heures', label: "Volume horaire (heures)", type: 'number', required: true, placeholder: 'ex. 30' },
  ];

  const tableHeaders = [
    { label: 'Matière', field: 'matiere' },
    { label: 'Code', field: 'code_matiere' },
    { label: 'Coef.', field: 'coefficient' },
    { label: 'Heures', field: 'heures' },
    { label: 'Semestre', field: 'semestre' },
  ];

  const chargement = loading || onglets.length === 0;

  return (
    <div className="container-xxl flex-grow-1 container-p-y">
      <h4 className="fw-bold py-3 mb-4">
        <span className="text-muted fw-light text-capitalize">{role} /</span> Matières
      </h4>

      {/* 🔹 Sélecteur de niveau */}
      <ul className="nav nav-pills mb-3">
        {onglets.length === 0
          ? [0, 1, 2].map((i) => (
              <li className="nav-item me-2" key={i}>
                <span className="gstf-squelette" style={{ width: '7.5rem', height: '2.4rem' }} />
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

      <div className="card">
        <h5 className="card-header">
          Liste des matières{niveauCourant && ` en ${niveauCourant.niveau}`}
          {!chargement && (
            <small className="text-muted fw-normal ms-2">
              · {filtresActifs ? `${filtered.length} sur ${duNiveau.length}` : duNiveau.length} matière{duNiveau.length > 1 ? 's' : ''}
            </small>
          )}
        </h5>

        {role === 'admin' && (
          <div className="mb-3 ms-4">
            <button className="btn btn-primary me-2" onClick={ouvrirAjout}>
              Nouvelle matière
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
          role="admin"
          loading={chargement}
          skeletonRows={6}
          onRowClick={ouvrirDetail}
          onEdit={ouvrirModification}
          onDelete={ouvrirSuppression}
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

        {!chargement && filtered.length === 0 && (
          <div className="gstf-empty">
            {filtresActifs ? (
              <>
                <i className="bx bx-search-alt d-block"></i>
                Aucune matière ne correspond à ces critères en {niveauCourant?.niveau}.
                <div className="mt-3">
                  <button type="button" className="btn btn-sm btn-outline-primary" onClick={effacerFiltres}>Effacer les filtres</button>
                </div>
              </>
            ) : (
              <>
                <i className="bx bx-book-open d-block"></i>
                Aucune matière en {niveauCourant?.niveau} pour le moment.
                {role === 'admin' && (
                  <div className="mt-3">
                    <button type="button" className="btn btn-sm btn-primary" onClick={ouvrirAjout}>Ajouter une matière</button>
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

      {/* Fiche détail d'une matière */}
      <div className="modal fade" id="detailModal" tabIndex="-1" aria-labelledby="detailMatiereTitre" aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content">
            {detailAJour && (
              <>
                <div className="modal-header gstf-fiche__entete">
                  <div className="min-w-0">
                    <div className="d-flex flex-wrap gap-2 mb-2">
                      <span className="badge bg-primary">{detailAJour.niveau?.niveau}</span>
                      <span className="badge bg-label-secondary">{libelleSemestre}</span>
                      {detailAJour.code_matiere
                        ? <span className="badge bg-label-primary">Code {detailAJour.code_matiere}</span>
                        : <span className="badge bg-label-warning">Sans code</span>}
                    </div>
                    <h4 className="modal-title mb-0" id="detailMatiereTitre">{detailAJour.matiere}</h4>
                  </div>
                  <button type="button" className="btn-close align-self-start" data-bs-dismiss="modal" aria-label="Fermer"></button>
                </div>

                <div className="modal-body">
                  <div className="gstf-fiche__chiffres">
                    <div>
                      <span>Coefficient</span>
                      <strong>{detailAJour.coefficient ?? '—'}</strong>
                    </div>
                    <div>
                      <span>Volume horaire</span>
                      <strong>{detailAJour.heures ? `${detailAJour.heures} h` : '—'}</strong>
                    </div>
                    <div>
                      <span>Poids dans le semestre</span>
                      <strong>{poids} %</strong>
                      <div className="gstf-bar mt-2" role="presentation"><span style={{ width: `${poids}%` }}></span></div>
                    </div>
                  </div>

                  {!detailAJour.code_matiere && (
                    <p className="small text-muted mt-3 mb-0">
                      <i className="bx bx-info-circle me-1"></i>
                      Sans code, les notes de cette matière se saisissent à la main : l'import par fichier n'est pas possible.
                    </p>
                  )}

                  <h6 className="gstf-section-title mt-4 mb-2">
                    {libelleSemestre} · {detailAJour.niveau?.niveau}
                    <small className="text-muted fw-normal ms-2">
                      {voisines.length} matière{voisines.length > 1 ? 's' : ''} · {coefSemestre} coef. · {heuresSemestre} h
                    </small>
                  </h6>
                  <ul className="list-unstyled mb-0 gstf-fiche__liste">
                    {[...voisines].sort((a, b) => a.matiere.localeCompare(b.matiere)).map((m) => (
                      <li key={m.id}>
                        <button
                          type="button"
                          className={`gstf-fiche__ligne ${m.id === detailAJour.id ? 'is-active' : ''}`}
                          onClick={() => setDetail(m)}
                          aria-current={m.id === detailAJour.id || undefined}
                        >
                          <span className="text-truncate">{m.matiere}</span>
                          <span className="text-muted small text-nowrap">coef. {m.coefficient}{m.heures ? ` · ${m.heures} h` : ''}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="modal-footer">
                  {role === 'admin' && (
                    <button type="button" className="btn btn-outline-danger me-auto" onClick={() => depuisDetail(() => ouvrirSuppression(detailAJour.id))}>
                      <i className="bx bx-trash me-1"></i>Supprimer
                    </button>
                  )}
                  <button type="button" className="btn btn-outline-secondary" data-bs-dismiss="modal">Fermer</button>
                  {role === 'admin' && (
                    <button type="button" className="btn btn-primary" onClick={() => depuisDetail(() => ouvrirModification(detailAJour))}>
                      <i className="bx bx-edit me-1"></i>Modifier
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

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

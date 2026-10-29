import React, { useEffect, useMemo, useState } from 'react';
import api, { errorMessage } from '../../api/client';
import { useFeedback } from '../../contexts/FeedbackContext';
import { useAnnee } from '../../contexts/AnneeContext';
import { useNiveau } from '../../contexts/NiveauContext';
import useDerniereRequete from '../../hooks/useDerniereRequete';
import { confirmerAvecCode } from '../../utils/confirmation';
import { trierNiveaux } from '../../utils/niveaux';
import SearchBar from '../../components/SearchBar';
import StatutResultat from '../../components/StatutResultat';

// Assistant de réinscription : passage des étudiants d'une année académique à la suivante.
// Le serveur propose une décision par étudiant (Validé → niveau suivant ou diplômé, Rattrapage → redoublement,
// notes incomplètes → redoublement « à vérifier ») ; l'administration corrige si besoin, puis enregistre tout d'un coup.
// Le compte de connexion ne change pas : même email, même mot de passe.

const DEPARTS = { abandon: 'Abandon', transfere: 'Transféré', exclu: 'Exclu' };
const normaliser = (texte) => String(texte ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const anneeSuivante = (annee) => {
  const m = /^(\d{4})-(\d{4})$/.exec(annee || '');
  return m ? `${Number(m[1]) + 1}-${Number(m[2]) + 1}` : '';
};
const pluriel = (n, mot, motPluriel = `${mot}s`) => `${n} ${n > 1 ? motPluriel : mot}`;
const initiales = (nom = '') =>
  nom.split(/\s+/).filter(Boolean).slice(0, 2).map((m) => m[0].toUpperCase()).join('') || '?';

// La page est démontée à chaque navigation : ce qui doit survivre au retour (années choisies, niveau,
// propositions et décisions déjà corrigées) est gardé ici, tant que l'onglet reste ouvert.
const memoire = { sourceId: '', cibleId: '', filtreNiveau: '', propositions: {} };
const cleDe = (source, cible) => `${source}>${cible}`;

// Nouvelle réponse du serveur : on garde les corrections faites à la main,
// sauf si la proposition a changé entre-temps (notes ajoutées, étudiant inscrit ailleurs…).
const fusionner = (fraiches, anciennes = []) => fraiches.map((p) => {
  const ligne = { ...p, choix: p.decision, niveauChoisi: p.niveau_cible, motif: '' };
  const avant = anciennes.find((a) => a.parcours_id === p.parcours_id);
  if (!avant || p.deja_inscrit || avant.decision !== p.decision || avant.niveau_cible !== p.niveau_cible) return ligne;
  return { ...ligne, choix: avant.choix, niveauChoisi: avant.niveauChoisi, motif: avant.motif };
});

// Filtres par décision (affichage seulement)
const FILTRES = [
  { valeur: '', libelle: 'Tous' },
  { valeur: 'passage', libelle: 'Passage' },
  { valeur: 'redoublement', libelle: 'Redoublement' },
  { valeur: 'diplome', libelle: 'Diplômé' },
  { valeur: 'depart', libelle: 'Départ' },
  { valeur: 'a_verifier', libelle: 'À vérifier', icone: 'bx-error-circle' },
  { valeur: 'modifie', libelle: 'Corrigées', icone: 'bx-edit-alt' },
  { valeur: 'deja', libelle: 'Déjà inscrits', icone: 'bx-check' },
];
const correspond = (l, filtre) => {
  switch (filtre) {
    case '': return true;
    case 'deja': return Boolean(l.deja_inscrit);
    case 'a_verifier': return !l.deja_inscrit && l.a_verifier;
    case 'modifie': return !l.deja_inscrit && l.choix !== l.decision;
    case 'depart': return !l.deja_inscrit && Boolean(DEPARTS[l.choix]);
    default: return !l.deja_inscrit && l.choix === filtre;
  }
};

const Reinscription = () => {
  const { notify, confirm } = useFeedback();
  const { annees: anneesListe, fetchAnnees, loading: anneesEnCours, erreur: erreurAnnees } = useAnnee();
  const { niveaux: niveauxListe, fetchNiveaux, loading: niveauxEnCours, erreur: erreurNiveaux } = useNiveau();
  // Années et niveaux : sans eux, impossible de proposer quoi que ce soit (ex. serveur arrêté au chargement)
  const referencesEnCours = anneesEnCours || niveauxEnCours;
  const erreurReferences = erreurAnnees || erreurNiveaux;
  const rechargerReferences = () => {
    if (erreurAnnees) fetchAnnees();
    if (erreurNiveaux) fetchNiveaux();
  };
  const niveaux = trierNiveaux(niveauxListe);
  const nomNiveau = (id) => niveauxListe.find((n) => n.id === id)?.niveau || '—';

  // Années les plus récentes d'abord ; par défaut : avant-dernière → dernière
  const annees = useMemo(() => [...anneesListe].sort((a, b) => b.annee_aca.localeCompare(a.annee_aca)), [anneesListe]);
  const [sourceId, setSourceId] = useState(memoire.sourceId);
  // Par défaut : la plus récente année dont l'année suivante existe déjà
  useEffect(() => {
    if (sourceId || annees.length === 0) return;
    const prete = annees.find((a) => annees.some((b) => b.annee_aca === anneeSuivante(a.annee_aca)));
    setSourceId(String((prete || annees[0]).id));
  }, [annees, sourceId]);

  // Pas de saut d'année : l'arrivée est toujours l'année qui suit immédiatement (2025-2026 → 2026-2027)
  const source = annees.find((a) => String(a.id) === sourceId);
  const suivante = source ? anneeSuivante(source.annee_aca) : '';
  const cible = annees.find((a) => a.annee_aca === suivante);
  const cibleId = cible ? String(cible.id) : '';
  const anneeACreer = source && !cible ? suivante : '';
  const choisirSource = setSourceId;

  // ---------- Propositions ----------
  // null = rien chargé ; décisions modifiables par ligne. Au retour sur la page : la dernière liste, tout de suite.
  const [lignes, setLignes] = useState(() => memoire.propositions[cleDe(memoire.sourceId, memoire.cibleId)] ?? null);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [enregistrement, setEnregistrement] = useState(false);
  const [bilan, setBilan] = useState(null);
  const nouvelleRequete = useDerniereRequete();

  const cle = cleDe(sourceId, cibleId);
  const charger = async () => {
    if (!sourceId || !cibleId) {
      setLignes(null);
      return;
    }
    // Déjà vue : affichée tout de suite, puis mise à jour en arrière-plan
    const enMemoire = memoire.propositions[cle];
    setLignes(enMemoire ?? null);
    const signal = nouvelleRequete();
    setChargement(true);
    setErreur(null);
    try {
      const res = await api.get('/reinscriptions', { params: { source: sourceId, cible: cibleId }, signal });
      setLignes((actuelles) => fusionner(res.data.propositions, actuelles ?? enMemoire));
    } catch (err) {
      if (err.code === 'ERR_CANCELED') return;
      if (enMemoire) {
        notify.error(errorMessage(err, "La liste n'a pas pu être actualisée."));
        return;
      }
      setLignes(null);
      setErreur(errorMessage(err, 'Impossible de préparer les réinscriptions.'));
    } finally {
      if (!signal.aborted) setChargement(false);
    }
  };
  useEffect(() => {
    setBilan(null);
    charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceId, cibleId]);

  // Garde l'état pour le prochain retour sur la page
  useEffect(() => {
    memoire.sourceId = sourceId;
    memoire.cibleId = cibleId;
    if (lignes && sourceId && cibleId) memoire.propositions[cle] = lignes;
  }, [sourceId, cibleId, cle, lignes]);

  const modifier = (parcoursId, patch) =>
    setLignes((liste) => liste.map((l) => (l.parcours_id === parcoursId ? { ...l, ...patch } : l)));

  const libelleDecision = (l) => ({
    passage: `passage en ${nomNiveau(l.niveau_cible)}`,
    redoublement: 'redoublement',
    diplome: 'diplômé',
    ignorer: 'ne rien faire',
  }[l.decision] || DEPARTS[l.decision]?.toLowerCase() || l.decision);

  const choisirDecision = (ligne, choix) => {
    const niveauChoisi = choix === 'passage' ? ligne.niveau_suivant : choix === 'redoublement' ? ligne.niveau.id : null;
    modifier(ligne.parcours_id, { choix, niveauChoisi });
  };

  // ---------- Filtres ----------
  const [recherche, setRecherche] = useState('');
  const [filtreNiveau, setFiltreNiveauEtat] = useState(memoire.filtreNiveau);
  const setFiltreNiveau = (v) => { memoire.filtreNiveau = v; setFiltreNiveauEtat(v); };
  const [filtreDecision, setFiltreDecision] = useState('');
  const terme = normaliser(recherche);
  const visibles = (lignes || []).filter((l) =>
    (!filtreNiveau || String(l.niveau.id) === filtreNiveau)
    && correspond(l, filtreDecision)
    && (!terme || [l.etudiant.nom_prenom, l.etudiant.matricule].some((v) => normaliser(v).includes(terme))));
  // Un intertitre par niveau, dans l'ordre des niveaux
  const groupes = niveaux
    .map((n) => ({ niveau: n, lignes: visibles.filter((l) => l.niveau.id === n.id) }))
    .filter((g) => g.lignes.length > 0);
  const horsNiveaux = visibles.filter((l) => !niveaux.some((n) => n.id === l.niveau.id));
  if (horsNiveaux.length > 0) groupes.push({ niveau: { id: 'autre', niveau: 'Autre' }, lignes: horsNiveaux });
  const parNiveau = (id) => (lignes || []).filter((l) => l.niveau.id === id).length;

  // ---------- Bilan avant enregistrement ----------
  // Périmètre de l'enregistrement : le niveau sélectionné, sinon tous les niveaux.
  // (La recherche et « à vérifier seulement » ne servent qu'à l'affichage.)
  const niveauChoisi = niveaux.find((n) => String(n.id) === filtreNiveau);
  const perimetre = (lignes || []).filter((l) => !filtreNiveau || String(l.niveau.id) === filtreNiveau);
  const aTraiter = perimetre.filter((l) => !l.deja_inscrit);
  const compte = (choix) => aTraiter.filter((l) => l.choix === choix).length;
  const departs = aTraiter.filter((l) => DEPARTS[l.choix]).length;
  const aVerifier = aTraiter.filter((l) => l.a_verifier).length;
  const compteFiltre = (f) => perimetre.filter((l) => correspond(l, f)).length;
  const aEnregistrer = aTraiter.filter((l) => l.choix !== 'ignorer');

  const creerAnnee = async () => {
    const ok = await confirm({
      title: `Créer l'année ${anneeACreer} ?`,
      message: "Elle sera ajoutée aux années académiques et proposée partout : programme, notes, emplois du temps et réinscriptions.",
      confirmLabel: "Créer l'année",
    });
    if (!ok) return;
    try {
      const res = await api.post('/annee_aca', { annee_aca: anneeACreer });
      await fetchAnnees(); // l'année créée devient automatiquement l'année d'arrivée
      notify.success(res.data.message);
    } catch (err) {
      notify.error(errorMessage(err, "Impossible de créer l'année."));
    }
  };

  const enregistrer = async () => {
    const resume = [
      compte('passage') && pluriel(compte('passage'), 'passage'),
      compte('redoublement') && pluriel(compte('redoublement'), 'redoublement'),
      compte('diplome') && pluriel(compte('diplome'), 'diplômé'),
      departs && pluriel(departs, 'départ'),
    ].filter(Boolean).join(' · ');
    let code;
    try {
      code = await confirmerAvecCode(confirm, 'reinscrire', {
        title: `Enregistrer les réinscriptions${niveauChoisi ? ` de ${niveauChoisi.niveau}` : ''} en ${cible?.annee_aca} ?`,
        message: `${resume}.\nLes départs désactivent le compte des étudiants concernés.`,
        confirmLabel: 'Enregistrer',
      });
    } catch (err) {
      notify.error(errorMessage(err, "Impossible d'obtenir un code de confirmation."));
    }
    if (!code) return;

    setEnregistrement(true);
    try {
      const res = await api.post('/reinscriptions', {
        source: sourceId,
        cible: cibleId,
        code_confirmation: code,
        decisions: aEnregistrer.map((l) => ({
          parcours_id: l.parcours_id,
          decision: l.choix,
          niveau_cible: ['passage', 'redoublement'].includes(l.choix) ? l.niveauChoisi : null,
          motif: l.motif.trim() || null,
        })),
      });
      setBilan(res.data.bilan);
      notify.success(res.data.message);
      charger();
    } catch (err) {
      notify.error(errorMessage(err, "Les réinscriptions n'ont pas pu être enregistrées."));
    } finally {
      setEnregistrement(false);
    }
  };

  return (
    <div className="container-xxl flex-grow-1 container-p-y">
      <div className="gstf-page-header">
        <div>
          <h4 className="fw-bold mb-1">
            <span className="text-muted fw-light">Administration /</span> Réinscriptions
          </h4>
          <small className="text-muted">Passage des étudiants à l'année suivante. Leur compte ne change pas : même email, même mot de passe.</small>
        </div>
      </div>

      {/* Années */}
      <div className="card mb-4">
        <div className="card-body d-flex flex-wrap align-items-end gap-3">
          <div>
            <label className="form-label" htmlFor="reinscription-source">Année terminée</label>
            <select id="reinscription-source" className="form-select" value={sourceId} onChange={(e) => choisirSource(e.target.value)}>
              {annees.map((a) => <option key={a.id} value={String(a.id)}>{a.annee_aca}</option>)}
            </select>
          </div>
          <i className="bx bx-right-arrow-alt fs-3 text-muted mb-1" aria-hidden="true"></i>
          <div>
            <label className="form-label" htmlFor="reinscription-cible">Nouvelle année</label>
            {/* Fixée : toujours l'année qui suit (pas de saut d'année) */}
            <input id="reinscription-cible" type="text" className="form-control" readOnly
              value={cible ? cible.annee_aca : `${suivante || '…'} (à créer)`}
              title="Les étudiants passent toujours dans l'année qui suit immédiatement" />
          </div>
          {anneeACreer && (
            <button type="button" className="btn btn-outline-primary" onClick={creerAnnee}>
              <i className="bx bx-plus me-1"></i>Créer l'année {anneeACreer}
            </button>
          )}
        </div>
      </div>

      {bilan && (
        <div className="card mb-4" role="status">
          <div className="card-body gstf-stat align-items-start">
            <div className="gstf-stat__icon" aria-hidden="true"><i className="bx bx-check-double"></i></div>
            <div>
              <strong className="d-block text-body mb-1">Réinscriptions enregistrées en {cible?.annee_aca}</strong>
              <span className="text-muted">
                {[
                  pluriel(bilan.passage, 'passage'),
                  pluriel(bilan.redoublement, 'redoublement'),
                  pluriel(bilan.diplome, 'diplômé'),
                  pluriel(bilan.abandon + bilan.transfere + bilan.exclu, 'départ'),
                  bilan.deja_inscrits ? pluriel(bilan.deja_inscrits, 'déjà inscrit') : null,
                ].filter(Boolean).join(' · ')}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Un onglet par niveau : il délimite aussi ce qui sera enregistré */}
      {lignes && lignes.length > 0 && (
        <ul className="nav nav-pills mb-3 gap-1" role="tablist" aria-label="Niveau">
          {[{ id: '', niveau: 'Tous les niveaux' }, ...niveaux].filter((n) => !n.id || parNiveau(n.id) > 0).map((n) => (
            <li className="nav-item" key={n.id || 'tous'}>
              <button type="button" role="tab" aria-selected={filtreNiveau === String(n.id)}
                className={`nav-link d-flex align-items-center gap-2 ${filtreNiveau === String(n.id) ? 'active' : ''}`}
                onClick={() => setFiltreNiveau(String(n.id))}>
                {n.niveau}
                <span className="gstf-onglet__compteur">{n.id ? parNiveau(n.id) : lignes.length}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="card">
        <div className="card-header d-flex flex-wrap align-items-center justify-content-between gap-2">
          <div>
            <h5 className="card-title mb-0">
              Étudiants de {source?.annee_aca || '…'}{niveauChoisi && ` · ${niveauChoisi.niveau}`}
            </h5>
            {lignes && <small className="text-muted">{pluriel(perimetre.length, 'étudiant')} · {aTraiter.length} à traiter</small>}
          </div>
          {chargement && lignes ? (
            <small className="text-muted d-inline-flex align-items-center gap-2" role="status">
              <span className="spinner-border spinner-border-sm" aria-hidden="true"></span>Actualisation…
            </small>
          ) : lignes && (
            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={charger}>
              <i className="bx bx-refresh me-1" aria-hidden="true"></i>Actualiser
            </button>
          )}
        </div>

        {lignes && lignes.length > 0 && (
          <div className="card-body pt-0 pb-3">
            <div className="gstf-filtres">
              <SearchBar className="gstf-filtres__recherche" searchTerm={recherche} onSearchChange={setRecherche} placeholder="Rechercher un nom ou un matricule…" />
            </div>
            <div className="gstf-puces mt-3" role="group" aria-label="Filtrer par décision">
              {FILTRES.map((f) => {
                const n = f.valeur ? compteFiltre(f.valeur) : perimetre.length;
                if (f.valeur && n === 0 && filtreDecision !== f.valeur) return null;
                return (
                  <button key={f.valeur || 'tous'} type="button" aria-pressed={filtreDecision === f.valeur}
                    className={`gstf-puce${filtreDecision === f.valeur ? ' is-actif' : ''}`}
                    onClick={() => setFiltreDecision(f.valeur)}>
                    {f.icone && <i className={`bx ${f.icone}`} aria-hidden="true"></i>}
                    {f.libelle}<span className="gstf-puce__compteur">{n}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {erreurReferences ? (
          <div className="gstf-empty">
            <i className="bx bx-error-circle d-block"></i>
            <p className="mb-3">{erreurReferences}</p>
            <button type="button" className="btn btn-sm btn-outline-primary" onClick={rechargerReferences}>Réessayer</button>
          </div>
        ) : referencesEnCours || (annees.length > 0 && !sourceId) ? (
          <div className="p-4" aria-busy="true">
            <span className="visually-hidden" role="status">Chargement…</span>
            {[0, 1, 2, 3, 4].map((i) => <span key={i} className="gstf-squelette d-block mb-3" style={{ height: '2.5rem' }} aria-hidden="true" />)}
          </div>
        ) : annees.length === 0 ? (
          <div className="gstf-empty">
            <i className="bx bx-calendar d-block"></i>
            Aucune année académique. Créez-en une dans Années académiques.
          </div>
        ) : !cibleId ? (
          <div className="gstf-empty">
            <i className="bx bx-calendar-plus d-block"></i>
            Créez d'abord l'année {anneeACreer || 'suivante'} pour y inscrire les étudiants.
          </div>
        ) : erreur ? (
          <div className="gstf-empty">
            <i className="bx bx-error-circle d-block"></i>
            <p className="mb-3">{erreur}</p>
            <button type="button" className="btn btn-sm btn-outline-primary" onClick={charger}>Réessayer</button>
          </div>
        ) : chargement && !lignes ? (
          <div className="p-4" aria-busy="true">
            <span className="visually-hidden" role="status">Calcul des résultats…</span>
            {[0, 1, 2, 3, 4].map((i) => <span key={i} className="gstf-squelette d-block mb-3" style={{ height: '2.5rem' }} aria-hidden="true" />)}
          </div>
        ) : lignes && lignes.length === 0 ? (
          <div className="gstf-empty">
            <i className="bx bx-user-check d-block"></i>
            Aucun étudiant à réinscrire depuis {source?.annee_aca}.
          </div>
        ) : lignes && (
          <div className="table-responsive">
            <table className="table mb-0 gstf-reinscription" aria-busy={chargement}>
              <colgroup>
                <col />
                <col className="gstf-reinscription__col-resultat" />
                <col className="gstf-reinscription__col-decision" />
                <col className="gstf-reinscription__col-cible" />
              </colgroup>
              <thead>
                <tr>
                  <th scope="col">Étudiant</th>
                  <th scope="col">Résultat {source?.annee_aca}</th>
                  <th scope="col">Décision</th>
                  <th scope="col">En {cible?.annee_aca}</th>
                </tr>
              </thead>
              {groupes.map((g) => (
                <tbody key={g.niveau.id}>
                  {!filtreNiveau && (
                    <tr className="gstf-reinscription__groupe">
                      <th scope="rowgroup" colSpan={4}>
                        {g.niveau.niveau}<span>{pluriel(g.lignes.length, 'étudiant')}</span>
                      </th>
                    </tr>
                  )}
                  {g.lignes.map((l) => {
                    const corrigee = !l.deja_inscrit && l.choix !== l.decision;
                    const classes = [
                      l.deja_inscrit || l.choix === 'ignorer' ? 'is-neutre' : '',
                      corrigee ? 'is-corrigee' : '',
                    ].filter(Boolean).join(' ');
                    return (
                      <tr key={l.parcours_id} className={classes || undefined}>
                        <td>
                          <span className="d-flex align-items-center gap-2 min-w-0">
                            <span className="gstf-reinscription__avatar" aria-hidden="true">{initiales(l.etudiant.nom_prenom)}</span>
                            <span className="min-w-0">
                              <strong className="d-block text-body text-truncate">{l.etudiant.nom_prenom}</strong>
                              <small className="text-muted">{l.etudiant.matricule}</small>
                            </span>
                          </span>
                        </td>
                        <td>
                          <span className="d-flex align-items-center gap-2 flex-wrap">
                            <span className="gstf-reinscription__moyenne">
                              {l.moyenne === null ? '—' : Number(l.moyenne).toFixed(2)}
                            </span>
                            <StatutResultat statut={l.resultat} attente="Incomplet" />
                          </span>
                          {l.a_verifier && !l.deja_inscrit && (
                            <small className="gstf-reinscription__alerte" title="Toutes les notes ne sont pas saisies : la proposition est à confirmer">
                              <i className="bx bx-error-circle" aria-hidden="true"></i>{l.notes.saisies} / {l.notes.total} notes · à vérifier
                            </small>
                          )}
                        </td>
                        <td>
                          {l.deja_inscrit ? (
                            <span className="gstf-reinscription__fait"><i className="bx bx-check" aria-hidden="true"></i>Déjà inscrit</span>
                          ) : (
                            <>
                              <select className="form-select form-select-sm" value={l.choix} onChange={(e) => choisirDecision(l, e.target.value)}
                                aria-label={`Décision pour ${l.etudiant.nom_prenom}`}>
                                {l.niveau_suivant && <option value="passage">Passage en {nomNiveau(l.niveau_suivant)}</option>}
                                <option value="redoublement">Redoublement</option>
                                <option value="diplome">Diplômé</option>
                                <optgroup label="Départ">
                                  {Object.entries(DEPARTS).map(([v, lib]) => <option key={v} value={v}>{lib}</option>)}
                                </optgroup>
                                <option value="ignorer">Ne rien faire</option>
                              </select>
                              {corrigee && (
                                <button type="button" className="gstf-reinscription__retablir"
                                  onClick={() => modifier(l.parcours_id, { choix: l.decision, niveauChoisi: l.niveau_cible, motif: '' })}>
                                  <i className="bx bx-undo" aria-hidden="true"></i>Proposé : {libelleDecision(l)}
                                </button>
                              )}
                            </>
                          )}
                        </td>
                        <td>
                          {l.deja_inscrit ? (
                            <span className="gstf-reinscription__trajet">
                              {l.niveau.niveau}<i className="bx bx-right-arrow-alt" aria-hidden="true"></i><strong>{l.deja_inscrit.niveau}</strong>
                            </span>
                          ) : ['passage', 'redoublement'].includes(l.choix) ? (
                            // Niveau imposé par la décision : passage = niveau suivant, redoublement = même niveau
                            <span className="gstf-reinscription__trajet">
                              {l.niveau.niveau}<i className="bx bx-right-arrow-alt" aria-hidden="true"></i>
                              <strong>{nomNiveau(l.niveauChoisi)}</strong>
                            </span>
                          ) : DEPARTS[l.choix] ? (
                            <input type="text" className="form-control form-control-sm" placeholder="Motif (facultatif)" maxLength={500}
                              value={l.motif} onChange={(e) => modifier(l.parcours_id, { motif: e.target.value })}
                              aria-label={`Motif du départ de ${l.etudiant.nom_prenom}`} />
                          ) : (
                            <span className="text-muted small">
                              {l.choix === 'diplome' ? <><i className="bx bxs-graduation me-1" aria-hidden="true"></i>Fin de cycle</> : 'Pas inscrit'}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              ))}
              {visibles.length === 0 && (
                <tbody>
                  <tr><td colSpan={4} className="text-center text-muted py-4">Aucun étudiant ne correspond à ces critères.</td></tr>
                </tbody>
              )}
            </table>
          </div>
        )}

        {lignes && aEnregistrer.length > 0 && (
          <div className="card-footer d-flex flex-wrap align-items-center justify-content-between gap-2 gstf-reinscription__pied">
            <small className="text-muted">
              {aVerifier > 0 ? `${pluriel(aVerifier, 'étudiant')} à vérifier avant d'enregistrer.` : 'Vérifiez les décisions, puis enregistrez.'}
            </small>
            <button type="button" className="btn btn-primary" onClick={enregistrer} disabled={enregistrement || chargement}>
              {enregistrement
                ? 'Enregistrement…'
                : `Enregistrer ${pluriel(aEnregistrer.length, 'décision')}${niveauChoisi ? ` de ${niveauChoisi.niveau}` : ''}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reinscription;

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

const Reinscription = () => {
  const { notify, confirm } = useFeedback();
  const { annees: anneesListe, fetchAnnees } = useAnnee();
  const { niveaux: niveauxListe } = useNiveau();
  const niveaux = trierNiveaux(niveauxListe);
  const nomNiveau = (id) => niveauxListe.find((n) => n.id === id)?.niveau || '—';

  // Années les plus récentes d'abord ; par défaut : avant-dernière → dernière
  const annees = useMemo(() => [...anneesListe].sort((a, b) => b.annee_aca.localeCompare(a.annee_aca)), [anneesListe]);
  const [sourceId, setSourceId] = useState('');
  const [cibleId, setCibleId] = useState('');
  useEffect(() => {
    if (sourceId || annees.length === 0) return;
    setSourceId(String((annees[1] || annees[0]).id));
    if (annees.length > 1) setCibleId(String(annees[0].id));
  }, [annees, sourceId]);

  const source = annees.find((a) => String(a.id) === sourceId);
  const ciblesPossibles = annees.filter((a) => source && a.annee_aca > source.annee_aca).reverse();
  const anneeACreer = source && !annees.some((a) => a.annee_aca === anneeSuivante(source.annee_aca)) ? anneeSuivante(source.annee_aca) : '';

  // Changement d'année de départ : l'arrivée la plus proche
  const choisirSource = (id) => {
    setSourceId(id);
    const s = annees.find((a) => String(a.id) === id);
    const suivante = annees.filter((a) => s && a.annee_aca > s.annee_aca).sort((a, b) => a.annee_aca.localeCompare(b.annee_aca))[0];
    setCibleId(suivante ? String(suivante.id) : '');
  };

  // ---------- Propositions ----------
  const [lignes, setLignes] = useState(null); // null = rien chargé ; décisions modifiables par ligne
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [enregistrement, setEnregistrement] = useState(false);
  const [bilan, setBilan] = useState(null);
  const nouvelleRequete = useDerniereRequete();

  const charger = async () => {
    if (!sourceId || !cibleId) {
      setLignes(null);
      return;
    }
    const signal = nouvelleRequete();
    setChargement(true);
    setErreur(null);
    try {
      const res = await api.get('/reinscriptions', { params: { source: sourceId, cible: cibleId }, signal });
      setLignes(res.data.propositions.map((p) => ({ ...p, choix: p.decision, niveauChoisi: p.niveau_cible, motif: '' })));
    } catch (err) {
      if (err.code === 'ERR_CANCELED') return;
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

  const modifier = (parcoursId, patch) =>
    setLignes((liste) => liste.map((l) => (l.parcours_id === parcoursId ? { ...l, ...patch } : l)));

  const choisirDecision = (ligne, choix) => {
    const niveauChoisi = choix === 'passage' ? ligne.niveau_suivant : choix === 'redoublement' ? ligne.niveau.id : null;
    modifier(ligne.parcours_id, { choix, niveauChoisi });
  };

  // ---------- Filtres ----------
  const [recherche, setRecherche] = useState('');
  const [filtreNiveau, setFiltreNiveau] = useState('');
  const [aVerifierSeulement, setAVerifierSeulement] = useState(false);
  const terme = normaliser(recherche);
  const visibles = (lignes || []).filter((l) =>
    (!filtreNiveau || String(l.niveau.id) === filtreNiveau)
    && (!aVerifierSeulement || l.a_verifier)
    && (!terme || [l.etudiant.nom_prenom, l.etudiant.matricule].some((v) => normaliser(v).includes(terme))));

  // ---------- Bilan avant enregistrement ----------
  // Périmètre de l'enregistrement : le niveau sélectionné, sinon tous les niveaux.
  // (La recherche et « à vérifier seulement » ne servent qu'à l'affichage.)
  const niveauChoisi = niveaux.find((n) => String(n.id) === filtreNiveau);
  const perimetre = (lignes || []).filter((l) => !filtreNiveau || String(l.niveau.id) === filtreNiveau);
  const aTraiter = perimetre.filter((l) => !l.deja_inscrit);
  const compte = (choix) => aTraiter.filter((l) => l.choix === choix).length;
  const departs = aTraiter.filter((l) => DEPARTS[l.choix]).length;
  const aVerifier = aTraiter.filter((l) => l.a_verifier).length;
  const dejaInscrits = perimetre.length - aTraiter.length;
  const aEnregistrer = aTraiter.filter((l) => l.choix !== 'ignorer');
  const cible = annees.find((a) => String(a.id) === cibleId);

  const creerAnnee = async () => {
    try {
      const res = await api.post('/annee_aca', { annee_aca: anneeACreer });
      await fetchAnnees();
      setCibleId(String(res.data.annee.id));
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
            <select id="reinscription-cible" className="form-select" value={cibleId} onChange={(e) => setCibleId(e.target.value)}
              disabled={ciblesPossibles.length === 0}>
              {ciblesPossibles.length === 0 && <option value="">Aucune année après {source?.annee_aca}</option>}
              {ciblesPossibles.map((a) => <option key={a.id} value={String(a.id)}>{a.annee_aca}</option>)}
            </select>
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

      <div className="card">
        <div className="card-header">
          <h5 className="card-title mb-1">Étudiants de {source?.annee_aca || '…'}</h5>
          {lignes && (
            <small className="text-muted">
              {[
                pluriel(compte('passage'), 'passage'),
                pluriel(compte('redoublement'), 'redoublement'),
                pluriel(compte('diplome'), 'diplômé'),
                departs ? pluriel(departs, 'départ') : null,
                dejaInscrits ? pluriel(dejaInscrits, 'déjà inscrit') : null,
              ].filter(Boolean).join(' · ')}
            </small>
          )}
        </div>

        {lignes && lignes.length > 0 && (
          <div className="card-body pt-0 pb-3">
            <div className="gstf-filtres">
              <SearchBar className="gstf-filtres__recherche" searchTerm={recherche} onSearchChange={setRecherche} placeholder="Rechercher un étudiant…" />
              <div className="d-flex flex-wrap align-items-center gap-3">
                <select className="form-select w-auto" value={filtreNiveau} onChange={(e) => setFiltreNiveau(e.target.value)} aria-label="Filtrer par niveau">
                  <option value="">Tous les niveaux</option>
                  {niveaux.map((n) => <option key={n.id} value={String(n.id)}>{n.niveau}</option>)}
                </select>
                {aVerifier > 0 && (
                  <div className="form-check mb-0">
                    <input className="form-check-input" type="checkbox" id="a-verifier" checked={aVerifierSeulement}
                      onChange={(e) => setAVerifierSeulement(e.target.checked)} />
                    <label className="form-check-label" htmlFor="a-verifier">À vérifier seulement ({aVerifier})</label>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {!cibleId ? (
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
              <thead>
                <tr>
                  <th scope="col">Étudiant</th>
                  <th scope="col">Niveau</th>
                  <th scope="col">Résultat</th>
                  <th scope="col">Décision</th>
                  <th scope="col">En {cible?.annee_aca}</th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((l) => (
                  <tr key={l.parcours_id} className={l.deja_inscrit || l.choix === 'ignorer' ? 'gstf-reinscription__neutre' : undefined}>
                    <td>
                      <strong className="d-block text-body">{l.etudiant.nom_prenom}</strong>
                      <small className="text-muted">{l.etudiant.matricule}</small>
                    </td>
                    <td>{l.niveau.niveau}</td>
                    <td className="text-nowrap">
                      <span className="d-flex align-items-center gap-2">
                        <span className="fw-semibold">{l.moyenne === null ? '—' : Number(l.moyenne).toFixed(2)}</span>
                        <StatutResultat statut={l.resultat} attente="Incomplet" />
                      </span>
                      {l.a_verifier && (
                        <small className="text-muted d-block" title="Toutes les notes ne sont pas saisies : la proposition est à confirmer">
                          <i className="bx bx-error-circle me-1"></i>{l.notes.saisies} / {l.notes.total} notes · à vérifier
                        </small>
                      )}
                    </td>
                    <td>
                      {l.deja_inscrit ? (
                        <span className="text-muted small">Déjà inscrit</span>
                      ) : (
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
                      )}
                    </td>
                    <td>
                      {l.deja_inscrit ? (
                        <span className="small">{l.deja_inscrit.niveau}</span>
                      ) : ['passage', 'redoublement'].includes(l.choix) ? (
                        <select className="form-select form-select-sm" value={l.niveauChoisi ?? ''}
                          onChange={(e) => modifier(l.parcours_id, { niveauChoisi: Number(e.target.value) })}
                          aria-label={`Niveau en ${cible?.annee_aca} pour ${l.etudiant.nom_prenom}`}>
                          {niveaux.map((n) => <option key={n.id} value={n.id}>{n.niveau}</option>)}
                        </select>
                      ) : DEPARTS[l.choix] ? (
                        <input type="text" className="form-control form-control-sm" placeholder="Motif (facultatif)" maxLength={500}
                          value={l.motif} onChange={(e) => modifier(l.parcours_id, { motif: e.target.value })}
                          aria-label={`Motif du départ de ${l.etudiant.nom_prenom}`} />
                      ) : (
                        <span className="text-muted small">{l.choix === 'diplome' ? 'Fin de cycle' : '—'}</span>
                      )}
                    </td>
                  </tr>
                ))}
                {visibles.length === 0 && (
                  <tr><td colSpan={5} className="text-center text-muted py-4">Aucun étudiant ne correspond à ces critères.</td></tr>
                )}
              </tbody>
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

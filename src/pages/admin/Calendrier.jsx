import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useCalendrier } from '../../contexts/CalendrierContext';
import api, { errorMessage } from '../../api/client';
import { useFeedback } from '../../contexts/FeedbackContext';
import {
  SEMESTRES, dateEvenement, periodeSemestre, calendrierAffiche, anneeSuivante, aujourdhui, situationAnnee, dateCourte, lendemain, dateLongue,
  dureeJours, dans, pastille, moisAnnee, horsSemestre, normaliser,
} from '../../utils/calendrier';

const CLE_PASSES = 'gstf.calendrier.masquerPasses';
const lirePreference = () => {
  try {
    return localStorage.getItem(CLE_PASSES) === '1';
  } catch (e) {
    return false;
  }
};

// Calendrier académique du site vitrine (projet_gseminaire_frontend, bouton calendrier).
// Un calendrier par année : saisi en brouillon, puis publié. Le site affiche le plus récent des calendriers
// publiés et se met à jour en direct. Chaque écriture renvoie le calendrier complet, qui remplace celui de la liste.

const TYPES = [
  { valeur: 'jour', libelle: 'Un jour' },
  { valeur: 'du', libelle: 'Une période', aide: 'Du … au …' },
  { valeur: 'et', libelle: 'Deux jours', aide: '… et …' },
];
const EVENEMENT_VIDE = { semestre: 1, type: 'jour', date_debut: '', date_fin: '', libelle: '' };
const BORNES_VIDES = { s1_debut: '', s1_fin: '', s2_debut: '', s2_fin: '' };
const TEMPS = { 'en-cours': 'En cours', 'a-venir': 'À venir', terminee: 'Terminée', vide: 'À compléter' };

const modal = (id) => window.bootstrap.Modal.getOrCreateInstance(document.getElementById(id));
const majusculeInitiale = (texte) => texte.charAt(0).toUpperCase() + texte.slice(1);

// Termes recherchés surlignés dans l'intitulé (comparaison sans accents ni majuscules)
const surligner = (texte, recherche) => {
  const terme = normaliser(recherche);
  if (!terme) return texte;
  const i = normaliser(texte).indexOf(terme);
  if (i < 0) return texte;
  return <>{texte.slice(0, i)}<mark>{texte.slice(i, i + terme.length)}</mark>{texte.slice(i + terme.length)}</>;
};

const Calendrier = () => {
  const { notify, confirm } = useFeedback();
  const { calendriers, setCalendriers, loading } = useCalendrier();

  const [choisiId, setChoisiId] = useState(null);
  const [evenement, setEvenement] = useState(EVENEMENT_VIDE);
  const [enEdition, setEnEdition] = useState(null); // événement modifié (null = nouveau)
  const [nouvelle, setNouvelle] = useState({ annee: '', copier: true });
  const [bornes, setBornes] = useState(BORNES_VIDES);
  const [enCours, setEnCours] = useState(false);
  const [recherche, setRecherche] = useState('');
  const [masquerPasses, setMasquerPasses] = useState(lirePreference);
  const [recent, setRecent] = useState(null); // événement tout juste enregistré, mis en évidence
  const champDate = useRef(null);
  const listeAnnees = useRef(null);
  const minuterieRecent = useRef(null);

  useEffect(() => {
    try {
      localStorage.setItem(CLE_PASSES, masquerPasses ? '1' : '0');
    } catch (e) {
      // stockage indisponible : préférence gardée le temps de la visite
    }
  }, [masquerPasses]);
  useEffect(() => () => clearTimeout(minuterieRecent.current), []);

  const signalerRecent = (id) => {
    clearTimeout(minuterieRecent.current);
    setRecent(id);
    minuterieRecent.current = setTimeout(() => setRecent(null), 2600);
    // Une fois la liste mise à jour, l'événement est amené à l'écran
    requestAnimationFrame(() => document.querySelector(`[data-evenement="${id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
  };

  const tries = useMemo(() => [...calendriers].sort((a, b) => b.annee.localeCompare(a.annee)), [calendriers]);
  const affiche = calendrierAffiche(calendriers);
  const calendrier = tries.find((c) => c.id === choisiId) || affiche || tries[0] || null;
  const today = aujourdhui();

  // À l'arrivée : le calendrier affiché sur le site (sinon le plus récent)
  useEffect(() => {
    if (!choisiId && calendrier) setChoisiId(calendrier.id);
  }, [choisiId, calendrier]);

  const remplacer = (cal) => setCalendriers((liste) =>
    liste.some((c) => c.id === cal.id) ? liste.map((c) => (c.id === cal.id ? cal : c)) : [cal, ...liste]
  );

  const statut = (cal) => {
    if (affiche?.id === cal.id) return { variante: 'site', texte: 'Affiché sur le site' };
    if (cal.publie) return { variante: 'cache', texte: 'Publié, non affiché', aide: `Le site affiche le calendrier ${affiche?.annee}, plus récent.` };
    return { variante: 'brouillon', texte: 'Brouillon' };
  };

  // Sélecteur d'années : la tuile choisie reste visible ; flèches, Début et Fin pour passer d'une année à l'autre
  const choisir = (id, focus = false) => {
    setChoisiId(id);
    const tuile = listeAnnees.current?.querySelector(`[data-id="${id}"]`);
    tuile?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    if (focus) tuile?.focus();
  };
  const naviguerAnnees = (e) => {
    const rang = tries.findIndex((c) => c.id === calendrier?.id);
    const cible = { ArrowRight: rang + 1, ArrowLeft: rang - 1, Home: 0, End: tries.length - 1 }[e.key];
    if (cible === undefined || !tries[cible]) return;
    e.preventDefault();
    choisir(tries[cible].id, true);
  };

  // ---------- Nouvelle année ----------
  const ouvrirNouvelle = () => {
    setNouvelle({ annee: anneeSuivante(tries[0]?.annee) || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`, copier: tries.length > 0 });
    modal('calNouvelleModal').show();
  };

  const creer = async (e) => {
    e.preventDefault();
    setEnCours(true);
    try {
      const res = await api.post('/calendriers', { annee: nouvelle.annee.trim(), ...(nouvelle.copier && tries[0] && { copier_de: tries[0].id }) });
      remplacer(res.data);
      setChoisiId(res.data.id);
      modal('calNouvelleModal').hide();
      notify.success(nouvelle.copier && tries[0]
        ? `Calendrier ${res.data.annee} créé en brouillon : vérifiez les dates reprises de ${tries[0].annee}.`
        : `Calendrier ${res.data.annee} créé en brouillon.`);
    } catch (err) {
      notify.error(errorMessage(err, 'Erreur lors de la création.'));
    } finally {
      setEnCours(false);
    }
  };

  // ---------- Calendrier : bornes, publication, suppression ----------
  const ouvrirBornes = () => {
    setBornes(Object.fromEntries(Object.keys(BORNES_VIDES).map((k) => [k, calendrier[k] || ''])));
    modal('calBornesModal').show();
  };

  const enregistrerBornes = async (e) => {
    e.preventDefault();
    setEnCours(true);
    try {
      const donnees = Object.fromEntries(Object.entries(bornes).map(([k, v]) => [k, v || null]));
      remplacer((await api.put(`/calendriers/${calendrier.id}`, donnees)).data);
      modal('calBornesModal').hide();
      notify.success('Dates des semestres enregistrées.');
    } catch (err) {
      notify.error(errorMessage(err, "Erreur lors de l'enregistrement."));
    } finally {
      setEnCours(false);
    }
  };

  const basculerPublication = async () => {
    const publier = !calendrier.publie;
    const plusRecent = publier && affiche && affiche.annee > calendrier.annee;
    const ok = await confirm(publier
      ? {
        title: `Publier le calendrier ${calendrier.annee} ?`,
        message: plusRecent
          ? `Il restera caché : le site affiche le calendrier ${affiche.annee}, plus récent.`
          : `Il remplacera ${affiche ? `le calendrier ${affiche.annee}` : 'le calendrier actuel'} sur le site, immédiatement visible par tous les visiteurs.`,
        confirmLabel: 'Publier',
      }
      : {
        title: `Retirer le calendrier ${calendrier.annee} du site ?`,
        message: 'Il redevient un brouillon. Le site affichera le plus récent des autres calendriers publiés, s’il y en a.',
        confirmLabel: 'Retirer du site',
        danger: true,
      });
    if (!ok) return;
    try {
      remplacer((await api.put(`/calendriers/${calendrier.id}`, { publie: publier })).data);
      notify.success(publier ? `Calendrier ${calendrier.annee} publié.` : `Calendrier ${calendrier.annee} retiré du site.`);
    } catch (err) {
      notify.error(errorMessage(err, 'Erreur lors de la publication.'));
    }
  };

  const supprimerCalendrier = async () => {
    const ok = await confirm({
      title: `Supprimer le calendrier ${calendrier.annee} ?`,
      message: `Ses ${calendrier.evenements.length} événement(s) seront supprimés${affiche?.id === calendrier.id ? ' et il disparaîtra du site' : ''}. Cette action est définitive.`,
      confirmLabel: 'Supprimer',
      danger: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/calendriers/${calendrier.id}`);
      setCalendriers((liste) => liste.filter((c) => c.id !== calendrier.id));
      setChoisiId(null);
      notify.success(`Calendrier ${calendrier.annee} supprimé.`);
    } catch (err) {
      notify.error(errorMessage(err, 'Erreur lors de la suppression.'));
    }
  };

  // ---------- Événements ----------
  // ev : événement à modifier ; modele : événement à dupliquer (nouvel événement prérempli)
  const ouvrirEvenement = (semestre, ev = null, modele = null) => {
    const source = ev || modele;
    setEnEdition(ev);
    setEvenement(source
      ? { semestre: source.semestre, type: source.date_fin ? source.liaison : 'jour', date_debut: source.date_debut, date_fin: source.date_fin || '', libelle: source.libelle }
      : { ...EVENEMENT_VIDE, semestre });
    modal('calEvenementModal').show();
  };

  const changer = (champ, valeur) => setEvenement((f) => ({ ...f, [champ]: valeur }));
  const surDeuxDates = evenement.type !== 'jour';
  // « Deux jours » : toujours deux jours consécutifs, le second est le lendemain du premier
  const finCalculee = evenement.type === 'et' ? lendemain(evenement.date_debut) : evenement.date_fin;
  const apercu = {
    date_debut: evenement.date_debut,
    date_fin: surDeuxDates ? finCalculee : null,
    liaison: surDeuxDates ? evenement.type : null,
  };
  const evenementValide = evenement.date_debut && evenement.libelle.trim()
    && (!surDeuxDates || (finCalculee && finCalculee > evenement.date_debut));
  // Période de deux jours consécutifs : « Deux jours » s'affiche mieux sur le site (« Vendredi 6 et samedi 7 février »)
  const dansSemestre = (numero, iso) => {
    const debut = calendrier?.[`s${numero}_debut`];
    const fin = calendrier?.[`s${numero}_fin`];
    return Boolean(debut && fin && iso >= debut && iso <= fin);
  };
  const semestreSuggere = evenement.date_debut && !dansSemestre(evenement.semestre, evenement.date_debut)
    ? SEMESTRES.find((s) => s.numero !== evenement.semestre && dansSemestre(s.numero, evenement.date_debut))?.numero ?? null
    : null;
  const periodeDeDeuxJours = evenement.type === 'du' && evenement.date_fin && evenement.date_fin === lendemain(evenement.date_debut);

  const enregistrerEvenement = async (e, encore = false) => {
    e.preventDefault();
    if (!evenementValide) return;
    setEnCours(true);
    const donnees = { semestre: evenement.semestre, libelle: evenement.libelle.trim(), ...apercu };
    try {
      const res = enEdition
        ? await api.put(`/calendrier-evenements/${enEdition.id}`, donnees)
        : await api.post(`/calendriers/${calendrier.id}/evenements`, donnees);
      remplacer(res.data);
      // Nouvel événement : celui dont l'identifiant est le plus grand
      signalerRecent(enEdition ? enEdition.id : Math.max(...res.data.evenements.map((ev) => ev.id)));
      const message = enEdition ? 'Événement modifié.' : 'Événement ajouté.';
      if (encore) {
        // Saisie à la suite : même semestre et même type, champs vidés
        setEvenement((f) => ({ ...f, date_debut: '', date_fin: '', libelle: '' }));
        champDate.current?.focus();
        notify.success(`${message} Saisissez le suivant.`);
      } else {
        modal('calEvenementModal').hide();
        notify.success(calendrier.publie && affiche?.id === calendrier.id ? `${message} Le site est à jour.` : message);
      }
    } catch (err) {
      notify.error(errorMessage(err, "Erreur lors de l'enregistrement."));
    } finally {
      setEnCours(false);
    }
  };

  const supprimerEvenement = async (ev) => {
    const ok = await confirm({
      title: `Supprimer « ${ev.libelle} » ?`,
      message: `${dateEvenement(ev)}. Cette action est définitive.`,
      confirmLabel: 'Supprimer',
      danger: true,
    });
    if (!ok) return;
    try {
      remplacer((await api.delete(`/calendrier-evenements/${ev.id}`)).data);
      notify.success('Événement supprimé.');
    } catch (err) {
      notify.error(errorMessage(err, 'Erreur lors de la suppression.'));
    }
  };

  // ---------- Vue de l'année choisie ----------
  const terme = normaliser(recherche);
  const filtreActif = Boolean(terme) || masquerPasses;
  const estAujourdhui = (ev) => ev.date_debut <= today && (ev.date_fin || ev.date_debut) >= today;
  const evenementsAnnee = calendrier?.evenements || [];
  const nbPasses = evenementsAnnee.filter((ev) => (ev.date_fin || ev.date_debut) < today).length;
  const prochain = evenementsAnnee.find((ev) => (ev.date_fin || ev.date_debut) >= today) || null;
  const evenementsFiltres = evenementsAnnee.filter((ev) =>
    (!masquerPasses || (ev.date_fin || ev.date_debut) >= today)
    && (!terme || normaliser(`${ev.libelle} ${dateEvenement(ev)} ${moisAnnee(ev.date_debut)}`).includes(terme))
  );

  // Amène un événement à l'écran (depuis « Prochain événement »), en levant les filtres qui le cacheraient
  const allerA = (ev) => {
    setRecherche('');
    signalerRecent(ev.id);
  };

  // ---------- Rendu ----------
  return (
    <div className="container-xxl flex-grow-1 container-p-y">
      <div className="gstf-page-header">
        <div>
          <h4 className="fw-bold mb-1">
            <span className="text-muted fw-light">Administration /</span> Calendrier académique
          </h4>
          <small className="text-muted">Affiché sur le site du séminaire (bouton calendrier). Le site affiche le plus récent des calendriers publiés.</small>
        </div>
      </div>

      {loading ? (
        <div className="gstf-cal-annees mb-4" aria-busy="true">
          <span className="visually-hidden" role="status">Chargement des calendriers…</span>
          {[0, 1, 2].map((i) => <span key={i} className="gstf-squelette" style={{ height: '8.5rem', borderRadius: '0.75rem' }} aria-hidden="true" />)}
        </div>
      ) : !calendrier ? (
        <div className="card">
          <div className="gstf-empty">
            <i className="bx bx-calendar d-block"></i>
            Aucun calendrier académique n'est encore saisi.
            <div className="mt-3">
              <button type="button" className="btn btn-sm btn-primary" onClick={ouvrirNouvelle}>Créer le calendrier</button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Années */}
          <div className="d-flex align-items-baseline justify-content-between gap-2 mb-2">
            <h6 className="mb-0 text-muted text-uppercase small fw-semibold" id="cal-annees-titre">Années académiques</h6>
            <small className="text-muted d-none d-md-inline">← → pour changer d'année</small>
          </div>
          <div className="gstf-cal-annees mb-4" role="tablist" aria-labelledby="cal-annees-titre" ref={listeAnnees} onKeyDown={naviguerAnnees}>
            {tries.map((c) => {
              const s = statut(c);
              const situation = situationAnnee(c, today);
              const actif = c.id === calendrier.id;
              const nb = c.evenements.length;
              return (
                <button key={c.id} type="button" role="tab" aria-selected={actif} tabIndex={actif ? 0 : -1} data-id={c.id}
                  className={`gstf-cal-annee gstf-cal-annee--${s.variante} ${actif ? 'is-active' : ''}`} onClick={() => choisir(c.id)}>
                  <span className="gstf-cal-annee__haut">
                    <span className="gstf-cal-annee__annee">{c.annee}</span>
                    <span className={`gstf-cal-annee__temps gstf-cal-annee__temps--${situation.temps}`}>{TEMPS[situation.temps]}</span>
                  </span>

                  <span className="gstf-cal-statut">
                    <span className="gstf-cal-statut__point" aria-hidden="true"></span>{s.texte}
                  </span>

                  {situation.temps === 'en-cours' && (
                    <span className="gstf-cal-annee__barre" title={`Année écoulée à ${Math.round(situation.progression * 100)} %`}>
                      <span style={{ width: `${Math.round(situation.progression * 100)}%` }}></span>
                    </span>
                  )}

                  <span className="gstf-cal-annee__meta">
                    <span><i className="bx bx-list-ul" aria-hidden="true"></i>{nb ? `${nb} événement${nb > 1 ? 's' : ''}` : 'Aucun événement'}</span>
                    {situation.prochain && situation.temps !== 'terminee' && (
                      <span className="gstf-cal-annee__prochain" title={`Prochain : ${dateEvenement(situation.prochain)} — ${situation.prochain.libelle}`}>
                        <i className="bx bx-right-arrow-circle" aria-hidden="true"></i>
                        <strong>{dateCourte(situation.prochain.date_debut)}</strong>&nbsp;{situation.prochain.libelle}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
            <button type="button" className="gstf-cal-annee gstf-cal-annee--ajout" onClick={ouvrirNouvelle} tabIndex={-1}>
              <i className="bx bx-plus-circle" aria-hidden="true"></i>
              <span>Nouvelle année</span>
              {tries[0] && <small>{anneeSuivante(tries[0].annee)}</small>}
            </button>
          </div>

          {/* Calendrier choisi : actions et résumé */}
          <div className="card mb-4">
            <div className="card-body">
              <div className="d-flex flex-wrap align-items-center gap-3">
                <div className="flex-grow-1 min-w-0">
                  <h5 className="mb-1 d-flex flex-wrap align-items-center gap-2">
                    Année {calendrier.annee}
                    <span className={`gstf-cal-statut gstf-cal-statut--${statut(calendrier).variante}`}>
                      <span className="gstf-cal-statut__point" aria-hidden="true"></span>{statut(calendrier).texte}
                    </span>
                  </h5>
                  <small className="text-muted">
                    {statut(calendrier).aide || (calendrier.publie ? 'Les modifications apparaissent aussitôt sur le site.' : 'Invisible sur le site tant qu’il n’est pas publié.')}
                  </small>
                </div>
                <div className="d-flex flex-wrap gap-2">
                  <button type="button" className="btn btn-outline-secondary" onClick={ouvrirBornes}>
                    <i className="bx bx-calendar-check me-1"></i>Dates des semestres
                  </button>
                  <button type="button" className="btn btn-outline-secondary gstf-cal-supprimer" onClick={supprimerCalendrier} title="Supprimer ce calendrier">
                    <i className="bx bx-trash"></i><span className="visually-hidden">Supprimer</span>
                  </button>
                  <button type="button" className={`btn ${calendrier.publie ? 'btn-outline-secondary' : 'btn-primary'}`} onClick={basculerPublication}>
                    <i className={`bx ${calendrier.publie ? 'bx-hide' : 'bx-globe'} me-1`}></i>
                    {calendrier.publie ? 'Retirer du site' : 'Publier sur le site'}
                  </button>
                </div>
              </div>

              <dl className="gstf-cal-chiffres">
                <div>
                  <dt>Événements</dt>
                  <dd>{calendrier.evenements.length}</dd>
                </div>
                <div>
                  <dt>À venir</dt>
                  <dd>{calendrier.evenements.length - nbPasses}</dd>
                </div>
                <div>
                  <dt>Passés</dt>
                  <dd>{nbPasses}</dd>
                </div>
                <div className="gstf-cal-chiffres__prochain">
                  <dt>Prochain événement</dt>
                  {prochain ? (
                    <dd>
                      <button type="button" className="gstf-cal-lien" onClick={() => allerA(prochain)} title="Afficher dans la liste">
                        <span className="gstf-cal-chiffres__quand">
                          {estAujourdhui(prochain) ? "Aujourd'hui" : majusculeInitiale(dans(prochain.date_debut, today))}
                        </span>
                        <span className="text-truncate">{dateCourte(prochain.date_debut)} · {prochain.libelle}</span>
                      </button>
                    </dd>
                  ) : (
                    <dd className="text-muted fw-normal fs-6">{calendrier.evenements.length ? 'Année terminée' : 'Aucun événement'}</dd>
                  )}
                </div>
              </dl>
            </div>
          </div>

          {/* Recherche et filtre */}
          {calendrier.evenements.length > 0 && (
            <div className="gstf-cal-outils mb-3">
              <div className="input-group input-group-merge gstf-cal-recherche">
                <span className="input-group-text"><i className="bx bx-search" aria-hidden="true"></i></span>
                <input type="search" className="form-control" placeholder="Rechercher un événement (intitulé, mois…)" aria-label="Rechercher un événement"
                  value={recherche} onChange={(e) => setRecherche(e.target.value)} onKeyDown={(e) => e.key === 'Escape' && setRecherche('')} />
              </div>
              <div className="form-check form-switch mb-0">
                <input className="form-check-input" type="checkbox" role="switch" id="cal-masquer-passes"
                  checked={masquerPasses} onChange={(e) => setMasquerPasses(e.target.checked)} />
                <label className="form-check-label text-nowrap" htmlFor="cal-masquer-passes">
                  Masquer les passés{nbPasses > 0 && <span className="text-muted"> ({nbPasses})</span>}
                </label>
              </div>
              {filtreActif && (
                <small className="text-muted ms-md-auto" role="status">
                  {evenementsFiltres.length} sur {calendrier.evenements.length} affiché{evenementsFiltres.length > 1 ? 's' : ''}
                  {terme && (
                    <button type="button" className="btn btn-link btn-sm p-0 ms-2 align-baseline" onClick={() => setRecherche('')}>Effacer</button>
                  )}
                </small>
              )}
            </div>
          )}

          <div className="row g-4">
            {SEMESTRES.map(({ numero, titre }) => {
              const tous = calendrier.evenements.filter((e) => e.semestre === numero);
              const evenements = evenementsFiltres.filter((e) => e.semestre === numero);
              const periode = periodeSemestre(calendrier, numero);
              let moisPrecedent = null;
              return (
                <div key={numero} className="col-12 col-xl-6">
                  <div className="card h-100">
                    <div className="card-header d-flex align-items-start gap-2">
                      <div className="flex-grow-1 min-w-0">
                        <h5 className="mb-1 d-flex align-items-center gap-2">
                          {titre}
                          <span className="badge rounded-pill gstf-badge-neutre">{filtreActif ? `${evenements.length} / ${tous.length}` : tous.length}</span>
                        </h5>
                        <small className="text-muted">
                          {periode ? periode.texte : 'Dates à définir'}
                          {periode?.deduite && (
                            <button type="button" className="btn btn-link btn-sm p-0 ms-1 align-baseline" onClick={ouvrirBornes}
                              title="Déduites des événements : cliquez pour les préciser">(à préciser)</button>
                          )}
                        </small>
                      </div>
                      <button type="button" className="btn btn-sm btn-outline-primary text-nowrap" onClick={() => ouvrirEvenement(numero)}>
                        <i className="bx bx-plus me-1"></i>Ajouter
                      </button>
                    </div>

                    {tous.length === 0 ? (
                      <div className="gstf-empty py-4">
                        <i className="bx bx-calendar-plus d-block"></i>
                        Aucun événement pour ce semestre.
                        <div className="mt-3">
                          <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => ouvrirEvenement(numero)}>Ajouter le premier événement</button>
                        </div>
                      </div>
                    ) : evenements.length === 0 ? (
                      <div className="gstf-empty py-4">
                        <i className={`bx ${terme ? 'bx-search-alt' : 'bx-check-double'} d-block`}></i>
                        {terme ? `Aucun événement ne correspond à « ${recherche} ».` : 'Tous les événements de ce semestre sont passés.'}
                      </div>
                    ) : (
                      <ul className="gstf-cal-liste">
                        {evenements.map((ev) => {
                          const mois = ev.date_debut.slice(0, 7);
                          const separateur = mois !== moisPrecedent;
                          moisPrecedent = mois;
                          const passe = (ev.date_fin || ev.date_debut) < today;
                          const auj = estAujourdhui(ev);
                          const estProchain = !auj && prochain?.id === ev.id;
                          const duree = dureeJours(ev);
                          const hors = horsSemestre(calendrier, ev);
                          const p = pastille(ev.date_debut);
                          return (
                            <React.Fragment key={ev.id}>
                              {separateur && <li className="gstf-cal-mois" aria-hidden="true">{moisAnnee(ev.date_debut)}</li>}
                              <li data-evenement={ev.id}
                                className={`gstf-cal-evenement${passe ? ' is-passe' : ''}${auj ? ' is-aujourdhui' : ''}${estProchain ? ' is-prochain' : ''}${recent === ev.id ? ' is-recent' : ''}`}
                                onClick={(e) => !e.target.closest('button') && ouvrirEvenement(numero, ev)}>
                                <span className="gstf-cal-pastille" aria-hidden="true">
                                  <span className="gstf-cal-pastille__jour">{p.jour}</span>
                                  <span className="gstf-cal-pastille__mois">{p.mois}</span>
                                </span>
                                <div className="min-w-0 flex-grow-1">
                                  <div className="gstf-cal-evenement__date">{dateEvenement(ev)}</div>
                                  <div className="gstf-cal-evenement__libelle">{surligner(ev.libelle, recherche)}</div>
                                  {(auj || estProchain || duree > 1 || hors) && (
                                    <div className="gstf-cal-evenement__badges">
                                      {auj && <span className="badge gstf-cal-badge-accent"><i className="bx bx-radio-circle-marked me-1" aria-hidden="true"></i>Aujourd'hui</span>}
                                      {estProchain && <span className="badge gstf-cal-badge-accent"><i className="bx bx-right-arrow-alt me-1" aria-hidden="true"></i>Prochain · {dans(ev.date_debut, today)}</span>}
                                      {duree > 1 && <span className="badge gstf-badge-neutre">{duree} jours</span>}
                                      {hors && (
                                        <span className="badge gstf-badge-neutre" title="En dehors des dates saisies pour ce semestre">
                                          <i className="bx bx-error me-1 gstf-cal-alerte" aria-hidden="true"></i>Hors du semestre
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                                <div className="gstf-cal-evenement__actions">
                                  <button type="button" className="btn btn-sm btn-icon btn-outline-secondary" onClick={() => ouvrirEvenement(numero, ev)} title="Modifier" aria-label={`Modifier « ${ev.libelle} »`}>
                                    <i className="bx bx-edit"></i>
                                  </button>
                                  <button type="button" className="btn btn-sm btn-icon btn-outline-secondary" onClick={() => ouvrirEvenement(numero, null, ev)} title="Dupliquer" aria-label={`Dupliquer « ${ev.libelle} »`}>
                                    <i className="bx bx-copy"></i>
                                  </button>
                                  <button type="button" className="btn btn-sm btn-icon btn-outline-secondary gstf-cal-supprimer" onClick={() => supprimerEvenement(ev)} title="Supprimer" aria-label={`Supprimer « ${ev.libelle} »`}>
                                    <i className="bx bx-trash"></i>
                                  </button>
                                </div>
                              </li>
                            </React.Fragment>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Événement : ajout et modification */}
      <div className="modal fade" id="calEvenementModal" tabIndex="-1" aria-labelledby="calEvenementTitre" aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered">
          <form className="modal-content gstf-cal-modal" onSubmit={(e) => enregistrerEvenement(e)} noValidate>
            <div className="modal-header">
              <div className="min-w-0">
                <h5 className="modal-title" id="calEvenementTitre">{enEdition ? "Modifier l'événement" : 'Nouvel événement'}</h5>
                {calendrier && <small className="text-muted">Calendrier {calendrier.annee}</small>}
              </div>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Fermer"></button>
            </div>
            <div className="modal-body">
              <fieldset className="mb-3">
                <legend className="gstf-cal-champ">Semestre</legend>
                <div className="gstf-segment" role="radiogroup" aria-label="Semestre">
                  {SEMESTRES.map(({ numero, titre }) => (
                    <label key={numero} className="gstf-segment__option">
                      <input type="radio" name="cal-semestre" value={numero}
                        checked={evenement.semestre === numero} onChange={() => changer('semestre', numero)} />
                      <span>{titre}</span>
                    </label>
                  ))}
                </div>
                {semestreSuggere && (
                  <div className="form-text mt-2">
                    <i className="bx bx-info-circle me-1" aria-hidden="true"></i>
                    Cette date tombe dans le {SEMESTRES.find((s) => s.numero === semestreSuggere).titre.toLowerCase()}.{' '}
                    <button type="button" className="btn btn-link btn-sm p-0 align-baseline" onClick={() => changer('semestre', semestreSuggere)}>Le choisir</button>
                  </div>
                )}
              </fieldset>

              <fieldset className="mb-3">
                <legend className="gstf-cal-champ">Durée</legend>
                <div className="gstf-segment" role="radiogroup" aria-label="Durée">
                  {TYPES.map((t) => (
                    <label key={t.valeur} className="gstf-segment__option">
                      <input type="radio" name="cal-type" value={t.valeur}
                        checked={evenement.type === t.valeur} onChange={() => changer('type', t.valeur)} />
                      <span>
                        {t.libelle}
                        <small>{t.aide || 'Une seule date'}</small>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="row g-3 mb-3">
                <div className={surDeuxDates ? 'col-6' : 'col-12'}>
                  <label className="gstf-cal-champ" htmlFor="cal-date-debut">{surDeuxDates ? (evenement.type === 'du' ? 'Du' : 'Premier jour') : 'Date'}</label>
                  <input ref={champDate} id="cal-date-debut" type="date" className="form-control" required
                    value={evenement.date_debut} onChange={(e) => changer('date_debut', e.target.value)} />
                </div>
                {evenement.type === 'du' && (
                  <div className="col-6">
                    <label className="gstf-cal-champ" htmlFor="cal-date-fin">Au</label>
                    <input id="cal-date-fin" type="date" className={`form-control ${evenement.date_fin && evenement.date_debut && evenement.date_fin <= evenement.date_debut ? 'is-invalid' : ''}`}
                      required min={lendemain(evenement.date_debut) || undefined}
                      value={evenement.date_fin} onChange={(e) => changer('date_fin', e.target.value)} />
                    <div className="invalid-feedback">Doit suivre la première date.</div>
                  </div>
                )}
                {evenement.type === 'et' && (
                  <div className="col-6">
                    <span className="gstf-cal-champ" id="cal-second-jour">Second jour</span>
                    <div className="form-control gstf-cal-second-jour" aria-labelledby="cal-second-jour" aria-live="polite">
                      {evenement.date_debut ? dateLongue(finCalculee) : <span className="text-muted">Le lendemain</span>}
                    </div>
                  </div>
                )}
                {evenement.type === 'et' && (
                  <div className="col-12 form-text mt-1">
                    Le second jour est toujours le lendemain du premier. Pour plus de jours, choisissez « Une période ».
                  </div>
                )}
                {periodeDeDeuxJours && (
                  <div className="col-12 form-text mt-1">
                    Ces dates se suivent : choisissez plutôt{' '}
                    <button type="button" className="btn btn-link btn-sm p-0 align-baseline" onClick={() => changer('type', 'et')}>« Deux jours »</button>
                    {' '}pour afficher « {dateEvenement({ date_debut: evenement.date_debut, date_fin: evenement.date_fin, liaison: 'et' })} ».
                  </div>
                )}
              </div>

              <div className="mb-4">
                <div className="d-flex justify-content-between align-items-baseline">
                  <label className="gstf-cal-champ" htmlFor="cal-libelle">Intitulé</label>
                  {evenement.libelle.length > 200 && <small className="text-muted">{evenement.libelle.length} / 255</small>}
                </div>
                <input id="cal-libelle" type="text" className="form-control" maxLength={255} required
                  placeholder="ex. Examens semestriels"
                  value={evenement.libelle} onChange={(e) => changer('libelle', e.target.value)} />
              </div>

              <div className="gstf-cal-apercu" aria-live="polite">
                <span className="gstf-cal-apercu__titre"><i className="bx bx-show me-1" aria-hidden="true"></i>Aperçu sur le site</span>
                {evenement.date_debut || evenement.libelle.trim() ? (
                  <>
                    <div className="gstf-cal-apercu__date">{evenement.date_debut ? dateEvenement(apercu) : 'Date à choisir'}</div>
                    <div className="gstf-cal-apercu__libelle">{evenement.libelle.trim() || 'Intitulé à saisir'}</div>
                  </>
                ) : (
                  <div className="text-muted small">Choisissez une date et saisissez l'intitulé.</div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" data-bs-dismiss="modal">Annuler</button>
              {!enEdition && (
                <button type="button" className="btn btn-outline-secondary" disabled={enCours || !evenementValide} onClick={(e) => enregistrerEvenement(e, true)}>
                  Ajouter et continuer
                </button>
              )}
              <button type="submit" className="btn btn-primary" disabled={enCours || !evenementValide}>
                {enCours ? 'Patientez…' : enEdition ? 'Enregistrer' : 'Ajouter'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Nouvelle année */}
      <div className="modal fade" id="calNouvelleModal" tabIndex="-1" aria-labelledby="calNouvelleTitre" aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered">
          <form className="modal-content gstf-cal-modal" onSubmit={creer} noValidate>
            <div className="modal-header">
              <h5 className="modal-title" id="calNouvelleTitre">Nouveau calendrier</h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Fermer"></button>
            </div>
            <div className="modal-body">
              <label className="gstf-cal-champ" htmlFor="cal-annee">Année académique</label>
              <input id="cal-annee" type="text" className="form-control" required placeholder="2026-2027" pattern="\d{4}-\d{4}"
                value={nouvelle.annee} onChange={(e) => setNouvelle((n) => ({ ...n, annee: e.target.value }))} />
              {tries[0] && (
                <div className="form-check mt-3">
                  <input id="cal-copier" type="checkbox" className="form-check-input"
                    checked={nouvelle.copier} onChange={(e) => setNouvelle((n) => ({ ...n, copier: e.target.checked }))} />
                  <label className="form-check-label" htmlFor="cal-copier">
                    Reprendre les événements de {tries[0].annee}
                    <small className="d-block text-muted">Dates décalées d'un an, à vérifier (les jours de la semaine changent).</small>
                  </label>
                </div>
              )}
              <div className="form-text mt-3">Le calendrier est créé en brouillon : il n'apparaît sur le site qu'une fois publié.</div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" data-bs-dismiss="modal">Annuler</button>
              <button type="submit" className="btn btn-primary" disabled={enCours || !/^\d{4}-\d{4}$/.test(nouvelle.annee.trim())}>
                {enCours ? 'Patientez…' : 'Créer'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Dates des semestres */}
      <div className="modal fade" id="calBornesModal" tabIndex="-1" aria-labelledby="calBornesTitre" aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered">
          <form className="modal-content gstf-cal-modal" onSubmit={enregistrerBornes} noValidate>
            <div className="modal-header">
              <h5 className="modal-title" id="calBornesTitre">
                Dates des semestres{calendrier && <small className="text-muted fw-normal ms-2">{calendrier.annee}</small>}
              </h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Fermer"></button>
            </div>
            <div className="modal-body">
              {SEMESTRES.map(({ numero, titre }) => (
                <fieldset key={numero} className="mb-3">
                  <legend className="fs-6 fw-semibold mb-2">{titre}</legend>
                  <div className="row g-3">
                    {['debut', 'fin'].map((borne) => {
                      const cle = `s${numero}_${borne}`;
                      return (
                        <div key={borne} className="col-6">
                          <label className="gstf-cal-champ" htmlFor={`cal-${cle}`}>{borne === 'debut' ? 'Début' : 'Fin'}</label>
                          <input id={`cal-${cle}`} type="date" className="form-control" value={bornes[cle]}
                            min={borne === 'fin' ? bornes[`s${numero}_debut`] || undefined : undefined}
                            onChange={(e) => setBornes((b) => ({ ...b, [cle]: e.target.value }))} />
                        </div>
                      );
                    })}
                  </div>
                </fieldset>
              ))}
              <div className="form-text">Facultatif : sans dates, le site affiche la période allant du premier au dernier événement du semestre.</div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" data-bs-dismiss="modal">Annuler</button>
              <button type="submit" className="btn btn-primary" disabled={enCours}>{enCours ? 'Patientez…' : 'Enregistrer'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Calendrier;

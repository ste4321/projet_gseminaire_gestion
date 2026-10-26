import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errorMessage, estAnnulee } from '../../api/client';
import useDerniereRequete from '../../hooks/useDerniereRequete';

const nombre = (n) => new Intl.NumberFormat('fr-FR').format(n ?? 0);
const pourcent = (part, total) => (total > 0 ? Math.round((part / total) * 100) : 0);
const majuscule = (texte) => texte.charAt(0).toUpperCase() + texte.slice(1);
const salutation = () => {
  const heure = new Date().getHours();
  return heure < 12 ? 'Bonjour' : heure < 18 ? 'Bon après-midi' : 'Bonsoir';
};

const ACCES_RAPIDES = [
  { to: '/admin/listeEtudiant', icon: 'bx-user-plus', label: 'Inscrire ou importer des étudiants' },
  { to: '/admin/noteEtudiant', icon: 'bx-edit', label: 'Saisir, importer ou publier des notes' },
  { to: '/admin/annonce', icon: 'bx-send', label: 'Publier une annonce' },
  { to: '/admin/info', icon: 'bx-globe', label: 'Publier une actualité sur le site' },
  { to: '/admin/edt', icon: 'bx-calendar', label: 'Emploi du temps' },
  { to: '/admin/portal', icon: 'bx-key', label: 'Activer un compte, réinitialiser un mot de passe' },
  { to: '/changer-mot-de-passe', icon: 'bx-lock-alt', label: 'Changer mon mot de passe' },
];

// Dernières statistiques gardées en mémoire : au retour sur le tableau de bord, elles s'affichent
// immédiatement puis sont rafraîchies en arrière-plan. Liées au jeton pour ne pas montrer
// les chiffres d'une autre session (déconnexion, mode consultation).
let memoire = { jeton: null, anneeId: '', stats: null };
const memoireValide = () => memoire.stats && memoire.jeton === localStorage.getItem('token');

const mouvementReduit = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Fait défiler un nombre jusqu'à `cible` ; repart de la valeur affichée si la cible change en cours de route.
 *  `instantane` : la valeur de départ est déjà la cible (données reprises de la mémoire, pas de comptage). */
const useCompteur = (cible, instantane = false, duree = 1000) => {
  const [valeur, setValeur] = useState(instantane ? cible : 0);
  const affichee = useRef(instantane ? cible : 0);

  useEffect(() => {
    const depart = affichee.current;
    if (mouvementReduit() || depart === cible) {
      affichee.current = cible;
      setValeur(cible);
      return undefined;
    }
    let raf;
    const debut = performance.now();
    const pas = (maintenant) => {
      const t = Math.min(1, (maintenant - debut) / duree);
      const v = depart + (cible - depart) * (1 - (1 - t) ** 3); // décélération en fin de course
      affichee.current = v;
      setValeur(v);
      if (t < 1) raf = requestAnimationFrame(pas);
    };
    raf = requestAnimationFrame(pas);
    return () => cancelAnimationFrame(raf);
  }, [cible, duree]);

  return Math.round(valeur);
};

const Compteur = ({ valeur, suffixe = '', instantane }) => <>{nombre(useCompteur(valeur, instantane))}{suffixe}</>;

/** Bloc gris animé à la place d'un contenu en cours de chargement */
const Squelette = ({ largeur = '100%', hauteur = '0.875rem', className = '' }) => (
  <span className={`gstf-squelette ${className}`} style={{ width: largeur, height: hauteur }} aria-hidden="true" />
);

const SqueletteLignes = ({ nombre: n, avecBarre }) => (
  <ul className="list-unstyled mb-0">
    {Array.from({ length: n }, (_, i) => (
      <li key={i} className="mb-3">
        <div className="d-flex justify-content-between mb-2">
          <Squelette largeur={`${55 - (i % 3) * 10}%`} />
          <Squelette largeur="3rem" />
        </div>
        {avecBarre && <Squelette hauteur="0.5rem" />}
      </li>
    ))}
  </ul>
);

const StatCard = ({ icon, label, valeur, suffixe, detail, to, gold, chargement, instantane }) => {
  const contenu = (
    <div className="card-body gstf-stat">
      <div className={`gstf-stat__icon ${gold ? 'gstf-stat__icon--gold' : ''}`} aria-hidden="true">
        <i className={`bx ${icon}`}></i>
      </div>
      <div className="min-w-0 flex-grow-1">
        <div className="gstf-stat__value">
          {chargement ? (
            <Squelette largeur="4rem" hauteur="1.6rem" />
          ) : valeur === null ? (
            '—'
          ) : (
            <Compteur valeur={valeur} suffixe={suffixe} instantane={instantane} />
          )}
        </div>
        <div className="gstf-stat__label">{label}</div>
        {chargement ? (
          <Squelette largeur="70%" hauteur="0.75rem" className="mt-1" />
        ) : (
          detail && <small className="text-muted d-block">{detail}</small>
        )}
      </div>
    </div>
  );
  return (
    <div className="col-6 col-xl-3 mb-4">
      {to ? <Link to={to} className="card h-100 text-reset">{contenu}</Link> : <div className="card h-100">{contenu}</div>}
    </div>
  );
};

const Barres = ({ lignes, total, vide, instantane }) =>
  lignes.length === 0 || total === 0 ? (
    <div className="gstf-empty py-4">
      <i className="bx bx-bar-chart-alt-2 d-block"></i>
      {vide}
    </div>
  ) : (
    <ul className="list-unstyled mb-0">
      {lignes.map((l) => (
        <li key={l.label} className="mb-3">
          <div className="d-flex justify-content-between mb-1">
            <span className="text-truncate me-2">{l.label}</span>
            <span className="text-nowrap">
              <strong><Compteur valeur={l.total} instantane={instantane} /></strong>
              <small className="text-muted ms-1">({pourcent(l.total, total)} %)</small>
            </span>
          </div>
          <div className={`gstf-bar ${instantane ? '' : 'gstf-bar--anime'}`} role="presentation">
            <span style={{ width: `${pourcent(l.total, total)}%` }}></span>
          </div>
        </li>
      ))}
    </ul>
  );

/** Ce qui demande une action de l'administration, le plus urgent d'abord */
const tachesAFaire = (stats) => {
  const { comptes, publications = [] } = stats;
  const taches = [];

  publications
    .filter((p) => !p.publie && p.notes_attendues > 0 && p.notes_saisies === p.notes_attendues)
    .forEach((p) => taches.push({
      cle: `pub-${p.niveau}-${p.semestre}`,
      icon: 'bx-send', ton: 'success',
      titre: `${p.semestre} · ${p.niveau} : notes complètes`,
      detail: 'Prêtes à être publiées aux étudiants',
      to: '/admin/noteEtudiant', action: 'Publier',
    }));

  const aActiver = comptes.prof.inactifs + comptes.etudiant.inactifs;
  if (aActiver > 0) {
    taches.push({
      cle: 'activation', icon: 'bx-lock-open-alt', ton: 'warning',
      titre: `${nombre(aActiver)} compte(s) en attente d'activation`,
      detail: 'Ces personnes ne peuvent pas encore se connecter',
      to: '/admin/portal', action: 'Activer',
    });
  }

  publications
    .filter((p) => !p.publie && p.notes_saisies < p.notes_attendues)
    .forEach((p) => taches.push({
      cle: `saisie-${p.niveau}-${p.semestre}`,
      icon: 'bx-edit', ton: 'primary',
      titre: `${p.semestre} · ${p.niveau} : ${nombre(p.notes_saisies)} / ${nombre(p.notes_attendues)} notes`,
      progression: pourcent(p.notes_saisies, p.notes_attendues),
      to: '/admin/noteEtudiant', action: 'Saisir',
    }));

  return taches;
};

const AFaire = ({ taches, instantane }) =>
  taches.length === 0 ? (
    <div className="gstf-empty py-4">
      <i className="bx bx-check-circle d-block text-success"></i>
      Tout est à jour.
    </div>
  ) : (
    <ul className="list-unstyled mb-0 gstf-taches">
      {taches.slice(0, 6).map((t) => (
        <li key={t.cle} className="gstf-tache">
          <span className={`gstf-tache__icone bg-label-${t.ton}`} aria-hidden="true"><i className={`bx ${t.icon}`}></i></span>
          <div className="flex-grow-1 min-w-0">
            <div className="fw-semibold">{t.titre}</div>
            {t.detail && <small className="text-muted">{t.detail}</small>}
            {t.progression !== undefined && (
              <div className={`gstf-bar mt-1 ${instantane ? '' : 'gstf-bar--anime'}`} role="presentation"><span style={{ width: `${t.progression}%` }}></span></div>
            )}
          </div>
          <Link to={t.to} className={`btn btn-sm btn-outline-${t.ton === 'success' ? 'success' : 'primary'}`}>{t.action}</Link>
        </li>
      ))}
      {taches.length > 6 && <li className="small text-muted pt-2">… et {taches.length - 6} autre(s)</li>}
    </ul>
  );

const AdminDashboard = () => {
  // Calculé une seule fois au montage : données en mémoire → affichage direct, sans squelette ni comptage
  const [depuisMemoire] = useState(memoireValide);
  const [stats, setStats] = useState(() => (depuisMemoire ? memoire.stats : null));
  const [anneeId, setAnneeId] = useState(() => (depuisMemoire ? memoire.anneeId : ''));
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState(null);
  const nomPrenom = localStorage.getItem('nom_prenom') || '';

  const nouvelleRequete = useDerniereRequete();

  const charger = useCallback(async (annee) => {
    const signal = nouvelleRequete(); // changement d'année rapide : seule la dernière réponse compte
    setLoading(true);
    setErreur(null);
    try {
      const res = await api.get('/dashboard/stats', { params: annee ? { annee } : {}, signal });
      setStats(res.data);
      memoire = { jeton: localStorage.getItem('token'), anneeId: annee, stats: res.data };
    } catch (err) {
      if (estAnnulee(err)) return;
      setErreur(errorMessage(err, 'Impossible de charger le tableau de bord.'));
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, [nouvelleRequete]);

  useEffect(() => {
    charger(anneeId);
  }, [anneeId, charger]);

  if (erreur && !stats) {
    return (
      <div className="container-xxl container-p-y">
        <div className="alert alert-danger d-flex justify-content-between align-items-center" role="alert">
          <span>{erreur}</span>
          <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => charger(anneeId)}>Réessayer</button>
        </div>
      </div>
    );
  }

  // Premier chargement : la mise en page s'affiche tout de suite, les données manquantes en squelette
  const chargement = !stats;
  const { etudiants, comptes, notes } = stats || {};
  const comptesAActiver = chargement ? 0 : comptes.prof.inactifs + comptes.etudiant.inactifs;
  const provisoires = chargement ? 0 : comptes.prof.provisoires + comptes.etudiant.provisoires;
  const taches = chargement ? [] : tachesAFaire(stats);

  const dioceses = etudiants?.par_diocese || [];
  const lignesDioceses = dioceses.length > 6
    ? [
        ...dioceses.slice(0, 5).map((d) => ({ label: d.diocese, total: d.total })),
        { label: `Autres (${dioceses.length - 5})`, total: dioceses.slice(5).reduce((s, d) => s + d.total, 0) },
      ]
    : dioceses.map((d) => ({ label: d.diocese, total: d.total }));

  return (
    <div className="container-xxl flex-grow-1 container-p-y" aria-busy={loading}>
      {chargement && <span className="visually-hidden" role="status">Chargement du tableau de bord…</span>}

      {/* Accueil */}
      <div className="card mb-4">
        <div className="card-body d-flex flex-wrap align-items-center gap-3">
          <img src="/images/logo-GS.jpg" alt="" width="64" height="64" className="rounded-circle" />
          <div className="flex-grow-1">
            <h4 className="mb-1">{salutation()}{nomPrenom ? `, ${nomPrenom}` : ''}</h4>
            <p className="mb-0 text-muted">
              {majuscule(new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }))}
              {chargement ? (
                <Squelette largeur="12rem" className="d-inline-block ms-2 align-middle" />
              ) : (
                stats.annee && <> · Année académique {stats.annee.annee_aca}</>
              )}
            </p>
          </div>
          {!chargement && stats.annees.length > 1 && (
            <div className="d-flex align-items-center gap-2">
              <label htmlFor="dashboard-annee" className="form-label mb-0 text-nowrap">Année</label>
              <select
                id="dashboard-annee"
                className="form-select"
                value={anneeId || stats.annee?.id || ''}
                onChange={(e) => setAnneeId(e.target.value)}
                disabled={loading}
              >
                {stats.annees.map((a) => <option key={a.id} value={a.id}>{a.annee_aca}</option>)}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Chiffres clés */}
      <div className="row">
        <StatCard
          icon="bx-group"
          label="Étudiants inscrits"
          chargement={chargement}
          instantane={depuisMemoire}
          valeur={etudiants?.inscrits ?? 0}
          detail={stats?.annee ? `en ${stats.annee.annee_aca}` : null}
          to="/admin/listeEtudiant"
        />
        <StatCard
          icon="bx-user-voice"
          label="Enseignants"
          chargement={chargement}
          instantane={depuisMemoire}
          valeur={stats?.enseignants ?? 0}
          to="/admin/listeProf"
        />
        <StatCard
          icon="bx-lock-open-alt"
          label="Comptes à activer"
          chargement={chargement}
          instantane={depuisMemoire}
          valeur={comptesAActiver}
          detail={provisoires > 0 ? `${nombre(provisoires)} mot(s) de passe provisoire(s)` : 'Tous les accès sont prêts'}
          to="/admin/portal"
          gold
        />
        <StatCard
          icon="bx-spreadsheet"
          label="Notes saisies"
          chargement={chargement}
          instantane={depuisMemoire}
          valeur={notes?.attendues > 0 ? pourcent(notes.saisies, notes.attendues) : null}
          suffixe=" %"
          detail={notes?.attendues > 0 ? `${nombre(notes.saisies)} sur ${nombre(notes.attendues)}` : 'Aucune note attendue'}
          to="/admin/noteEtudiant"
          gold
        />
      </div>

      {/* Dernières annonces + accès rapides */}
      <div className="row">
        <div className="col-lg-7 mb-4">
          <div className="card h-100">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="card-title gstf-section-title mb-0">Dernières annonces</h5>
              <Link to="/admin/annonce" className="btn btn-sm btn-outline-primary">Toutes les annonces</Link>
            </div>
            <div className="card-body">
              {chargement ? (
                <ul className="list-unstyled mb-0">
                  {[0, 1, 2, 3].map((i) => (
                    <li key={i} className="py-2 border-bottom">
                      <div className="d-flex justify-content-between mb-2">
                        <Squelette largeur={`${60 - i * 8}%`} hauteur="1rem" />
                        <Squelette largeur="3.5rem" />
                      </div>
                      <Squelette largeur="90%" hauteur="0.75rem" className="mb-1" />
                      <Squelette largeur="35%" hauteur="0.75rem" />
                    </li>
                  ))}
                </ul>
              ) : stats.annonces_recentes.length === 0 ? (
                <div className="gstf-empty py-4">
                  <i className="bx bx-message-square-dots d-block"></i>
                  Aucune annonce publiée.
                </div>
              ) : (
                <ul className="list-unstyled mb-0">
                  {stats.annonces_recentes.map((a) => (
                    <li key={a.id} className="py-2 border-bottom">
                      <div className="d-flex justify-content-between align-items-start gap-2">
                        <strong className="text-truncate">{a.titre}</strong>
                        <span className="badge bg-label-primary">
                          {{ tous: 'Tout le monde', enseignants: 'Enseignants' }[a.destinataires] || a.niveau?.niveau || 'Étudiants'}
                        </span>
                      </div>
                      {a.description && (
                        <p className="mb-1 text-muted small gstf-extrait-2">{a.description}</p>
                      )}
                      <small className="text-muted">{a.expediteur} · {new Date(a.created_at).toLocaleDateString('fr-FR')}</small>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        <div className="col-lg-5 mb-4">
          <div className="card h-100">
            <div className="card-header">
              <h5 className="card-title gstf-section-title mb-0">Accès rapides</h5>
            </div>
            <div className="card-body d-grid gap-2 align-content-start">
              {ACCES_RAPIDES.map((l) => (
                <Link key={l.to} to={l.to} className="gstf-quick-link">
                  <i className={`bx ${l.icon}`} aria-hidden="true"></i>{l.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* À faire + répartition des étudiants */}
      <div className="row">
        <div className="col-lg-12 col-xl-5 mb-4">
          <div className="card h-100">
            <div className="card-header">
              <h5 className="card-title gstf-section-title mb-0">À faire</h5>
              <small className="text-muted">Notes à saisir ou à publier, comptes à activer</small>
            </div>
            <div className="card-body">
              {chargement ? (
                <ul className="list-unstyled mb-0 gstf-taches">
                  {[0, 1, 2].map((i) => (
                    <li key={i} className="gstf-tache">
                      <Squelette largeur="2.25rem" hauteur="2.25rem" className="flex-shrink-0" />
                      <div className="flex-grow-1">
                        <Squelette largeur={`${70 - i * 12}%`} className="mb-2" />
                        <Squelette largeur="45%" hauteur="0.75rem" />
                      </div>
                      <Squelette largeur="4rem" hauteur="1.9rem" className="flex-shrink-0" />
                    </li>
                  ))}
                </ul>
              ) : (
                <AFaire taches={taches} instantane={depuisMemoire} />
              )}
            </div>
          </div>
        </div>

        <div className="col-md-6 col-xl-3 mb-4">
          <div className="card h-100">
            <div className="card-header">
              <h5 className="card-title gstf-section-title mb-0">Inscrits par niveau</h5>
            </div>
            <div className="card-body">
              {chargement ? (
                <SqueletteLignes nombre={4} avecBarre />
              ) : (
                <Barres
                  lignes={etudiants.par_niveau.map((n) => ({ label: n.niveau, total: n.total }))}
                  total={etudiants.inscrits}
                  vide="Aucun étudiant inscrit cette année."
                  instantane={depuisMemoire}
                />
              )}
            </div>
          </div>
        </div>

        <div className="col-md-6 col-xl-4 mb-4">
          <div className="card h-100">
            <div className="card-header">
              <h5 className="card-title gstf-section-title mb-0">Origine des étudiants</h5>
              <small className="text-muted">Diocèse ou congrégation</small>
            </div>
            <div className="card-body">
              {chargement ? (
                <SqueletteLignes nombre={5} avecBarre />
              ) : (
                <Barres lignes={lignesDioceses} total={etudiants.inscrits} vide="Aucune origine renseignée." instantane={depuisMemoire} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;

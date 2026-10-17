import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errorMessage } from '../../api/client';

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

const StatCard = ({ icon, label, value, detail, to, gold }) => {
  const contenu = (
    <div className="card-body gstf-stat">
      <div className={`gstf-stat__icon ${gold ? 'gstf-stat__icon--gold' : ''}`} aria-hidden="true">
        <i className={`bx ${icon}`}></i>
      </div>
      <div className="min-w-0">
        <div className="gstf-stat__value">{value}</div>
        <div className="gstf-stat__label">{label}</div>
        {detail && <small className="text-muted d-block">{detail}</small>}
      </div>
    </div>
  );
  return (
    <div className="col-6 col-xl-3 mb-4">
      {to ? <Link to={to} className="card h-100 text-reset">{contenu}</Link> : <div className="card h-100">{contenu}</div>}
    </div>
  );
};

const Barres = ({ lignes, total, vide }) =>
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
              <strong>{nombre(l.total)}</strong>
              <small className="text-muted ms-1">({pourcent(l.total, total)} %)</small>
            </span>
          </div>
          <div className="gstf-bar" role="presentation">
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

const AFaire = ({ taches }) =>
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
              <div className="gstf-bar mt-1" role="presentation"><span style={{ width: `${t.progression}%` }}></span></div>
            )}
          </div>
          <Link to={t.to} className={`btn btn-sm btn-outline-${t.ton === 'success' ? 'success' : 'primary'}`}>{t.action}</Link>
        </li>
      ))}
      {taches.length > 6 && <li className="small text-muted pt-2">… et {taches.length - 6} autre(s)</li>}
    </ul>
  );

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [anneeId, setAnneeId] = useState('');
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState(null);
  const nomPrenom = localStorage.getItem('nom_prenom') || '';

  const charger = useCallback(async (annee) => {
    setLoading(true);
    setErreur(null);
    try {
      const res = await api.get('/dashboard/stats', { params: annee ? { annee } : {} });
      setStats(res.data);
    } catch (err) {
      setErreur(errorMessage(err, 'Impossible de charger le tableau de bord.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    charger(anneeId);
  }, [anneeId, charger]);

  if (loading && !stats) {
    return (
      <div className="container-xxl container-p-y text-center py-5" role="status">
        <div className="spinner-border text-primary"></div>
        <p className="mt-2 text-muted">Chargement du tableau de bord…</p>
      </div>
    );
  }

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

  const { etudiants, comptes, notes } = stats;
  const comptesAActiver = comptes.prof.inactifs + comptes.etudiant.inactifs;
  const provisoires = comptes.prof.provisoires + comptes.etudiant.provisoires;
  const taches = tachesAFaire(stats);

  const dioceses = etudiants.par_diocese;
  const lignesDioceses = dioceses.length > 6
    ? [
        ...dioceses.slice(0, 5).map((d) => ({ label: d.diocese, total: d.total })),
        { label: `Autres (${dioceses.length - 5})`, total: dioceses.slice(5).reduce((s, d) => s + d.total, 0) },
      ]
    : dioceses.map((d) => ({ label: d.diocese, total: d.total }));

  return (
    <div className="container-xxl flex-grow-1 container-p-y">
      {/* Accueil */}
      <div className="card mb-4">
        <div className="card-body d-flex flex-wrap align-items-center gap-3">
          <img src="/images/logo-GS.jpg" alt="" width="64" height="64" className="rounded-circle" />
          <div className="flex-grow-1">
            <h4 className="mb-1">{salutation()}{nomPrenom ? `, ${nomPrenom}` : ''}</h4>
            <p className="mb-0 text-muted">
              {majuscule(new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }))}
              {stats.annee && <> · Année académique {stats.annee.annee_aca}</>}
            </p>
          </div>
          {stats.annees.length > 1 && (
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
          value={nombre(etudiants.inscrits)}
          detail={stats.annee ? `en ${stats.annee.annee_aca}` : null}
          to="/admin/listeEtudiant"
        />
        <StatCard icon="bx-user-voice" label="Enseignants" value={nombre(stats.enseignants)} to="/admin/listeProf" />
        <StatCard
          icon="bx-lock-open-alt"
          label="Comptes à activer"
          value={nombre(comptesAActiver)}
          detail={provisoires > 0 ? `${nombre(provisoires)} mot(s) de passe provisoire(s)` : 'Tous les accès sont prêts'}
          to="/admin/portal"
          gold
        />
        <StatCard
          icon="bx-spreadsheet"
          label="Notes saisies"
          value={notes.attendues > 0 ? `${pourcent(notes.saisies, notes.attendues)} %` : '—'}
          detail={notes.attendues > 0 ? `${nombre(notes.saisies)} sur ${nombre(notes.attendues)}` : 'Aucune note attendue'}
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
              {stats.annonces_recentes.length === 0 ? (
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
                        <span className="badge bg-label-primary">{a.niveau?.niveau || 'Tous'}</span>
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
              <AFaire taches={taches} />
            </div>
          </div>
        </div>

        <div className="col-md-6 col-xl-3 mb-4">
          <div className="card h-100">
            <div className="card-header">
              <h5 className="card-title gstf-section-title mb-0">Inscrits par niveau</h5>
            </div>
            <div className="card-body">
              <Barres
                lignes={etudiants.par_niveau.map((n) => ({ label: n.niveau, total: n.total }))}
                total={etudiants.inscrits}
                vide="Aucun étudiant inscrit cette année."
              />
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
              <Barres lignes={lignesDioceses} total={etudiants.inscrits} vide="Aucune origine renseignée." />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;

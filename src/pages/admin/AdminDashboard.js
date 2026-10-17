import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errorMessage } from '../../api/client';

const nombre = (n) => new Intl.NumberFormat('fr-FR').format(n ?? 0);
const pourcent = (part, total) => (total > 0 ? Math.round((part / total) * 100) : 0);
const dateCourte = (iso) =>
  iso ? new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

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
    <div className="col-sm-6 col-xl-3 mb-4">
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

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [anneeId, setAnneeId] = useState('');
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState(null);

  const charger = useCallback(async (annee) => {
    setLoading(true);
    setErreur(null);
    try {
      const res = await api.get('/dashboard/stats', { params: annee ? { annee } : {} });
      setStats(res.data);
    } catch (err) {
      setErreur(errorMessage(err, 'Impossible de charger les statistiques.'));
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

  const { etudiants, comptes, notes, configuration } = stats;
  const comptesAActiver = comptes.prof.inactifs + comptes.etudiant.inactifs;
  const provisoires = comptes.prof.provisoires + comptes.etudiant.provisoires;

  const dioceses = etudiants.par_diocese;
  const lignesDioceses = dioceses.length > 8
    ? [
        ...dioceses.slice(0, 7).map((d) => ({ label: d.diocese, total: d.total })),
        { label: `Autres (${dioceses.length - 7})`, total: dioceses.slice(7).reduce((s, d) => s + d.total, 0) },
      ]
    : dioceses.map((d) => ({ label: d.diocese, total: d.total }));

  // Mise en route : étapes nécessaires avant d'utiliser l'application au quotidien
  const etapes = [
    { ok: configuration.niveaux > 0, label: 'Créer les niveaux (L1, L2, L3…)', to: '/admin/niveau' },
    { ok: configuration.semestres > 0, label: 'Créer les semestres', to: '/admin/semestre' },
    { ok: configuration.matieres > 0, label: 'Ajouter les matières avec leur code', to: '/admin/matiere' },
    { ok: configuration.annees > 0 && etudiants.total > 0, label: 'Inscrire les étudiants (l’import crée l’année académique)', to: '/admin/listeEtudiant' },
    { ok: configuration.emplois_du_temps > 0, label: 'Publier l’emploi du temps', to: '/admin/edt' },
    { ok: comptesAActiver === 0 && etudiants.total > 0, label: 'Activer les comptes dans « Comptes et accès »', to: '/admin/portal' },
  ];
  const etapesRestantes = etapes.filter((e) => !e.ok);

  return (
    <div className="container-xxl flex-grow-1 container-p-y">
      <div className="gstf-page-header">
        <div>
          <h4 className="fw-bold">Tableau de bord</h4>
          <small className="text-muted">
            {stats.annee ? `Année académique ${stats.annee.annee_aca}` : 'Aucune année académique pour le moment'}
          </small>
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

      {etapesRestantes.length > 0 && (
        <div className="card mb-4 border border-warning">
          <div className="card-body">
            <h5 className="card-title gstf-section-title mb-1">Mise en route</h5>
            <p className="text-muted mb-3">
              {etapes.length - etapesRestantes.length} étape(s) sur {etapes.length} terminée(s).
              Voici ce qu’il reste à faire pour que l’application soit pleinement utilisable :
            </p>
            <ul className="list-unstyled mb-0">
              {etapes.map((e) => (
                <li key={e.label} className="d-flex align-items-center mb-2">
                  <i className={`bx ${e.ok ? 'bx-check-circle text-success' : 'bx-circle text-muted'} me-2 fs-5`} aria-hidden="true"></i>
                  {e.ok ? (
                    <span className="text-muted text-decoration-line-through">{e.label}</span>
                  ) : (
                    <Link to={e.to}>{e.label}</Link>
                  )}
                  <span className="visually-hidden">{e.ok ? ' (fait)' : ' (à faire)'}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

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

      <div className="row">
        <div className="col-lg-6 mb-4">
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

        <div className="col-lg-6 mb-4">
          <div className="card h-100">
            <div className="card-header">
              <h5 className="card-title gstf-section-title mb-0">Origine des étudiants</h5>
              <small className="text-muted">Diocèse ou congrégation renseigné sur la fiche</small>
            </div>
            <div className="card-body">
              <Barres lignes={lignesDioceses} total={etudiants.inscrits} vide="Aucune origine renseignée." />
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-lg-7 mb-4">
          <div className="card h-100">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="card-title gstf-section-title mb-0">Dernières annonces</h5>
              <Link to="/admin/annonce" className="btn btn-sm btn-outline-primary">Toutes les annonces</Link>
            </div>
            <div className="card-body">
              {stats.annonces_recentes.length === 0 ? (
                <div className="gstf-empty py-3">
                  <i className="bx bx-message-square-dots d-block"></i>
                  Aucune annonce publiée.
                </div>
              ) : (
                <ul className="list-unstyled mb-0">
                  {stats.annonces_recentes.map((a) => (
                    <li key={a.id} className="d-flex justify-content-between align-items-start py-2 border-bottom">
                      <div className="me-2 min-w-0">
                        <div className="fw-semibold text-truncate">{a.titre}</div>
                        <small className="text-muted">{a.expediteur}</small>
                      </div>
                      <div className="text-end text-nowrap">
                        {a.niveau && <span className="badge bg-label-primary me-1">{a.niveau.niveau}</span>}
                        <small className="text-muted d-block">{dateCourte(a.created_at)}</small>
                      </div>
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
            <div className="card-body d-grid gap-2">
              <Link to="/admin/listeEtudiant" className="gstf-quick-link"><i className="bx bx-user-plus"></i>Inscrire ou importer des étudiants</Link>
              <Link to="/admin/noteEtudiant" className="gstf-quick-link"><i className="bx bx-edit"></i>Saisir ou importer des notes</Link>
              <Link to="/admin/annonce" className="gstf-quick-link"><i className="bx bx-send"></i>Publier une annonce</Link>
              <Link to="/admin/portal" className="gstf-quick-link"><i className="bx bx-key"></i>Activer un compte, réinitialiser un mot de passe</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;

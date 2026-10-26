// Comptes et accès : qui peut se connecter (activation), avec quel mot de passe (provisoire ou personnel),
// et accès à l'espace d'un enseignant ou d'un étudiant en lecture seule.
import React, { useEffect, useState, useMemo } from 'react';
import SearchBar from './SearchBar';
import Pagination from './Pagination';
import MotDePasseProvisoire from './MotDePasseProvisoire';
import { useUserCession } from '../contexts/UserCessionContext';
import api, { errorMessage } from '../api/client';
import { useFeedback } from '../contexts/FeedbackContext';
import { getUser } from '../auth/session';
import { ouvrirEspace } from '../auth/consultation';
import { plusRecentsDabord } from '../utils/tri';
import { ilYA } from '../utils/dates';

const ROLES = ['etudiant', 'prof', 'admin'];
const ROLE_TABS = { admin: 'Administrateurs', prof: 'Enseignants', etudiant: 'Étudiants' };
const PAR_PAGE = 10;
const ETATS = [
  { valeur: '', libelle: 'Tous les comptes' },
  { valeur: 'actifs', libelle: 'Accès activé' },
  { valeur: 'inactifs', libelle: 'Accès désactivé' },
  { valeur: 'provisoire', libelle: 'Mot de passe provisoire' },
];

const normaliser = (texte) => String(texte ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const initiales = (nom) => String(nom || '?').split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((m) => m[0].toUpperCase()).join('');
const dateComplete = (iso) => (iso ? new Date(iso).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' }) : '');

const Portal = () => {
  const { notify, confirm } = useFeedback();
  const { usersByRole, erreurByRole, stats, fetchUsers, fetchStats, updateUserLocal } = useUserCession();
  const [role, setRole] = useState('etudiant');
  const [recherche, setRecherche] = useState('');
  const [etat, setEtat] = useState('');
  const [page, setPage] = useState(0);
  const [selection, setSelection] = useState(() => new Set());
  const [enCours, setEnCours] = useState(null); // id du compte dont l'accès est en cours de modification
  const [reinitEnCours, setReinitEnCours] = useState(null); // id du compte dont le mot de passe est réinitialisé
  const [lotEnCours, setLotEnCours] = useState(null); // 'activer' | 'desactiver'
  const [identifiants, setIdentifiants] = useState(null); // mot de passe provisoire à afficher une fois
  const moi = getUser()?.id;

  useEffect(() => {
    fetchUsers(role);
  }, [role, fetchUsers]);
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Changement d'onglet, de recherche ou de filtre : première page, sélection vidée
  useEffect(() => {
    setPage(0);
    setSelection(new Set());
  }, [role, recherche, etat]);

  const comptes = usersByRole[role];
  const loading = !comptes && !erreurByRole[role];
  const erreur = !comptes ? erreurByRole[role] : null;
  const occupe = enCours !== null || reinitEnCours !== null || lotEnCours !== null;

  // ---------- Liste ----------
  const terme = normaliser(recherche);
  const filtres = useMemo(
    () => plusRecentsDabord(comptes || []).filter((u) => {
      if (etat === 'actifs' && !u.is_verified) return false;
      if (etat === 'inactifs' && u.is_verified) return false;
      if (etat === 'provisoire' && !u.must_change_password) return false;
      return !terme || [u.nom_prenom, u.email, u.telephone].some((v) => normaliser(v).includes(terme));
    }),
    [comptes, etat, terme]
  );
  const totalPages = Math.ceil(filtres.length / PAR_PAGE);
  const visibles = filtres.slice(page * PAR_PAGE, (page + 1) * PAR_PAGE);
  const selectionnables = visibles.filter((u) => u.id !== moi);
  const toutSelectionne = selectionnables.length > 0 && selectionnables.every((u) => selection.has(u.id));
  const provisoires = (comptes || []).filter((u) => u.must_change_password).length;
  const filtresActifs = Boolean(terme || etat);

  const selectionner = (id, oui) => setSelection((avant) => {
    const apres = new Set(avant);
    if (oui) apres.add(id); else apres.delete(id);
    return apres;
  });
  const toutSelectionner = (oui) => setSelection(oui ? new Set(selectionnables.map((u) => u.id)) : new Set());

  // ---------- Actions ----------
  const basculer = async (compte) => {
    const nom = compte.nom_prenom || compte.email;
    if (compte.is_verified && !(await confirm({
      title: `Désactiver l'accès de ${nom} ?`,
      message: "Ce compte ne pourra plus se connecter jusqu'à sa réactivation.",
      confirmLabel: 'Désactiver',
      danger: true,
    }))) return;

    setEnCours(compte.id);
    try {
      const res = await api.patch(`/user-cessions/${compte.id}/toggle`);
      updateUserLocal(role, compte.id, { is_verified: res.data.is_verified });
      fetchStats();
      notify.success(`${nom} : accès ${res.data.is_verified ? 'activé' : 'désactivé'}.`);
    } catch (err) {
      notify.error(errorMessage(err, 'Erreur lors de la mise à jour. Réessayez.'));
    } finally {
      setEnCours(null);
    }
  };

  const basculerLot = async (activer) => {
    const ids = [...selection];
    if (!activer && !(await confirm({
      title: `Désactiver ${ids.length} compte${ids.length > 1 ? 's' : ''} ?`,
      message: "Ils ne pourront plus se connecter jusqu'à leur réactivation.",
      confirmLabel: 'Désactiver',
      danger: true,
    }))) return;

    setLotEnCours(activer ? 'activer' : 'desactiver');
    try {
      const res = await api.patch('/user-cessions/bulk-toggle', { user_ids: ids, is_verified: activer });
      ids.filter((id) => id !== moi).forEach((id) => updateUserLocal(role, id, { is_verified: activer }));
      setSelection(new Set());
      fetchStats();
      notify.success(res.data.message);
    } catch (err) {
      notify.error(errorMessage(err, 'Erreur lors de la mise à jour en lot. Réessayez.'));
    } finally {
      setLotEnCours(null);
    }
  };

  const reinitialiser = async (compte) => {
    const nom = compte.nom_prenom || compte.email;
    const ok = await confirm({
      title: 'Réinitialiser le mot de passe ?',
      message: `Un nouveau mot de passe provisoire sera généré pour ${nom}.\nSon mot de passe actuel ne fonctionnera plus et ses sessions ouvertes seront fermées.`,
      confirmLabel: 'Réinitialiser',
      danger: true,
    });
    if (!ok) return;

    setReinitEnCours(compte.id);
    try {
      const res = await api.post(`/user-cessions/${compte.id}/reset-password`);
      updateUserLocal(role, compte.id, { must_change_password: true });
      setIdentifiants({ nom: compte.nom_prenom, email: res.data.email, mot_de_passe: res.data.mot_de_passe });
    } catch (err) {
      notify.error(errorMessage(err, 'Erreur lors de la réinitialisation du mot de passe.'));
    } finally {
      setReinitEnCours(null);
    }
  };

  const consulter = (compte) =>
    ouvrirEspace({ userId: compte.id, nom: compte.nom_prenom || compte.email, role: compte.role, confirm, notify });

  // ---------- Rendu ----------
  const compteurOnglet = (r) => stats?.[r]?.total;
  const resume = stats?.[role];

  return (
    <div className="container-xxl flex-grow-1 container-p-y">
      <div className="gstf-page-header">
        <div>
          <h4 className="fw-bold mb-1">
            <span className="text-muted fw-light">Administration /</span> Comptes et accès
          </h4>
          <small className="text-muted">Qui peut se connecter, et avec quel mot de passe.</small>
        </div>
      </div>

      <ul className="nav nav-pills mb-3 gap-1" role="tablist">
        {ROLES.map((r) => (
          <li className="nav-item" key={r}>
            <button type="button" role="tab" aria-selected={role === r}
              className={`nav-link d-flex align-items-center gap-2 ${role === r ? 'active' : ''}`} onClick={() => setRole(r)}>
              {ROLE_TABS[r]}
              {compteurOnglet(r) !== undefined && <span className="gstf-onglet__compteur">{compteurOnglet(r)}</span>}
            </button>
          </li>
        ))}
      </ul>

      <div className="card">
        <div className="card-header">
          <h5 className="card-title mb-1">Comptes · {ROLE_TABS[role]}</h5>
          {resume ? (
            <small className="text-muted">
              {resume.actifs} activé{resume.actifs > 1 ? 's' : ''} · {resume.inactifs} désactivé{resume.inactifs > 1 ? 's' : ''}
              {comptes && provisoires > 0 && ` · ${provisoires} mot${provisoires > 1 ? 's' : ''} de passe provisoire${provisoires > 1 ? 's' : ''}`}
            </small>
          ) : (
            <span className="gstf-squelette d-block" style={{ width: '14rem', height: '0.8rem' }} aria-hidden="true" />
          )}
        </div>

        <div className="card-body pt-0 pb-3">
          <div className="gstf-filtres">
            <SearchBar className="gstf-filtres__recherche" searchTerm={recherche} onSearchChange={setRecherche}
              placeholder="Rechercher par nom, email ou téléphone…" />
            <select className="form-select w-auto" value={etat} onChange={(e) => setEtat(e.target.value)} aria-label="Filtrer par état">
              {ETATS.map((e) => <option key={e.valeur} value={e.valeur}>{e.libelle}</option>)}
            </select>
          </div>
        </div>

        {/* Actions groupées : visibles dès qu'un compte est coché */}
        {selection.size > 0 && (
          <div className="gstf-lot" role="region" aria-label="Actions sur la sélection">
            <strong>{selection.size} sélectionné{selection.size > 1 ? 's' : ''}</strong>
            <div className="d-flex flex-wrap gap-2 ms-auto">
              <button type="button" className="btn btn-sm btn-primary" onClick={() => basculerLot(true)} disabled={occupe}>
                {lotEnCours === 'activer' ? <span className="spinner-border spinner-border-sm me-1" /> : <i className="bx bx-check me-1"></i>}
                Activer
              </button>
              <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => basculerLot(false)} disabled={occupe}>
                {lotEnCours === 'desactiver' ? <span className="spinner-border spinner-border-sm me-1" /> : <i className="bx bx-block me-1"></i>}
                Désactiver
              </button>
              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setSelection(new Set())} disabled={occupe}>
                Annuler
              </button>
            </div>
          </div>
        )}

        {erreur ? (
          <div className="gstf-empty">
            <i className="bx bx-error-circle d-block"></i>
            <p className="mb-3">{erreur}</p>
            <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => fetchUsers(role, { force: true })}>Réessayer</button>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover mb-0 gstf-comptes" aria-busy={loading}>
              <thead>
                <tr>
                  <th scope="col" className="gstf-comptes__case">
                    <input className="form-check-input" type="checkbox" aria-label="Tout sélectionner sur cette page"
                      checked={toutSelectionne} onChange={(e) => toutSelectionner(e.target.checked)}
                      disabled={loading || occupe || selectionnables.length === 0} />
                  </th>
                  <th scope="col">Compte</th>
                  <th scope="col" className="d-none d-md-table-cell">Créé</th>
                  <th scope="col">Accès</th>
                  <th scope="col">Mot de passe</th>
                  <th scope="col" className="text-end"><span className="visually-hidden">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 6 }, (_, i) => (
                      <tr key={i} aria-hidden="true">
                        <td><span className="gstf-squelette" style={{ width: '1rem', height: '1rem' }} /></td>
                        <td>
                          <span className="d-flex align-items-center gap-2">
                            <span className="gstf-squelette rounded-circle" style={{ width: '2.25rem', height: '2.25rem' }} />
                            <span className="d-block">
                              <span className="gstf-squelette mb-1" style={{ width: `${8 + (i % 3) * 2}rem`, height: '0.9rem' }} />
                              <span className="gstf-squelette" style={{ width: '11rem', height: '0.7rem' }} />
                            </span>
                          </span>
                        </td>
                        <td className="d-none d-md-table-cell"><span className="gstf-squelette" style={{ width: '5rem', height: '0.8rem' }} /></td>
                        <td><span className="gstf-squelette" style={{ width: '5.5rem', height: '1.2rem' }} /></td>
                        <td><span className="gstf-squelette" style={{ width: '5rem', height: '1.2rem' }} /></td>
                        <td />
                      </tr>
                    ))
                  : visibles.map((u) => {
                      const estMoi = u.id === moi;
                      return (
                        <tr key={u.id} className={u.is_verified ? undefined : 'gstf-comptes__inactif'}>
                          <td className="gstf-comptes__case">
                            <input className="form-check-input" type="checkbox" checked={selection.has(u.id)}
                              onChange={(e) => selectionner(u.id, e.target.checked)} disabled={estMoi || occupe}
                              aria-label={`Sélectionner ${u.nom_prenom || u.email}`}
                              title={estMoi ? 'Votre propre compte ne peut pas être modifié ici' : undefined} />
                          </td>
                          <td>
                            <span className="d-flex align-items-center gap-2 min-w-0">
                              <span className="avatar avatar-sm flex-shrink-0">
                                <span className="avatar-initial rounded-circle bg-label-primary">{initiales(u.nom_prenom || u.email)}</span>
                              </span>
                              <span className="min-w-0">
                                <span className="d-flex align-items-center gap-2">
                                  <strong className="gstf-comptes__nom text-truncate">{u.nom_prenom || 'Sans profil'}</strong>
                                  {estMoi && <span className="badge gstf-badge-neutre">Vous</span>}
                                </span>
                                <small className="d-block text-muted text-truncate">{u.email}</small>
                              </span>
                            </span>
                          </td>
                          <td className="d-none d-md-table-cell text-muted small text-nowrap" title={dateComplete(u.created_at)}>
                            {ilYA(u.created_at)}
                          </td>
                          <td>
                            <div className="form-check form-switch mb-0 text-nowrap">
                              <input className="form-check-input" type="checkbox" role="switch" id={`acces-${u.id}`}
                                checked={!!u.is_verified} onChange={() => basculer(u)} disabled={occupe || estMoi}
                                title={estMoi ? 'Vous ne pouvez pas désactiver votre propre compte' : undefined} />
                              <label className="form-check-label small" htmlFor={`acces-${u.id}`}>
                                {enCours === u.id ? 'Patientez…' : u.is_verified ? 'Activé' : 'Désactivé'}
                              </label>
                            </div>
                          </td>
                          <td className="text-nowrap">
                            {u.must_change_password ? (
                              <span className="badge gstf-badge-neutre" title="À changer à la prochaine connexion">
                                <i className="bx bx-time-five me-1" aria-hidden="true"></i>Provisoire
                              </span>
                            ) : (
                              <span className="small text-muted">Personnel</span>
                            )}
                          </td>
                          <td className="text-end text-nowrap">
                            {!estMoi && (
                              <div className="d-inline-flex gap-1">
                                {u.role !== 'admin' && (
                                  <button type="button" className="btn btn-sm btn-icon btn-outline-secondary gstf-comptes__action"
                                    onClick={() => consulter(u)} disabled={occupe || !u.is_verified}
                                    title={u.is_verified ? 'Ouvrir son espace (lecture seule)' : "Compte désactivé : activez-le pour ouvrir son espace"}
                                    aria-label={`Ouvrir l'espace de ${u.nom_prenom || u.email}`}>
                                    <i className="bx bx-show"></i>
                                  </button>
                                )}
                                <button type="button" className="btn btn-sm btn-icon btn-outline-secondary gstf-comptes__action"
                                  onClick={() => reinitialiser(u)} disabled={occupe}
                                  title="Générer un nouveau mot de passe provisoire"
                                  aria-label={`Réinitialiser le mot de passe de ${u.nom_prenom || u.email}`}>
                                  {reinitEnCours === u.id ? <span className="spinner-border spinner-border-sm" /> : <i className="bx bx-key"></i>}
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && !erreur && filtres.length === 0 && (
          <div className="gstf-empty">
            {filtresActifs ? (
              <>
                <i className="bx bx-search-alt d-block"></i>
                Aucun compte ne correspond à ces critères.
                <div className="mt-3">
                  <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => { setRecherche(''); setEtat(''); }}>
                    Effacer les filtres
                  </button>
                </div>
              </>
            ) : (
              <>
                <i className="bx bx-user-x d-block"></i>
                Aucun compte {ROLE_TABS[role].toLowerCase()} pour l'instant.
              </>
            )}
          </div>
        )}

        {!loading && <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />}
      </div>

      <MotDePasseProvisoire identifiants={identifiants} onClose={() => setIdentifiants(null)} />
    </div>
  );
};

export default Portal;

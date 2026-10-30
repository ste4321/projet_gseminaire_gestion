// Comptes et accès : qui peut se connecter (activation), avec quel mot de passe (provisoire ou personnel),
// et accès à l'espace d'un enseignant ou d'un étudiant en lecture seule.
import React, { useCallback, useEffect, useState, useMemo } from 'react';
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
import { confirmerAvecCode } from '../utils/confirmation';

const ROLES = ['etudiant', 'prof', 'admin'];
const ROLE_TABS = { admin: 'Administrateurs', prof: 'Enseignants', etudiant: 'Étudiants' };
const PAR_PAGE = 10;
// Au-delà, un mot de passe provisoire jamais remplacé laisse penser que les identifiants n'ont pas été remis
const SEUIL_PROVISOIRE = 30;
const JOUR = 24 * 60 * 60 * 1000;
const ETATS = [
  { valeur: '', libelle: 'Tous les comptes' },
  { valeur: 'en-ligne', libelle: 'En ligne maintenant' },
  { valeur: 'actifs', libelle: 'Accès activé' },
  { valeur: 'inactifs', libelle: 'Accès désactivé' },
  { valeur: 'provisoire', libelle: 'Mot de passe provisoire' },
  { valeur: 'provisoire-ancien', libelle: `Provisoire depuis plus de ${SEUIL_PROVISOIRE} jours` },
  { valeur: 'jamais', libelle: 'Jamais connectés' },
  { valeur: 'dormants', libelle: 'Sans connexion depuis 6 mois' },
];

const normaliser = (texte) => String(texte ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
// Terme recherché surligné (comparaison sans accents ni majuscules), ex. « DEMO002 » dans le matricule
const surligner = (texte, recherche) => {
  const terme = normaliser(recherche);
  const i = terme ? normaliser(texte).indexOf(terme) : -1;
  if (i < 0) return texte;
  return <>{texte.slice(0, i)}<mark>{texte.slice(i, i + terme.length)}</mark>{texte.slice(i + terme.length)}</>;
};
const initiales = (nom) => String(nom || '?').split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((m) => m[0].toUpperCase()).join('');
const dateComplete = (iso) => (iso ? new Date(iso).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' }) : '');
const joursDepuis = (iso) => (iso ? Math.max(0, Math.floor((Date.now() - new Date(iso)) / JOUR)) : null);
// « depuis aujourd'hui », « depuis 23 j », « depuis 3 mois »
const depuis = (jours) => {
  if (jours === null) return '';
  if (jours === 0) return "depuis aujourd'hui";
  if (jours < 60) return `depuis ${jours} j`;
  return `depuis ${Math.round(jours / 30)} mois`;
};
// Provisoire ancien et pas utilisé depuis qu'il a été remis : identifiants probablement jamais reçus
const provisoireEnSouffrance = (u) => u.must_change_password && joursDepuis(u.provisoire_depuis) >= SEUIL_PROVISOIRE
  && (!u.derniere_connexion_at || new Date(u.derniere_connexion_at) < new Date(u.provisoire_depuis));
const jamaisConnecte = (u) => !u.derniere_connexion_at;
// Dernière fois où la personne a été vue dans l'application (signal de présence, sinon connexion)
const vuLe = (u) => u.derniere_activite_at || u.derniere_connexion_at || null;
const dormant = (u) => !u.en_ligne && Boolean(vuLe(u)) && joursDepuis(vuLe(u)) >= 182;
// Statut : « En ligne », « En ligne il y a 5 min », « En ligne hier », « En ligne le 12 oct. », « Jamais connecté »
const texteStatut = (u) => {
  if (u.en_ligne) return 'En ligne';
  if (!vuLe(u)) return 'Jamais connecté';
  const quand = ilYA(vuLe(u));
  return /^(il y a|à l'instant|hier)/.test(quand) ? `En ligne ${quand}` : `En ligne le ${quand}`;
};
const infoStatut = (u) => [
  u.en_ligne ? 'Utilise l’application en ce moment' : vuLe(u) ? `En ligne pour la dernière fois le ${dateComplete(vuLe(u))}` : 'Ne s’est jamais connecté',
  u.derniere_connexion_at && `Dernière connexion : ${dateComplete(u.derniere_connexion_at)}`,
  `Compte créé le ${dateComplete(u.created_at)}`,
].filter(Boolean).join('\n');
const PRESENCE_MS = 30 * 1000; // statut « En ligne » relu toutes les 30 s

const Portal = () => {
  const { notify, confirm } = useFeedback();
  const { usersByRole, loadingByRole, erreurByRole, stats, fetchUsers, fetchStats, updateUserLocal, mergePresence, deleteUserLocal } = useUserCession();
  const [role, setRole] = useState('etudiant');
  const [recherche, setRecherche] = useState('');
  const [etat, setEtat] = useState('');
  const [page, setPage] = useState(0);
  const [selection, setSelection] = useState(() => new Set());
  const [enCours, setEnCours] = useState(null); // id du compte dont l'accès est en cours de modification
  const [reinitEnCours, setReinitEnCours] = useState(null); // id du compte dont le mot de passe est réinitialisé
  const [lotEnCours, setLotEnCours] = useState(null); // 'activer' | 'desactiver' | 'supprimer'
  const [identifiants, setIdentifiants] = useState(null); // mot de passe provisoire à afficher une fois
  const moi = getUser()?.id;

  // Liste relue à chaque arrivée sur la page ou sur l'onglet (la liste affichée reste visible pendant ce temps) :
  // les connexions, changements de mot de passe et nouveaux comptes faits ailleurs apparaissent
  const actualiser = useCallback(() => {
    fetchUsers(role, { force: true });
    fetchStats();
  }, [role, fetchUsers, fetchStats]);

  useEffect(() => {
    actualiser();
  }, [actualiser]);

  useEffect(() => {
    const auRetour = () => document.visibilityState === 'visible' && actualiser();
    document.addEventListener('visibilitychange', auRetour);
    window.addEventListener('focus', auRetour);
    return () => {
      document.removeEventListener('visibilitychange', auRetour);
      window.removeEventListener('focus', auRetour);
    };
  }, [actualiser]);

  // Statut « En ligne » : relu toutes les 30 s tant que la page est visible (requête légère, sans la liste complète)
  useEffect(() => {
    const relire = () => {
      if (document.visibilityState !== 'visible') return;
      api.get('/user-cessions/presence', { params: { role } }).then((res) => mergePresence(role, res.data)).catch(() => {});
    };
    const minuterie = setInterval(relire, PRESENCE_MS);
    return () => clearInterval(minuterie);
  }, [role, mergePresence]);

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
      if (etat === 'provisoire-ancien' && !provisoireEnSouffrance(u)) return false;
      if (etat === 'en-ligne' && !u.en_ligne) return false;
      if (etat === 'jamais' && !jamaisConnecte(u)) return false;
      if (etat === 'dormants' && !dormant(u)) return false;
      return !terme || [u.nom_prenom, u.email, u.telephone, u.matricule].some((v) => normaliser(v).includes(terme));
    }),
    [comptes, etat, terme]
  );
  const totalPages = Math.ceil(filtres.length / PAR_PAGE);
  const visibles = filtres.slice(page * PAR_PAGE, (page + 1) * PAR_PAGE);
  const selectionnables = visibles.filter((u) => u.id !== moi);
  const toutSelectionne = selectionnables.length > 0 && selectionnables.every((u) => selection.has(u.id));
  const provisoires = (comptes || []).filter((u) => u.must_change_password).length;
  const enSouffrance = (comptes || []).filter(provisoireEnSouffrance).length;
  const jamais = (comptes || []).filter(jamaisConnecte).length;
  const enLigne = (comptes || []).filter((u) => u.en_ligne).length;
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
      updateUserLocal(role, compte.id, { must_change_password: true, provisoire_depuis: new Date().toISOString() });
      setIdentifiants({ nom: compte.nom_prenom, email: res.data.email, mot_de_passe: res.data.mot_de_passe });
    } catch (err) {
      notify.error(errorMessage(err, 'Erreur lors de la réinitialisation du mot de passe.'));
    } finally {
      setReinitEnCours(null);
    }
  };

  // Suppression définitive des comptes sélectionnés (ex. étudiant exclu) : seul l'accès disparaît,
  // les dossiers sont conservés côté serveur. Un seul code de confirmation pour toute la sélection.
  const supprimerSelection = async () => {
    const ids = [...selection];
    const choisis = (comptes || []).filter((u) => selection.has(u.id));
    const n = ids.length;
    const noms = choisis.slice(0, 5).map((u) => `• ${u.nom_prenom || u.email}`).join('\n') + (n > 5 ? `\n• … et ${n - 5} autre${n - 5 > 1 ? 's' : ''}` : '');
    const dossiers = role === 'etudiant'
      ? `${n > 1 ? 'Leurs dossiers' : 'Son dossier'} (notes, bulletins, parcours) ${n > 1 ? 'sont conservés' : 'est conservé'}. Un nouveau compte pourra être créé plus tard (par exemple lors d’un import).`
      : role === 'prof' ? `${n > 1 ? 'Leurs fiches enseignant sont conservées' : 'Sa fiche enseignant est conservée'}.` : '';
    let code;
    try {
      code = await confirmerAvecCode(confirm, 'supprimer_compte', {
        title: n > 1 ? `Supprimer ${n} comptes ?` : `Supprimer le compte de ${choisis[0]?.nom_prenom || choisis[0]?.email} ?`,
        message: `${noms}\n\n${n > 1 ? 'Ces personnes ne pourront plus' : 'Cette personne ne pourra plus'} se connecter ; les sessions ouvertes sont fermées. Cette action est définitive.\n${dossiers}`.trim(),
        confirmLabel: n > 1 ? `Supprimer les ${n} comptes` : 'Supprimer le compte',
        danger: true,
      });
    } catch (err) {
      notify.error(errorMessage(err, "Impossible d'obtenir un code de confirmation."));
      return;
    }
    if (!code) return;

    setLotEnCours('supprimer');
    try {
      const res = await api.post('/user-cessions/bulk-delete', { user_ids: ids, code_confirmation: code });
      res.data.supprimes.forEach((id) => deleteUserLocal(role, id));
      setSelection(new Set());
      fetchStats();
      notify.success(res.data.message);
    } catch (err) {
      notify.error(errorMessage(err, 'Erreur lors de la suppression des comptes.'));
    } finally {
      setLotEnCours(null);
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
          <div className="d-flex align-items-center gap-2">
            <h5 className="card-title mb-1 flex-grow-1">Comptes · {ROLE_TABS[role]}</h5>
            {comptes && (
              <button type="button" className="btn btn-sm btn-icon btn-outline-secondary" onClick={actualiser}
                disabled={loadingByRole[role]} title="Actualiser la liste" aria-label="Actualiser la liste">
                <i className={`bx bx-refresh ${loadingByRole[role] ? 'bx-spin' : ''}`}></i>
              </button>
            )}
          </div>
          {resume ? (
            <small className="text-muted">
              {comptes && enLigne > 0 && (
                <><button type="button" className="btn btn-link btn-sm p-0 align-baseline gstf-presence gstf-presence--en-ligne" onClick={() => setEtat('en-ligne')}>
                  <span className="gstf-presence__point" aria-hidden="true"></span>{enLigne} en ligne
                </button> · </>
              )}
              {resume.actifs} activé{resume.actifs > 1 ? 's' : ''} · {resume.inactifs} désactivé{resume.inactifs > 1 ? 's' : ''}
              {comptes && provisoires > 0 && ` · ${provisoires} mot${provisoires > 1 ? 's' : ''} de passe provisoire${provisoires > 1 ? 's' : ''}`}
              {comptes && jamais > 0 && (
                <> · <button type="button" className="btn btn-link btn-sm p-0 align-baseline" onClick={() => setEtat('jamais')}>
                  {jamais} jamais connecté{jamais > 1 ? 's' : ''}
                </button></>
              )}
              {comptes && enSouffrance > 0 && (
                <> · <button type="button" className="btn btn-link btn-sm p-0 align-baseline gstf-comptes__alerte-lien" onClick={() => setEtat('provisoire-ancien')}
                  title={`Mot de passe provisoire jamais utilisé depuis plus de ${SEUIL_PROVISOIRE} jours`}>
                  <i className="bx bx-error me-1" aria-hidden="true"></i>{enSouffrance} identifiant{enSouffrance > 1 ? 's' : ''} peut-être non remis
                </button></>
              )}
            </small>
          ) : (
            <span className="gstf-squelette d-block" style={{ width: '14rem', height: '0.8rem' }} aria-hidden="true" />
          )}
        </div>

        <div className="card-body pt-0 pb-3">
          <div className="gstf-filtres">
            <SearchBar className="gstf-filtres__recherche" searchTerm={recherche} onSearchChange={setRecherche}
              placeholder="Rechercher par nom, matricule ou email…" />
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
              <button type="button" className="btn btn-sm btn-outline-secondary gstf-comptes__supprimer" onClick={supprimerSelection} disabled={occupe}
                title="Supprimer définitivement les comptes sélectionnés (les dossiers sont conservés)">
                {lotEnCours === 'supprimer' ? <span className="spinner-border spinner-border-sm me-1" /> : <i className="bx bx-trash me-1"></i>}
                Supprimer
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
                  {role === 'etudiant' && <th scope="col" className="d-none d-lg-table-cell">Matricule</th>}
                  <th scope="col" className="d-none d-md-table-cell">Statut</th>
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
                        {role === 'etudiant' && <td className="d-none d-lg-table-cell"><span className="gstf-squelette" style={{ width: '4.5rem', height: '0.8rem' }} /></td>}
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
                              <span className={`avatar avatar-sm flex-shrink-0 ${u.en_ligne ? 'avatar-online' : ''}`} title={u.en_ligne ? 'En ligne' : undefined}>
                                <span className="avatar-initial rounded-circle bg-label-primary">{initiales(u.nom_prenom || u.email)}</span>
                              </span>
                              <span className="min-w-0">
                                <span className="d-flex align-items-center gap-2">
                                  <strong className="gstf-comptes__nom text-truncate">{u.nom_prenom || 'Sans profil'}</strong>
                                  {estMoi && <span className="badge gstf-badge-neutre">Vous</span>}
                                </span>
                                <small className="d-block text-muted text-truncate">{u.email}</small>
                                <small className={`d-block d-md-none ${u.en_ligne ? 'gstf-presence--en-ligne' : 'text-muted'}`} title={infoStatut(u)}>
                                  {texteStatut(u)}
                                </small>
                              </span>
                            </span>
                          </td>
                          {role === 'etudiant' && (
                            <td className="d-none d-lg-table-cell text-nowrap">
                              {u.matricule ? <span className="gstf-comptes__matricule">{surligner(u.matricule, recherche)}</span> : <span className="text-muted">—</span>}
                            </td>
                          )}
                          <td className="d-none d-md-table-cell small text-nowrap" title={infoStatut(u)}>
                            {u.en_ligne ? (
                              <span className="gstf-presence gstf-presence--en-ligne">
                                <span className="gstf-presence__point" aria-hidden="true"></span>En ligne
                              </span>
                            ) : vuLe(u) ? (
                              <span className={`gstf-presence ${dormant(u) ? 'text-muted' : 'text-body'}`}>
                                <span className="gstf-presence__point" aria-hidden="true"></span>{texteStatut(u)}
                              </span>
                            ) : (
                              <span className="text-muted fst-italic">Jamais connecté</span>
                            )}
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
                              <span className="d-inline-flex align-items-center gap-1">
                                <span className="badge gstf-badge-neutre"
                                  title={`À changer à la prochaine connexion${u.provisoire_depuis ? `\nProvisoire depuis le ${dateComplete(u.provisoire_depuis)}` : ''}`}>
                                  <i className="bx bx-time-five me-1" aria-hidden="true"></i>Provisoire
                                  {u.provisoire_depuis && <span className="fw-normal ms-1">· {depuis(joursDepuis(u.provisoire_depuis))}</span>}
                                </span>
                                {provisoireEnSouffrance(u) && (
                                  <i className="bx bx-error gstf-comptes__alerte" role="img"
                                    aria-label="Identifiants peut-être non remis"
                                    title={`Jamais utilisé depuis plus de ${SEUIL_PROVISOIRE} jours : les identifiants ont-ils été remis ? Vous pouvez réinitialiser le mot de passe pour en générer de nouveaux.`}></i>
                                )}
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

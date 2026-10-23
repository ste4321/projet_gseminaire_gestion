import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api, { errorMessage } from '../api/client';
import { useFeedback } from '../contexts/FeedbackContext';
import { useAnnonce } from '../contexts/AnnonceContext';
import { useNiveau } from '../contexts/NiveauContext';
import { useAnnee } from '../contexts/AnneeContext';
import { useNotificationsAnnonces } from '../contexts/NotificationAnnonceContext';
import SearchBar from './SearchBar';
import Pagination from './Pagination';
import { plusRecentsDabord } from '../utils/tri';
import { trierNiveaux } from '../utils/niveaux';

// Annonces : publiées par l'administration, lues par leurs destinataires
// (le serveur ne renvoie à chacun que les siennes : à un étudiant, celles des étudiants de son année et de son niveau ;
// à un enseignant, celles des enseignants). À la publication, les destinataires sont prévenus en direct.

// Destinataires : étudiants (d'un niveau ou de tous), enseignants, ou tout le monde (étudiants de l'année + enseignants)
const ETUDIANTS = 'etudiants';
const ENSEIGNANTS = 'enseignants';
const TOUS = 'tous';

// Pas d'année dans le formulaire : le serveur rattache l'annonce à l'année en cours (celle des étudiants inscrits)
const FORMULAIRE_VIDE = { titre: '', description: '', destinataires: ETUDIANTS, id_niveau: '', fichier: null, supprimer_fichier: false };
const TAILLE_MAX = 10 * 1024 * 1024; // 10 Mo, comme le serveur
const EXTENSIONS = ['pdf', 'doc', 'docx', 'xlsx', 'zip', 'jpg', 'jpeg', 'png'];
const PAR_PAGE = 8;

// Une seule liste de choix pour les destinataires et le niveau : 'tous', 'enseignants', 'etudiants' (tous niveaux) ou 'niveau:<id>'
const choixDestinataires = ({ destinataires, id_niveau }) =>
  (destinataires || ETUDIANTS) === ETUDIANTS && id_niveau ? `niveau:${id_niveau}` : destinataires || ETUDIANTS;
const depuisChoix = (choix) =>
  choix.startsWith('niveau:') ? { destinataires: ETUDIANTS, id_niveau: choix.slice(7) } : { destinataires: choix, id_niveau: '' };

const normaliser = (texte) => String(texte ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const extension = (nom) => String(nom ?? '').split('?')[0].split('.').pop().toLowerCase();
const estImage = (url) => ['jpg', 'jpeg', 'png'].includes(extension(url));
const iconeFichier = (url) => {
  const ext = extension(url);
  if (ext === 'pdf') return 'bxs-file-pdf';
  if (['doc', 'docx'].includes(ext)) return 'bxs-file-doc';
  if (ext === 'xlsx') return 'bx-spreadsheet';
  if (ext === 'zip') return 'bxs-file-archive';
  if (estImage(url)) return 'bx-image';
  return 'bx-file';
};
const dateLongue = (iso) => (iso ? new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '');
// « Nouveau » : publiée aujourd'hui (même jour du calendrier, heure locale)
const estNouvelle = (iso) => Boolean(iso) && new Date(iso).toDateString() === new Date().toDateString();

const modal = (id) => window.bootstrap.Modal.getOrCreateInstance(document.getElementById(id));

const AnnonceAdminProf = () => {
  const { notify, confirm } = useFeedback();
  const role = localStorage.getItem('role');
  const admin = role === 'admin';
  const etudiant = role === 'etudiant';
  const { annonces, loading, fetchAnnonces } = useAnnonce();
  const { niveaux } = useNiveau();
  const { annees: anneesListe } = useAnnee();
  const { marquerLues } = useNotificationsAnnonces();
  const location = useLocation();
  const navigate = useNavigate();

  const annees = useMemo(() => [...anneesListe].sort((a, b) => b.id - a.id), [anneesListe]);
  const onglets = trierNiveaux(niveaux);

  const [recherche, setRecherche] = useState('');
  const [filtreNiveau, setFiltreNiveau] = useState(''); // '' = toutes, sinon un choix de destinataires (voir choixDestinataires)
  const [filtreAnnee, setFiltreAnnee] = useState(''); // '' = toutes
  const [page, setPage] = useState(0);
  const [form, setForm] = useState(FORMULAIRE_VIDE);
  const [enEdition, setEnEdition] = useState(null); // annonce modifiée (null = nouvelle)
  const [enregistrement, setEnregistrement] = useState(false);
  const [detail, setDetail] = useState(null);

  useEffect(() => setPage(0), [recherche, filtreNiveau, filtreAnnee]);

  // Page consultée : les annonces affichées ne comptent plus comme non lues (cloche de l'en-tête)
  useEffect(() => {
    if (!loading) marquerLues();
  }, [loading, marquerLues]);

  // Liste mise à jour (en direct ou après une action) : l'annonce ouverte suit ;
  // si elle a été supprimée (ou ne concerne plus ce lecteur), sa fenêtre se ferme
  useEffect(() => {
    if (!detail || loading) return;
    const aJour = annonces.find((a) => a.id === detail.id);
    if (aJour) {
      if (aJour !== detail) setDetail(aJour);
      return;
    }
    const fenetre = document.getElementById('detailAnnonceModal');
    if (fenetre?.classList.contains('show')) {
      modal('detailAnnonceModal').hide();
      if (!admin) notify.info(`« ${detail.titre} » a été retirée.`);
    }
    setDetail(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [annonces]);

  // Arrivée depuis une notification : ouvre directement l'annonce
  const annonceDemandee = location.state?.annonce;
  useEffect(() => {
    if (!annonceDemandee || loading || !window.bootstrap) return;
    const annonce = annonces.find((a) => a.id === annonceDemandee);
    if (annonce) ouvrirDetail(annonce);
    navigate('.', { replace: true, state: null }); // une seule fois, pas à chaque retour sur la page
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [annonceDemandee, loading, annonces]);

  // ---------- Filtres ----------
  const terme = normaliser(recherche);
  const filtrees = useMemo(
    () =>
      plusRecentsDabord(annonces).filter((a) => {
        if (filtreNiveau && choixDestinataires(a) !== filtreNiveau) return false;
        if (filtreAnnee && String(a.id_annee_aca) !== filtreAnnee) return false;
        return !terme || [a.titre, a.description, a.expediteur].some((v) => normaliser(v).includes(terme));
      }),
    [annonces, filtreNiveau, filtreAnnee, terme]
  );
  const totalPages = Math.ceil(filtrees.length / PAR_PAGE);
  const visibles = filtrees.slice(page * PAR_PAGE, (page + 1) * PAR_PAGE);
  const filtresActifs = Boolean(terme || filtreNiveau || filtreAnnee);
  const effacerFiltres = () => {
    setRecherche('');
    setFiltreNiveau('');
    setFiltreAnnee('');
  };

  // ---------- Formulaire (ajout et modification) ----------
  const ouvrirAjout = () => {
    setEnEdition(null);
    setForm(FORMULAIRE_VIDE);
    modal('annonceModal').show();
  };

  const ouvrirModification = (annonce) => {
    setEnEdition(annonce);
    setForm({
      titre: annonce.titre ?? '',
      description: annonce.description ?? '',
      destinataires: annonce.destinataires || ETUDIANTS,
      id_niveau: annonce.id_niveau ? String(annonce.id_niveau) : '',
      fichier: null,
      supprimer_fichier: false,
    });
    modal('annonceModal').show();
  };

  const changer = (champ, valeur) => setForm((f) => ({ ...f, [champ]: valeur }));

  // Vérifié avant l'envoi, avec les mêmes limites que le serveur : pas d'envoi de 10 Mo pour rien
  const choisirFichier = (e) => {
    const fichier = e.target.files[0] || null;
    if (fichier && !EXTENSIONS.includes(extension(fichier.name))) {
      notify.error('Formats acceptés : PDF, Word, Excel, ZIP, JPG, PNG.');
      e.target.value = '';
      return;
    }
    if (fichier && fichier.size > TAILLE_MAX) {
      notify.error('Le fichier ne doit pas dépasser 10 Mo.');
      e.target.value = '';
      return;
    }
    setForm((f) => ({ ...f, fichier, supprimer_fichier: false }));
  };

  const enregistrer = async (e) => {
    e.preventDefault();
    setEnregistrement(true);
    const donnees = new FormData();
    donnees.append('titre', form.titre.trim());
    donnees.append('description', form.description.trim());
    donnees.append('destinataires', form.destinataires);
    donnees.append('id_niveau', form.id_niveau); // vide = tous les niveaux (étudiants)
    if (form.fichier) donnees.append('fichier', form.fichier);
    if (enEdition && form.supprimer_fichier) donnees.append('supprimer_fichier', '1');

    try {
      const url = enEdition ? `/annonces/${enEdition.id}?_method=PUT` : '/annonces';
      await api.post(url, donnees, { headers: { 'Content-Type': 'multipart/form-data' } });
      await fetchAnnonces();
      modal('annonceModal').hide();
      notify.success(enEdition ? 'Annonce modifiée.' : 'Annonce publiée.');
    } catch (err) {
      notify.error(errorMessage(err, enEdition ? "Erreur lors de la modification de l'annonce." : "Erreur lors de la publication de l'annonce."));
    } finally {
      setEnregistrement(false);
    }
  };

  const supprimer = async (annonce) => {
    const ok = await confirm({
      title: `Supprimer « ${annonce.titre} » ?`,
      message: 'Elle disparaîtra pour tous ses destinataires' + (annonce.fichier ? ', avec son fichier joint' : '') + '. Cette action est définitive.',
      confirmLabel: 'Supprimer',
      danger: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/annonces/${annonce.id}`);
      await fetchAnnonces();
      notify.success('Annonce supprimée.');
    } catch (err) {
      notify.error(errorMessage(err, "Erreur lors de la suppression de l'annonce."));
    }
  };

  const ouvrirDetail = (annonce) => {
    setDetail(annonce);
    modal('detailAnnonceModal').show();
  };

  // Action lancée depuis le détail : il se ferme d'abord, pour ne pas empiler deux fenêtres
  const depuisDetail = (action) => {
    const el = document.getElementById('detailAnnonceModal');
    el.addEventListener('hidden.bs.modal', () => action(), { once: true });
    modal('detailAnnonceModal').hide();
  };

  const destinataires = (a) => {
    if (a.destinataires === TOUS) return 'Tout le monde';
    if (a.destinataires === ENSEIGNANTS) return 'Enseignants';
    return a.niveau?.niveau ? `Étudiants ${a.niveau.niveau}` : 'Tous les étudiants';
  };
  const couleurDestinataires = (a) =>
    ({ [TOUS]: 'bg-label-success', [ENSEIGNANTS]: 'bg-label-warning' }[a.destinataires] || (a.niveau ? 'bg-label-primary' : 'bg-label-info'));
  const choixForm = choixDestinataires(form);
  const aideDestinataires = {
    [TOUS]: "Tous les étudiants de l'année et tous les enseignants",
    [ENSEIGNANTS]: 'Les enseignants, et eux seuls',
  }[choixForm] || "Les étudiants de l'année";
  const formulaireValide = form.titre.trim() && form.description.trim();

  return (
    <div className="container-xxl flex-grow-1 container-p-y">
      <h4 className="fw-bold py-3 mb-4">
        <span className="text-muted fw-light text-capitalize">{role} /</span> Annonces
      </h4>
      {loading && <span className="visually-hidden" role="status">Chargement des annonces…</span>}

      <div className="card">
        <h5 className="card-header">
          {etudiant ? 'Mes annonces' : 'Liste des annonces'}
          {loading ? (
            <span className="gstf-squelette d-inline-block align-middle ms-2" style={{ width: '7rem', height: '1rem' }} aria-hidden="true" />
          ) : (
            <small className="text-muted fw-normal ms-2">
              · {filtresActifs ? `${filtrees.length} sur ${annonces.length}` : annonces.length} annonce{annonces.length > 1 ? 's' : ''}
            </small>
          )}
        </h5>

        {admin && (
          <div className="mb-3 ms-4">
            <button className="btn btn-primary" onClick={ouvrirAjout} disabled={loading}>
              <i className="bx bx-plus me-1"></i>Nouvelle annonce
            </button>
          </div>
        )}

        {/* Recherche + filtres (un étudiant ne reçoit déjà que les annonces de son année et de son niveau) */}
        <div className="card-body pb-3">
          <div className="gstf-filtres">
            <SearchBar
              className="gstf-filtres__recherche"
              searchTerm={recherche}
              onSearchChange={setRecherche}
              placeholder="Rechercher dans les annonces…"
            />
            {!etudiant && (
              <div className="d-flex flex-wrap gap-2">
                {admin && (
                  <select className="form-select w-auto" value={filtreNiveau} onChange={(e) => setFiltreNiveau(e.target.value)} aria-label="Filtrer par destinataires">
                    <option value="">Tous les destinataires</option>
                    <option value={TOUS}>Tout le monde</option>
                    <option value={ENSEIGNANTS}>Enseignants</option>
                    <option value={ETUDIANTS}>Tous les étudiants</option>
                    {onglets.map((n) => <option key={n.id} value={`niveau:${n.id}`}>Étudiants {n.niveau}</option>)}
                  </select>
                )}
                <select className="form-select w-auto" value={filtreAnnee} onChange={(e) => setFiltreAnnee(e.target.value)} aria-label="Filtrer par année">
                  <option value="">Toutes les années</option>
                  {annees.map((a) => <option key={a.id} value={String(a.id)}>{a.annee_aca}</option>)}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Liste */}
        <ul className="list-group list-group-flush gstf-annonces" aria-busy={loading}>
          {loading
            ? [0, 1, 2, 3].map((i) => (
                <li className="list-group-item gstf-annonce" key={i} aria-hidden="true">
                  <span className="d-block flex-grow-1">
                    <span className="gstf-squelette mb-2" style={{ width: `${40 + (i % 3) * 12}%`, height: '1rem' }} />
                    <span className="gstf-squelette" style={{ width: '80%', height: '0.75rem' }} />
                  </span>
                  <span className="gstf-squelette" style={{ width: '5.5rem', height: '1.3rem' }} />
                </li>
              ))
            : visibles.map((a) => (
                // Liste : titre, extrait et destinataires ; le reste (date, expéditeur, fichier, actions) est dans le détail
                <li className="list-group-item p-0" key={a.id}>
                  <button type="button" className="gstf-annonce gstf-annonce__corps w-100" onClick={() => ouvrirDetail(a)}>
                    <span className="d-block min-w-0 flex-grow-1">
                      <span className="d-flex align-items-center gap-2 min-w-0">
                        <strong className="gstf-annonce__titre text-truncate">{a.titre}</strong>
                        {estNouvelle(a.created_at) && <span className="badge bg-label-success">Nouveau</span>}
                        {a.fichier && <i className="bx bx-paperclip text-muted" title="Fichier joint" aria-label="Fichier joint"></i>}
                      </span>
                      <span className="gstf-annonce__extrait">{a.description}</span>
                    </span>
                    <span className={`badge text-nowrap ${couleurDestinataires(a)}`}>{destinataires(a)}</span>
                  </button>
                </li>
              ))}
        </ul>

        {!loading && filtrees.length === 0 && (
          <div className="gstf-empty">
            {filtresActifs ? (
              <>
                <i className="bx bx-search-alt d-block"></i>
                Aucune annonce ne correspond à ces critères.
                <div className="mt-3">
                  <button type="button" className="btn btn-sm btn-outline-primary" onClick={effacerFiltres}>Effacer les filtres</button>
                </div>
              </>
            ) : (
              <>
                <i className="bx bx-bell-off d-block"></i>
                {admin ? "Aucune annonce n'a encore été publiée." : "Aucune annonce pour l'instant."}
                {admin && (
                  <div className="mt-3">
                    <button type="button" className="btn btn-sm btn-primary" onClick={ouvrirAjout}>Publier une annonce</button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
      </div>

      {/* Ajout / modification : un seul formulaire */}
      <div className="modal fade" id="annonceModal" tabIndex="-1" aria-labelledby="annonceModalTitre" aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <form className="modal-content" onSubmit={enregistrer} noValidate>
            <div className="modal-header">
              <h5 className="modal-title" id="annonceModalTitre">{enEdition ? "Modifier l'annonce" : 'Nouvelle annonce'}</h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Fermer"></button>
            </div>
            <div className="modal-body">
              <div className="mb-3">
                <label className="form-label" htmlFor="annonce-titre">Titre</label>
                <input id="annonce-titre" type="text" className="form-control" maxLength={255} required
                  placeholder="ex. Retraite spirituelle du 15 novembre"
                  value={form.titre} onChange={(e) => changer('titre', e.target.value)} />
              </div>

              <div className="mb-3">
                <label className="form-label" htmlFor="annonce-contenu">Contenu</label>
                <textarea id="annonce-contenu" className="form-control" rows={6} required
                  placeholder="Le message tel que les destinataires le liront…"
                  value={form.description} onChange={(e) => changer('description', e.target.value)} />
              </div>

              <div className="mb-3">
                <label className="form-label" htmlFor="annonce-destinataires">Destinataires</label>
                <select id="annonce-destinataires" className="form-select" value={choixForm}
                  onChange={(e) => setForm((f) => ({ ...f, ...depuisChoix(e.target.value) }))}>
                  <option value={TOUS}>Tout le monde (étudiants et enseignants)</option>
                  <option value={ENSEIGNANTS}>Enseignants uniquement</option>
                  <optgroup label="Étudiants">
                    <option value={ETUDIANTS}>Tous les niveaux</option>
                    {onglets.map((n) => <option key={n.id} value={`niveau:${n.id}`}>{n.niveau} uniquement</option>)}
                  </optgroup>
                </select>
                <div className="form-text">
                  {aideDestinataires}
                  {enEdition
                    ? ` · annonce de l'année ${enEdition.annee_aca?.annee_aca ?? 'en cours'}.`
                    : ' · année en cours. Ils sont prévenus dès la publication.'}
                </div>
              </div>

              <div>
                <label className="form-label" htmlFor="annonce-fichier">
                  Fichier joint <span className="text-muted fw-normal">(facultatif)</span>
                </label>
                {enEdition?.fichier && !form.fichier && (
                  <div className="d-flex flex-wrap align-items-center gap-3 mb-2 small">
                    <a href={enEdition.fichier} target="_blank" rel="noreferrer" className={form.supprimer_fichier ? 'text-decoration-line-through text-muted' : ''}>
                      <i className={`bx ${iconeFichier(enEdition.fichier)} me-1`}></i>Fichier actuel
                    </a>
                    <div className="form-check mb-0">
                      <input className="form-check-input" type="checkbox" id="annonce-retirer-fichier"
                        checked={form.supprimer_fichier} onChange={(e) => changer('supprimer_fichier', e.target.checked)} />
                      <label className="form-check-label" htmlFor="annonce-retirer-fichier">Retirer le fichier</label>
                    </div>
                  </div>
                )}
                <input id="annonce-fichier" type="file" className="form-control" accept={EXTENSIONS.map((x) => `.${x}`).join(',')} onChange={choisirFichier} />
                <div className="form-text">
                  PDF, Word, Excel, ZIP, JPG ou PNG · 10 Mo maximum{enEdition?.fichier ? ' · un nouveau fichier remplace l\'actuel' : ''}.
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" data-bs-dismiss="modal">Annuler</button>
              <button type="submit" className="btn btn-primary" disabled={enregistrement || !formulaireValide}>
                {enregistrement ? 'Patientez…' : enEdition ? 'Enregistrer' : 'Publier'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Détail */}
      <div className="modal fade" id="detailAnnonceModal" tabIndex="-1" aria-labelledby="detailAnnonceTitre" aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-lg">
          <div className="modal-content">
            {detail && (
              <>
                <div className="modal-header gstf-fiche__entete">
                  <div className="min-w-0">
                    <h5 className="modal-title mb-1" id="detailAnnonceTitre">{detail.titre}</h5>
                    <div className="small text-muted">
                      {detail.expediteur} · {dateLongue(detail.created_at)}
                      {!etudiant && ` · ${destinataires(detail)}${detail.annee_aca?.annee_aca ? ` · ${detail.annee_aca.annee_aca}` : ''}`}
                    </div>
                  </div>
                  <button type="button" className="btn-close align-self-start" data-bs-dismiss="modal" aria-label="Fermer"></button>
                </div>
                <div className="modal-body">
                  <p className="gstf-annonce__texte mb-0">{detail.description}</p>
                  {detail.fichier && (
                    <div className="mt-4">
                      {estImage(detail.fichier) && (
                        <img src={detail.fichier} alt={`Fichier joint à « ${detail.titre} »`} className="img-fluid rounded border mb-2" style={{ maxHeight: '22rem' }} />
                      )}
                      <a href={detail.fichier} target="_blank" rel="noreferrer" className="btn btn-outline-primary btn-sm">
                        <i className={`bx ${iconeFichier(detail.fichier)} me-1`}></i>
                        Ouvrir le fichier joint ({extension(detail.fichier).toUpperCase()})
                      </a>
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  {admin && (
                    <button type="button" className="btn btn-outline-danger me-auto" onClick={() => depuisDetail(() => supprimer(detail))}>
                      <i className="bx bx-trash me-1"></i>Supprimer
                    </button>
                  )}
                  <button type="button" className="btn btn-outline-secondary" data-bs-dismiss="modal">Fermer</button>
                  {admin && (
                    <button type="button" className="btn btn-primary" onClick={() => depuisDetail(() => ouvrirModification(detail))}>
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

export default AnnonceAdminProf;

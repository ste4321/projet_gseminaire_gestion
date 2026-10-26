import React, { useEffect, useMemo, useState } from 'react';
import { useInfo } from '../../contexts/InfoContext';
import api, { errorMessage } from '../../api/client';
import { useFeedback } from '../../contexts/FeedbackContext';
import { confirmerAvecCode } from '../../utils/confirmation';
import SearchBar from '../../components/SearchBar';
import Pagination from '../../components/Pagination';
import LigneAnnonce, { LignesAnnonceChargement } from '../../components/LigneAnnonce';
import { plusRecentsDabord } from '../../utils/tri';

// Actualités du site vitrine (projet_gseminaire_frontend) : publiées ici, visibles par tous les visiteurs.
// Publication : code de confirmation à recopier (vérifié aussi par le serveur). Le site se met à jour en direct.
// Après un ajout, une modification ou une suppression, la liste est mise à jour avec la réponse du serveur
// (pas de rechargement complet).

const FORMULAIRE_VIDE = { titre: '', auteur: '', description: '' };
const MAX_TITRE = 255; // mêmes limites que le serveur
const MAX_TEXTE = 20000;
const PAR_PAGE = 8;

const normaliser = (texte) => String(texte ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
// « Jeudi 23 octobre 2026 à 10 h 15 »
const dateHeure = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const jour = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return `${jour.charAt(0).toUpperCase()}${jour.slice(1)} à ${d.getHours()} h ${String(d.getMinutes()).padStart(2, '0')}`;
};
const estModifiee = (a) => Boolean(a?.updated_at && a?.created_at) && new Date(a.updated_at) - new Date(a.created_at) > 60000;
const initiales = (nom) => String(nom || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((m) => m[0].toUpperCase()).join('');
// Liens du texte cliquables (sans interpréter de HTML)
const LIEN = /(https?:\/\/[^\s<]+[^\s<.,;:!?)\]'"»])/g;
const avecLiens = (texte) =>
  String(texte ?? '').split(LIEN).map((morceau, i) =>
    i % 2 ? <a key={i} href={morceau} target="_blank" rel="noreferrer noopener">{morceau}</a> : morceau
  );

const modal = (id) => window.bootstrap.Modal.getOrCreateInstance(document.getElementById(id));

const Info = () => {
  const { notify, confirm } = useFeedback();
  const { infos, setInfos, loading } = useInfo();
  const nomAdmin = localStorage.getItem('nom_prenom') || '';

  const [recherche, setRecherche] = useState('');
  const [page, setPage] = useState(0);
  const [form, setForm] = useState(FORMULAIRE_VIDE);
  const [enEdition, setEnEdition] = useState(null); // actualité modifiée (null = nouvelle)
  const [enregistrement, setEnregistrement] = useState(false);
  const [detail, setDetail] = useState(null);

  useEffect(() => setPage(0), [recherche]);

  // ---------- Liste ----------
  const terme = normaliser(recherche);
  const filtrees = useMemo(
    () => plusRecentsDabord(infos).filter((a) => !terme || [a.titre, a.description, a.auteur].some((v) => normaliser(v).includes(terme))),
    [infos, terme]
  );
  const totalPages = Math.ceil(filtrees.length / PAR_PAGE);
  const visibles = filtrees.slice(page * PAR_PAGE, (page + 1) * PAR_PAGE);
  // Auteurs déjà utilisés : proposés à la saisie
  const auteurs = useMemo(() => [...new Set(infos.map((a) => a.auteur).filter(Boolean))].sort(), [infos]);

  // Détail : actualités voisines dans la liste affichée
  const rang = detail ? filtrees.findIndex((a) => a.id === detail.id) : -1;
  const plusRecente = rang > 0 ? filtrees[rang - 1] : null;
  const plusAncienne = rang >= 0 && rang < filtrees.length - 1 ? filtrees[rang + 1] : null;
  const naviguer = (e) => {
    if (e.target.closest('input, textarea, select')) return;
    if (e.key === 'ArrowLeft' && plusRecente) setDetail(plusRecente);
    if (e.key === 'ArrowRight' && plusAncienne) setDetail(plusAncienne);
  };

  // Mise à jour locale avec l'actualité renvoyée par le serveur
  const remplacer = (info) => setInfos((liste) => {
    const existe = liste.some((a) => a.id === info.id);
    return existe ? liste.map((a) => (a.id === info.id ? info : a)) : [info, ...liste];
  });

  // ---------- Formulaire (ajout et modification) ----------
  const ouvrirAjout = () => {
    setEnEdition(null);
    setForm({ ...FORMULAIRE_VIDE, auteur: nomAdmin });
    modal('infoModal').show();
  };

  const ouvrirModification = (info) => {
    setEnEdition(info);
    setForm({ titre: info.titre ?? '', auteur: info.auteur ?? '', description: info.description ?? '' });
    modal('infoModal').show();
  };

  const changer = (champ, valeur) => setForm((f) => ({ ...f, [champ]: valeur }));
  const donnees = () => ({ titre: form.titre.trim(), auteur: form.auteur.trim(), description: form.description.trim() });
  const formulaireValide = form.titre.trim() && form.auteur.trim(); // contenu facultatif, comme côté serveur

  const enregistrer = async (e) => {
    e.preventDefault();
    if (!formulaireValide) return;
    setEnregistrement(true);

    // Nouvelle actualité : publiée sur le site public, après le code de confirmation.
    // La fenêtre est masquée pendant la confirmation, puis rouverte si on annule.
    let code;
    if (!enEdition) {
      modal('infoModal').hide();
      try {
        code = await confirmerAvecCode(confirm, 'publier_actualite', {
          title: 'Publier cette actualité sur le site ?',
          message: `« ${form.titre.trim()} » sera visible immédiatement par tous les visiteurs du site du séminaire.`,
          confirmLabel: 'Publier sur le site',
        });
      } catch (err) {
        notify.error(errorMessage(err, "Impossible d'obtenir un code de confirmation."));
      }
      if (!code) {
        setEnregistrement(false);
        modal('infoModal').show();
        return;
      }
    }

    try {
      const res = enEdition
        ? await api.put(`/infos/${enEdition.id}`, donnees())
        : await api.post('/infos', { ...donnees(), code_confirmation: code });
      remplacer(res.data);
      if (detail?.id === res.data.id) setDetail(res.data);
      modal('infoModal').hide();
      notify.success(enEdition ? 'Actualité modifiée : le site est à jour.' : 'Actualité publiée sur le site.');
    } catch (err) {
      notify.error(errorMessage(err, enEdition ? 'Erreur lors de la modification.' : 'Erreur lors de la publication.'));
      modal('infoModal').show();
    } finally {
      setEnregistrement(false);
    }
  };

  const supprimer = async (info) => {
    const ok = await confirm({
      title: `Supprimer « ${info.titre} » ?`,
      message: "Elle disparaîtra aussitôt du site du séminaire. Cette action est définitive.",
      confirmLabel: 'Supprimer',
      danger: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/infos/${info.id}`);
      setInfos((liste) => liste.filter((a) => a.id !== info.id));
      notify.success('Actualité supprimée du site.');
    } catch (err) {
      notify.error(errorMessage(err, 'Erreur lors de la suppression.'));
    }
  };

  // ---------- Détail ----------
  const ouvrirDetail = (info) => {
    setDetail(info);
    modal('detailInfoModal').show();
  };

  // Action lancée depuis le détail : il se ferme d'abord, pour ne pas empiler deux fenêtres
  const depuisDetail = (action) => {
    const el = document.getElementById('detailInfoModal');
    el.addEventListener('hidden.bs.modal', () => action(), { once: true });
    modal('detailInfoModal').hide();
  };

  return (
    <div className="container-xxl flex-grow-1 container-p-y">
      <div className="gstf-page-header">
        <div>
          <h4 className="fw-bold mb-1">
            <span className="text-muted fw-light">Administration /</span> Actualités du site
          </h4>
          <small className="text-muted">Publiées sur le site du séminaire, visibles par tous les visiteurs.</small>
        </div>
        <button className="btn btn-primary" onClick={ouvrirAjout} disabled={loading}>
          <i className="bx bx-plus me-1"></i>Nouvelle actualité
        </button>
      </div>
      {loading && <span className="visually-hidden" role="status">Chargement des actualités…</span>}

      <div className="card">
        <h5 className="card-header">
          Actualités publiées
          {loading ? (
            <span className="gstf-squelette d-inline-block align-middle ms-2" style={{ width: '7rem', height: '1rem' }} aria-hidden="true" />
          ) : (
            <small className="text-muted fw-normal ms-2">
              · {terme ? `${filtrees.length} sur ${infos.length}` : infos.length} actualité{infos.length > 1 ? 's' : ''}
            </small>
          )}
        </h5>

        <div className="card-body pb-3">
          <SearchBar searchTerm={recherche} onSearchChange={setRecherche} placeholder="Rechercher par titre, contenu ou auteur…" />
        </div>

        <ul className="list-group list-group-flush gstf-annonces" aria-busy={loading}>
          {loading ? (
            <LignesAnnonceChargement />
          ) : (
            visibles.map((a) => (
              <LigneAnnonce key={a.id} annonce={{ ...a, expediteur: a.auteur }} onClick={() => ouvrirDetail(a)} />
            ))
          )}
        </ul>

        {!loading && filtrees.length === 0 && (
          <div className="gstf-empty">
            {terme ? (
              <>
                <i className="bx bx-search-alt d-block"></i>
                Aucune actualité ne correspond à « {recherche} ».
                <div className="mt-3">
                  <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => setRecherche('')}>Effacer la recherche</button>
                </div>
              </>
            ) : (
              <>
                <i className="bx bx-globe d-block"></i>
                Aucune actualité n'est encore publiée sur le site.
                <div className="mt-3">
                  <button type="button" className="btn btn-sm btn-primary" onClick={ouvrirAjout}>Publier une actualité</button>
                </div>
              </>
            )}
          </div>
        )}

        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
      </div>

      {/* Ajout / modification : un seul formulaire */}
      <div className="modal fade" id="infoModal" tabIndex="-1" aria-labelledby="infoModalTitre" aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <form className="modal-content" onSubmit={enregistrer} noValidate>
            <div className="modal-header">
              <h5 className="modal-title" id="infoModalTitre">{enEdition ? "Modifier l'actualité" : 'Nouvelle actualité'}</h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Fermer"></button>
            </div>
            <div className="modal-body">
              <div className="mb-3">
                <label className="form-label" htmlFor="info-titre">Titre</label>
                <input id="info-titre" type="text" className="form-control" maxLength={MAX_TITRE} required
                  placeholder="ex. Fête de la Toussaint"
                  value={form.titre} onChange={(e) => changer('titre', e.target.value)} />
              </div>

              <div className="mb-3">
                <label className="form-label" htmlFor="info-auteur">Auteur</label>
                <input id="info-auteur" type="text" className="form-control" maxLength={255} required list="info-auteurs"
                  placeholder="ex. Père Rodolphe, Secrétariat…"
                  value={form.auteur} onChange={(e) => changer('auteur', e.target.value)} />
                <datalist id="info-auteurs">
                  {auteurs.map((a) => <option key={a} value={a} />)}
                </datalist>
                <div className="form-text">Affiché sous l'actualité sur le site.</div>
              </div>

              <div>
                <label className="form-label" htmlFor="info-texte">
                  Contenu <span className="text-muted fw-normal">(facultatif)</span>
                </label>
                <textarea id="info-texte" className="form-control" rows={8} maxLength={MAX_TEXTE}
                  placeholder="Le texte tel que les visiteurs du site le liront…"
                  value={form.description} onChange={(e) => changer('description', e.target.value)} />
                <div className="form-text d-flex justify-content-between gap-2">
                  <span>{enEdition ? 'La modification est visible aussitôt sur le site.' : 'Un code de confirmation vous sera demandé avant la publication.'}</span>
                  <span className="text-nowrap">{form.description.length.toLocaleString('fr-FR')} / {MAX_TEXTE.toLocaleString('fr-FR')}</span>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" data-bs-dismiss="modal">Annuler</button>
              <button type="submit" className="btn btn-primary" disabled={enregistrement || !formulaireValide}>
                {enregistrement ? 'Patientez…' : enEdition ? 'Enregistrer' : 'Publier sur le site'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Détail */}
      <div className="modal fade" id="detailInfoModal" tabIndex="-1" aria-labelledby="detailInfoTitre" aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-lg">
          <div className="modal-content" onKeyDown={naviguer}>
            {detail && (
              <>
                <div className="modal-header gstf-annonce-detail__entete">
                  <span className="gstf-pastille-annonce" aria-hidden="true"><i className="bx bx-globe"></i></span>
                  <div className="min-w-0 flex-grow-1">
                    <div className="d-flex flex-wrap gap-1 mb-2">
                      <span className="badge gstf-badge-neutre"><i className="bx bx-globe me-1" aria-hidden="true"></i>Site du séminaire</span>
                      {estModifiee(detail) && (
                        <span className="badge gstf-badge-neutre" title={`Modifiée le ${dateHeure(detail.updated_at)}`}>Modifiée</span>
                      )}
                    </div>
                    <h4 className="modal-title gstf-annonce-detail__titre" id="detailInfoTitre">{detail.titre}</h4>
                  </div>
                  <button type="button" className="btn-close align-self-start" data-bs-dismiss="modal" aria-label="Fermer"></button>
                </div>

                <div className="modal-body">
                  <div className="gstf-annonce-detail__meta">
                    <span className="d-inline-flex align-items-center gap-2">
                      <span className="avatar avatar-sm">
                        <span className="avatar-initial rounded-circle bg-label-primary">{initiales(detail.auteur)}</span>
                      </span>
                      <strong className="text-body">{detail.auteur}</strong>
                    </span>
                    <span><i className="bx bx-calendar me-1" aria-hidden="true"></i>{dateHeure(detail.created_at)}</span>
                  </div>
                  {detail.description ? (
                    <div className="gstf-annonce-detail__texte">{avecLiens(detail.description)}</div>
                  ) : (
                    <p className="text-muted fst-italic mb-0">Pas de texte : seul le titre est affiché sur le site.</p>
                  )}
                </div>

                <div className="modal-footer gstf-annonce-detail__pied">
                  {filtrees.length > 1 && rang >= 0 && (
                    <div className="btn-group me-auto" role="group" aria-label="Autres actualités">
                      <button type="button" className="btn btn-sm btn-outline-secondary" disabled={!plusRecente}
                        onClick={() => setDetail(plusRecente)} title="Actualité plus récente (←)">
                        <i className="bx bx-chevron-left"></i><span className="d-none d-sm-inline">Plus récente</span>
                      </button>
                      <span className="btn btn-sm btn-outline-secondary disabled gstf-annonce-detail__position">{rang + 1} / {filtrees.length}</span>
                      <button type="button" className="btn btn-sm btn-outline-secondary" disabled={!plusAncienne}
                        onClick={() => setDetail(plusAncienne)} title="Actualité plus ancienne (→)">
                        <span className="d-none d-sm-inline">Plus ancienne</span><i className="bx bx-chevron-right"></i>
                      </button>
                    </div>
                  )}
                  <button type="button" className="btn btn-outline-danger" onClick={() => depuisDetail(() => supprimer(detail))}>
                    <i className="bx bx-trash me-1"></i>Supprimer
                  </button>
                  <button type="button" className="btn btn-primary" onClick={() => depuisDetail(() => ouvrirModification(detail))}>
                    <i className="bx bx-edit me-1"></i>Modifier
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Info;

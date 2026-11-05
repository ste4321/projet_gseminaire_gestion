import React, { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api, { errorMessage } from '../../api/client';
import { storageUrl } from '../../config';
import { useFeedback } from '../../contexts/FeedbackContext';
import { useDonneesEnseignant } from '../../contexts/EspaceEnseignantContext';
import { ListeCarteChargement } from '../../components/Squelettes';
import useMesMatieres from '../../hooks/useMesMatieres';

const dateCourte = (iso) => (iso ? new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '');

// Même limite que le serveur (EspaceEnseignantController::reglesLecon) : vérifiée avant l'envoi
const TAILLE_MAX = 10 * 1024 * 1024;
const CHAMPS_AFFICHES = ['titre', 'contenu', 'fichier'];
// Un fichier de plusieurs Mo peut mettre plus de 30 s à partir sur une connexion lente
const DELAI_ENVOI = 120000;
const tailleLisible = (octets) => `${(octets / 1024 / 1024).toFixed(1).replace('.', ',')} Mo`;

const versFormulaire = ({ titre, contenu, publier }) => {
  const donnees = new FormData();
  donnees.append('titre', titre);
  donnees.append('contenu', contenu || '');
  donnees.append('publier', publier ? '1' : '0');
  return donnees;
};

// Fenêtre d'ajout ou de modification. Elle n'existe à l'écran que lorsqu'elle est ouverte.
const FenetreLecon = ({ lecon, matieres, matiereParDefaut, annee, onEnregistree, onClose }) => {
  const [form, setForm] = useState({
    id_matiere: lecon?.id_matiere ?? (matiereParDefaut || matieres[0]?.id || ''),
    titre: lecon?.titre ?? '',
    contenu: lecon?.contenu ?? '',
    publier: Boolean(lecon?.publie_le),
  });
  const [fichier, setFichier] = useState(null);
  const [retirer, setRetirer] = useState(false);
  const [erreurs, setErreurs] = useState({});
  const [erreurGenerale, setErreurGenerale] = useState(null);
  const [envoi, setEnvoi] = useState(false);

  const changer = (champ, valeur) => {
    setForm((avant) => ({ ...avant, [champ]: valeur }));
    setErreurs((avant) => ({ ...avant, [champ]: undefined }));
  };

  // Fichier trop lourd : signalé dès qu'il est choisi, sans attendre un envoi voué à l'échec
  const choisirFichier = (choisi) => {
    setFichier(choisi);
    setErreurs((avant) => ({
      ...avant,
      fichier: choisi && choisi.size > TAILLE_MAX
        ? [`Ce fichier fait ${tailleLisible(choisi.size)} : 10 Mo maximum. Compressez-le ou découpez-le en plusieurs leçons.`]
        : undefined,
    }));
  };

  const envoyer = async (publier) => {
    if (fichier && fichier.size > TAILLE_MAX) {
      choisirFichier(fichier);
      return;
    }
    setEnvoi(true);
    setErreurs({});
    setErreurGenerale(null);
    const donnees = versFormulaire({ ...form, publier });
    if (fichier) donnees.append('fichier', fichier);
    if (retirer) donnees.append('supprimer_fichier', '1');
    const options = { timeout: DELAI_ENVOI };
    try {
      if (lecon) {
        await api.post(`/enseignant/lecons/${lecon.id}`, donnees, options);
      } else {
        donnees.append('id_annee_aca', annee);
        donnees.append('id_matiere', form.id_matiere);
        await api.post('/enseignant/lecons', donnees, options);
      }
    } catch (err) {
      const champs = err.response?.data?.errors;
      if (champs) setErreurs(champs);
      // Erreur sur un champ qui n'est pas dans le formulaire (matière, année…) ou sans détail : message en haut
      if (!champs || Object.keys(champs).some((c) => !CHAMPS_AFFICHES.includes(c))) {
        setErreurGenerale(errorMessage(err, "La leçon n'a pas pu être enregistrée. Réessayez dans un instant."));
      }
      setEnvoi(false);
      return;
    }
    onEnregistree(publier);
  };

  const soumettre = (e) => {
    e.preventDefault();
    envoyer(true);
  };

  return (
    <>
      <div className="modal fade show d-block" tabIndex="-1" role="dialog" aria-modal="true" aria-labelledby="lecon-titre">
        <div className="modal-dialog modal-dialog-centered modal-lg" role="document">
          <form className="modal-content" onSubmit={soumettre}>
            <div className="modal-header">
              <h5 className="modal-title" id="lecon-titre">{lecon ? 'Modifier la leçon' : 'Nouvelle leçon'}</h5>
              <button type="button" className="btn-close" onClick={onClose} disabled={envoi} aria-label="Fermer"></button>
            </div>
            <div className="modal-body">
              {erreurGenerale && <div className="alert alert-danger" role="alert">{erreurGenerale}</div>}

              <div className="mb-3">
                <label className="form-label" htmlFor="lecon-matiere">Matière</label>
                <select id="lecon-matiere" className="form-select" value={form.id_matiere} disabled={Boolean(lecon)}
                  onChange={(e) => changer('id_matiere', e.target.value)} required>
                  {matieres.map((m) => <option key={m.id} value={m.id}>{m.matiere} ({m.niveau})</option>)}
                </select>
              </div>

              <div className="mb-3">
                <label className="form-label" htmlFor="lecon-nom">Titre</label>
                <input id="lecon-nom" className={`form-control ${erreurs.titre ? 'is-invalid' : ''}`} value={form.titre}
                  onChange={(e) => changer('titre', e.target.value)} maxLength={255} placeholder="ex. Chapitre 1 : Introduction" required autoFocus />
                {erreurs.titre && <div className="invalid-feedback">{erreurs.titre[0]}</div>}
              </div>

              <div className="mb-3">
                <label className="form-label" htmlFor="lecon-contenu">Texte <span className="text-muted fw-normal">(facultatif si un fichier est joint)</span></label>
                <textarea id="lecon-contenu" className={`form-control ${erreurs.contenu ? 'is-invalid' : ''}`} rows={7} value={form.contenu}
                  onChange={(e) => changer('contenu', e.target.value)} placeholder="Résumé, plan du cours, consignes, lectures à préparer…" />
                {erreurs.contenu && <div className="invalid-feedback">{erreurs.contenu[0]}</div>}
              </div>

              <div className="mb-1">
                <label className="form-label" htmlFor="lecon-fichier">Fichier <span className="text-muted fw-normal">(facultatif)</span></label>
                {lecon?.fichier && !fichier && (
                  <div className="d-flex flex-wrap align-items-center gap-3 mb-2 small">
                    <a href={storageUrl(lecon.fichier)} target="_blank" rel="noreferrer" className={retirer ? 'text-decoration-line-through text-muted' : ''}>
                      <i className="bx bx-paperclip me-1"></i>{lecon.nom_fichier || 'Fichier actuel'}
                    </a>
                    <div className="form-check mb-0">
                      <input id="lecon-retirer" type="checkbox" className="form-check-input" checked={retirer} onChange={(e) => setRetirer(e.target.checked)} />
                      <label className="form-check-label" htmlFor="lecon-retirer">Retirer ce fichier</label>
                    </div>
                  </div>
                )}
                <input id="lecon-fichier" type="file" className={`form-control ${erreurs.fichier ? 'is-invalid' : ''}`}
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.xlsx,.zip,.jpg,.jpeg,.png" onChange={(e) => choisirFichier(e.target.files[0] || null)} />
                {erreurs.fichier && <div className="invalid-feedback">{erreurs.fichier[0]}</div>}
                <div className="form-text">PDF, Word, PowerPoint, Excel, ZIP, JPG ou PNG · 10 Mo maximum.</div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary me-auto" onClick={onClose} disabled={envoi}>Annuler</button>
              <button type="button" className="btn btn-outline-primary" onClick={() => envoyer(false)} disabled={envoi || !form.titre.trim()}
                title="Les étudiants ne la voient pas encore">
                {lecon?.publie_le ? 'Repasser en brouillon' : 'Enregistrer en brouillon'}
              </button>
              <button type="submit" className="btn btn-primary d-flex align-items-center" disabled={envoi}>
                {lecon?.publie_le ? 'Enregistrer' : 'Publier'}
                {envoi && <span className="spinner-border spinner-border-sm ms-2" />}
              </button>
            </div>
          </form>
        </div>
      </div>
      <div className="modal-backdrop fade show"></div>
    </>
  );
};

const MesLecons = () => {
  const { notify, confirm } = useFeedback();
  const [params, setParams] = useSearchParams();
  const filtreMatiere = params.get('matiere') || '';
  const { annees, annee, matieres, chargement, erreur: erreurMatieres, recharger: rechargerMatieres } = useMesMatieres(params.get('annee') || '');

  // Gardées en mémoire d'une page à l'autre (EspaceEnseignantContext)
  const { data: lecons, erreur, recharger: rechargerLecons } = useDonneesEnseignant(
    annee ? '/enseignant/lecons' : null,
    { annee },
    'Impossible de charger vos leçons.'
  );
  const [fenetre, setFenetre] = useState(null); // null, 'nouvelle' ou la leçon modifiée
  const [enCours, setEnCours] = useState(null);

  const actualiser = useCallback(() => {
    rechargerLecons();
    rechargerMatieres();
  }, [rechargerLecons, rechargerMatieres]);

  const affichees = useMemo(
    () => (lecons || []).filter((l) => !filtreMatiere || String(l.id_matiere) === filtreMatiere),
    [lecons, filtreMatiere]
  );

  const filtrer = (changements) => {
    const suivants = { annee: annee ?? '', matiere: filtreMatiere, ...changements };
    setParams(Object.fromEntries(Object.entries(suivants).filter(([, v]) => v)));
  };

  const enregistree = (publiee) => {
    setFenetre(null);
    actualiser();
    notify.success(publiee ? 'Leçon publiée : les étudiants peuvent la consulter.' : 'Leçon enregistrée en brouillon.');
  };

  const basculer = async (lecon) => {
    const publier = !lecon.publie_le;
    setEnCours(lecon.id);
    try {
      await api.post(`/enseignant/lecons/${lecon.id}`, versFormulaire({ ...lecon, publier }));
      actualiser();
      notify.success(publier ? 'Leçon publiée : les étudiants peuvent la consulter.' : 'Leçon retirée : les étudiants ne la voient plus.');
    } catch (err) {
      notify.error(errorMessage(err, 'La modification a échoué.'));
    } finally {
      setEnCours(null);
    }
  };

  const supprimer = async (lecon) => {
    const ok = await confirm({
      title: `Supprimer « ${lecon.titre} » ?`,
      message: `Elle disparaîtra pour les étudiants${lecon.fichier ? ', avec son fichier joint' : ''}. Cette action est définitive.`,
      confirmLabel: 'Supprimer',
      danger: true,
    });
    if (!ok) return;
    setEnCours(lecon.id);
    try {
      const res = await api.delete(`/enseignant/lecons/${lecon.id}`);
      actualiser();
      notify.success(res.data.message);
    } catch (err) {
      notify.error(errorMessage(err, 'La suppression a échoué.'));
    } finally {
      setEnCours(null);
    }
  };

  const chargementListe = chargement || (Boolean(annee) && lecons === null && !erreur);
  const probleme = erreurMatieres || erreur;

  return (
    <div className="container-xxl flex-grow-1 container-p-y">
      <div className="gstf-page-header">
        <div>
          <h4 className="fw-bold mb-1">Mes leçons</h4>
          <small className="text-muted">Vos supports de cours, visibles par les étudiants de la matière une fois publiés.</small>
        </div>
        {matieres.length > 0 && (
          <button type="button" className="btn btn-primary" onClick={() => setFenetre('nouvelle')}>
            <i className="bx bx-plus me-1"></i>Nouvelle leçon
          </button>
        )}
      </div>

      {(annees.length > 1 || matieres.length > 1) && (
        <div className="d-flex flex-wrap gap-2 mb-3">
          {annees.length > 1 && (
            <select className="form-select w-auto" aria-label="Année académique" value={annee ?? ''} onChange={(e) => filtrer({ annee: e.target.value, matiere: '' })}>
              {annees.map((a) => <option key={a.id} value={a.id}>{a.annee_aca}</option>)}
            </select>
          )}
          {matieres.length > 1 && (
            <select className="form-select w-auto" aria-label="Filtrer par matière" value={filtreMatiere} onChange={(e) => filtrer({ matiere: e.target.value })}>
              <option value="">Toutes les matières</option>
              {matieres.map((m) => <option key={m.id} value={m.id}>{m.matiere} ({m.niveau})</option>)}
            </select>
          )}
        </div>
      )}

      {probleme ? (
        <div className="card">
          <div className="gstf-empty">
            <i className="bx bx-error-circle d-block"></i>
            <p className="mb-3">{probleme}</p>
            <button type="button" className="btn btn-sm btn-outline-primary" onClick={actualiser}>Réessayer</button>
          </div>
        </div>
      ) : chargementListe ? (
        <ListeCarteChargement actions lignes={4} libelle="Chargement de vos leçons…" />
      ) : matieres.length === 0 ? (
        <div className="card">
          <div className="gstf-empty">
            <i className="bx bx-book d-block"></i>
            Aucune matière ne vous est attribuée pour le moment : les leçons se déposent par matière.
          </div>
        </div>
      ) : affichees.length === 0 ? (
        <div className="card">
          <div className="gstf-empty">
            <i className="bx bx-book-open d-block"></i>
            Aucune leçon pour le moment.
            <div className="mt-3">
              <button type="button" className="btn btn-sm btn-primary" onClick={() => setFenetre('nouvelle')}>Déposer une leçon</button>
            </div>
          </div>
        </div>
      ) : (
        <div className="card">
          <ul className="list-group list-group-flush">
            {affichees.map((l) => (
              <li className="list-group-item d-flex flex-wrap align-items-center gap-3 py-3" key={l.id}>
                <div className="flex-grow-1 min-w-0">
                  <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
                    <strong>{l.titre}</strong>
                    {l.publie_le
                      ? <span className="badge bg-label-success">Publiée</span>
                      : <span className="badge bg-label-secondary">Brouillon</span>}
                  </div>
                  <small className="text-muted d-block">
                    {l.matiere?.matiere}
                    {l.publie_le ? ` · publiée le ${dateCourte(l.publie_le)}` : ''}
                  </small>
                  {l.fichier && (
                    <a href={storageUrl(l.fichier)} target="_blank" rel="noreferrer" className="small">
                      <i className="bx bx-paperclip me-1"></i>{l.nom_fichier || 'Fichier joint'}
                    </a>
                  )}
                </div>
                <div className="d-flex gap-2">
                  <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => basculer(l)} disabled={enCours === l.id}>
                    {l.publie_le ? 'Retirer' : 'Publier'}
                  </button>
                  <button type="button" className="btn btn-sm btn-icon btn-outline-secondary" onClick={() => setFenetre(l)} disabled={enCours === l.id}
                    title="Modifier" aria-label={`Modifier ${l.titre}`}>
                    <i className="bx bx-edit"></i>
                  </button>
                  <button type="button" className="btn btn-sm btn-icon btn-outline-danger" onClick={() => supprimer(l)} disabled={enCours === l.id}
                    title="Supprimer" aria-label={`Supprimer ${l.titre}`}>
                    <i className="bx bx-trash"></i>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {fenetre && (
        <FenetreLecon
          lecon={fenetre === 'nouvelle' ? null : fenetre}
          matieres={matieres}
          matiereParDefaut={filtreMatiere}
          annee={annee}
          onEnregistree={enregistree}
          onClose={() => setFenetre(null)}
        />
      )}
    </div>
  );
};

export default MesLecons;

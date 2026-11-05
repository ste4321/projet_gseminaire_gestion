import React, { useCallback, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api, { errorMessage } from '../../api/client';
import { storageUrl } from '../../config';
import { useFeedback } from '../../contexts/FeedbackContext';
import { useDonneesEnseignant } from '../../contexts/EspaceEnseignantContext';
import { CoursChargement } from '../../components/Squelettes';
import SearchBar from '../../components/SearchBar';
import useMesMatieres from '../../hooks/useMesMatieres';
import { dateCourte, extension, iconeFichier } from '../../utils/lecons';

const normaliser = (texte) => String(texte ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
// Terme recherché surligné (comparaison sans accents ni majuscules)
const surligner = (texte, recherche) => {
  const terme = normaliser(recherche);
  const i = terme ? normaliser(texte).indexOf(terme) : -1;
  if (i < 0) return texte;
  return <>{texte.slice(0, i)}<mark>{texte.slice(i, i + terme.length)}</mark>{texte.slice(i + terme.length)}</>;
};
const initiales = (nom) => String(nom || '?').split(/\s+/).filter((m) => m.length > 2 || /^[A-Z]/.test(m)).slice(0, 2).map((m) => m[0].toUpperCase()).join('') || '?';

// Même limite que le serveur (EspaceEnseignantController::reglesLecon) : vérifiée avant l'envoi
const TAILLE_MAX = 10 * 1024 * 1024;
const CHAMPS_AFFICHES = ['titre', 'contenu', 'fichier'];
// Un fichier de plusieurs Mo peut mettre plus de 30 s à partir sur une connexion lente
const DELAI_ENVOI = 120000;
const tailleLisible = (octets) => `${(octets / 1024 / 1024).toFixed(1).replace('.', ',')} Mo`;

export const versFormulaire = ({ titre, contenu, publier }) => {
  const donnees = new FormData();
  donnees.append('titre', titre);
  donnees.append('contenu', contenu || '');
  donnees.append('publier', publier ? '1' : '0');
  return donnees;
};

// Fenêtre d'ajout ou de modification. Elle n'existe à l'écran que lorsqu'elle est ouverte.
export const FenetreLecon = ({ lecon, matieres, matiereParDefaut, annee, onEnregistree, onClose }) => {
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

const STATUTS = [
  { valeur: '', libelle: 'Toutes' },
  { valeur: 'publiee', libelle: 'Publiées' },
  { valeur: 'brouillon', libelle: 'Brouillons' },
];

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
  const [fenetre, setFenetre] = useState(null); // null, { lecon } (modification) ou { matiere } (nouvelle leçon)
  const [enCours, setEnCours] = useState(null);
  const [recherche, setRecherche] = useState('');
  const [statut, setStatut] = useState(''); // '', 'publiee' ou 'brouillon'

  const actualiser = useCallback(() => {
    rechargerLecons();
    rechargerMatieres();
  }, [rechargerLecons, rechargerMatieres]);

  const terme = normaliser(recherche);
  const toutes = useMemo(() => lecons || [], [lecons]);
  const nombres = {
    '': toutes.length,
    publiee: toutes.filter((l) => l.publie_le).length,
    brouillon: toutes.filter((l) => !l.publie_le).length,
  };

  // Une carte par matière attribuée (même sans leçon, pour pouvoir en déposer une), filtres appliqués
  const groupes = useMemo(() => matieres
    .filter((m) => !filtreMatiere || String(m.id) === filtreMatiere)
    .map((m) => {
      const correspondMatiere = terme && normaliser(m.matiere).includes(terme);
      const liste = toutes
        .filter((l) => String(l.id_matiere) === String(m.id))
        .filter((l) => !statut || (statut === 'publiee') === Boolean(l.publie_le))
        .filter((l) => !terme || correspondMatiere || normaliser([l.titre, l.contenu, l.nom_fichier].join(' ')).includes(terme));
      return { matiere: m, liste };
    })
    .filter(({ liste }) => liste.length > 0 || (!terme && !statut)), [matieres, toutes, filtreMatiere, terme, statut]);
  const nbTrouvees = groupes.reduce((n, g) => n + g.liste.length, 0);
  const filtre = Boolean(terme || statut);

  const filtrer = (changements) => {
    const suivants = { annee: annee ?? '', matiere: filtreMatiere, ...changements };
    setParams(Object.fromEntries(Object.entries(suivants).filter(([, v]) => v)));
  };
  const effacer = () => { setRecherche(''); setStatut(''); };

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
          <small className="text-muted">
            {toutes.length > 0
              ? `${nombres.publiee} publiée${nombres.publiee > 1 ? 's' : ''} · ${nombres.brouillon} brouillon${nombres.brouillon > 1 ? 's' : ''}`
              : 'Vos supports de cours, visibles par les étudiants de la matière une fois publiés.'}
          </small>
        </div>
        <div className="d-flex flex-wrap gap-2">
          {annees.length > 1 && (
            <select className="form-select w-auto" aria-label="Année académique" value={annee ?? ''} onChange={(e) => filtrer({ annee: e.target.value, matiere: '' })}>
              {annees.map((a) => <option key={a.id} value={a.id}>{a.annee_aca}</option>)}
            </select>
          )}
          {matieres.length > 0 && (
            <button type="button" className="btn btn-primary" onClick={() => setFenetre({ matiere: filtreMatiere })}>
              <i className="bx bx-plus me-1"></i>Nouvelle leçon
            </button>
          )}
        </div>
      </div>

      {probleme ? (
        <div className="card">
          <div className="gstf-empty">
            <i className="bx bx-error-circle d-block"></i>
            <p className="mb-3">{probleme}</p>
            <button type="button" className="btn btn-sm btn-outline-primary" onClick={actualiser}>Réessayer</button>
          </div>
        </div>
      ) : chargementListe ? (
        <CoursChargement actions libelle="Chargement de vos leçons…" />
      ) : matieres.length === 0 ? (
        <div className="card">
          <div className="gstf-empty">
            <i className="bx bx-book d-block"></i>
            Aucune matière ne vous est attribuée pour le moment : les leçons se déposent par matière.
          </div>
        </div>
      ) : (
        <>
          <div className="gstf-filtres">
            <SearchBar
              className="gstf-filtres__recherche"
              searchTerm={recherche}
              onSearchChange={setRecherche}
              placeholder="Rechercher une leçon, un fichier…"
            />
            {matieres.length > 1 && (
              <select className="form-select w-auto gstf-cours-filtre" aria-label="Filtrer par matière" value={filtreMatiere}
                onChange={(e) => filtrer({ matiere: e.target.value })}>
                <option value="">Toutes les matières</option>
                {matieres.map((m) => <option key={m.id} value={m.id}>{m.matiere} ({m.niveau})</option>)}
              </select>
            )}
            <div className="gstf-segments" role="group" aria-label="Filtrer par état">
              {STATUTS.map((s) => (
                <button key={s.valeur || 'toutes'} type="button" aria-pressed={statut === s.valeur}
                  className={`gstf-segments__item ${statut === s.valeur ? 'is-active' : ''}`} onClick={() => setStatut(s.valeur)}>
                  {s.libelle}
                  <span className="gstf-segments__nombre">{nombres[s.valeur]}</span>
                </button>
              ))}
            </div>
          </div>

          {filtre && (
            <p className="gstf-cours-resultats" role="status">
              {nbTrouvees === 0 ? 'Aucune leçon trouvée' : `${nbTrouvees} leçon${nbTrouvees > 1 ? 's' : ''} trouvée${nbTrouvees > 1 ? 's' : ''}`}
              {terme && <> pour « <strong>{recherche.trim()}</strong> »</>}
              <button type="button" className="btn btn-link btn-sm p-0 ms-2" onClick={effacer}>Effacer les filtres</button>
            </p>
          )}

          {groupes.length === 0 ? (
            <div className="card">
              <div className="gstf-empty">
                <i className="bx bx-search-alt d-block"></i>
                <p className="mb-3">Aucune leçon ne correspond à votre recherche.</p>
                <button type="button" className="btn btn-outline-primary btn-sm" onClick={effacer}>Voir toutes les leçons</button>
              </div>
            </div>
          ) : (
            groupes.map(({ matiere: m, liste }) => {
              const total = toutes.filter((l) => String(l.id_matiere) === String(m.id));
              const brouillons = total.filter((l) => !l.publie_le).length;
              return (
                <section className="card mb-4 gstf-cours-matiere" key={m.id} aria-label={m.matiere}>
                  <div className="gstf-cours-matiere__entete">
                    <span className="gstf-cours-matiere__pastille" aria-hidden="true">{initiales(m.matiere)}</span>
                    <div className="flex-grow-1 min-w-0">
                      <h5 className="gstf-cours-matiere__nom">{surligner(m.matiere, recherche)}</h5>
                      <span className="gstf-cours-matiere__prof">
                        {m.niveau}{m.semestre ? ` · ${m.semestre}` : ''}
                      </span>
                    </div>
                    <div className="d-flex flex-wrap align-items-center justify-content-end gap-2 flex-shrink-0">
                      {brouillons > 0 && <span className="badge bg-label-secondary">{brouillons} brouillon{brouillons > 1 ? 's' : ''}</span>}
                      <span className="gstf-cours-matiere__compte">{total.length} leçon{total.length > 1 ? 's' : ''}</span>
                      <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => setFenetre({ matiere: String(m.id) })}
                        title={`Nouvelle leçon en ${m.matiere}`} aria-label={`Nouvelle leçon en ${m.matiere}`}>
                        <i className="bx bx-plus"></i>
                      </button>
                    </div>
                  </div>

                  {liste.length === 0 ? (
                    <div className="gstf-lecons-prof__vide">
                      Aucune leçon dans cette matière.
                      <button type="button" className="btn btn-link btn-sm p-0 ms-1" onClick={() => setFenetre({ matiere: String(m.id) })}>Déposer la première</button>
                    </div>
                  ) : (
                    <ul className="gstf-cours-liste">
                      {liste.map((l) => {
                        const ext = l.fichier ? extension(l.nom_fichier || l.fichier) : '';
                        const occupe = enCours === l.id;
                        return (
                          <li key={l.id}>
                            <div className={`gstf-cours-ligne gstf-lecons-prof__ligne${l.publie_le ? '' : ' is-brouillon'}`}>
                              <span className="gstf-cours-ligne__icone" aria-hidden="true">
                                <i className={`bx ${l.fichier ? iconeFichier(l.nom_fichier || l.fichier) : 'bx-text'}`}></i>
                              </span>
                              <span className="gstf-cours-ligne__texte">
                                <Link to={`/prof/lecons/${l.id}${annee ? `?annee=${annee}` : ''}`} className="gstf-cours-ligne__titre gstf-lecons-prof__titre">
                                  {surligner(l.titre, recherche)}
                                </Link>
                                {l.contenu && <span className="gstf-cours-ligne__extrait">{surligner(l.contenu, recherche)}</span>}
                                <span className="gstf-cours-ligne__meta">
                                  <span>
                                    <i className="bx bx-calendar" aria-hidden="true"></i>{' '}
                                    {l.publie_le ? `Publiée le ${dateCourte(l.publie_le)}` : `Modifiée le ${dateCourte(l.updated_at)}`}
                                  </span>
                                  {l.fichier && (
                                    <a href={storageUrl(l.fichier)} target="_blank" rel="noreferrer" className="gstf-lecons-prof__fichier" title={l.nom_fichier || 'Fichier joint'}>
                                      <span className="gstf-cours-ligne__fichier">{ext.toUpperCase() || 'Fichier'}</span>
                                      <span className="text-truncate">{surligner(l.nom_fichier || 'Fichier joint', recherche)}</span>
                                    </a>
                                  )}
                                </span>
                              </span>
                              <div className="gstf-lecons-prof__actions">
                                {/* Interrupteur : montre l'état et le change d'un clic (publier / retirer) */}
                                <div className={`form-check form-switch gstf-lecons-prof__visible${l.publie_le ? ' is-visible' : ''}`}
                                  title={l.publie_le ? 'Visible par les étudiants : cliquer pour la retirer' : 'Brouillon : cliquer pour la publier'}>
                                  <input className="form-check-input" type="checkbox" role="switch" id={`visible-${l.id}`}
                                    checked={Boolean(l.publie_le)} onChange={() => basculer(l)} disabled={occupe} />
                                  <label className="form-check-label" htmlFor={`visible-${l.id}`}>
                                    {occupe ? <span className="spinner-border spinner-border-sm" role="status" aria-label="En cours" /> : l.publie_le ? 'Visible' : 'Masquée'}
                                  </label>
                                </div>
                                <Link to={`/prof/lecons/${l.id}${annee ? `?annee=${annee}` : ''}`} className="btn btn-sm btn-icon btn-outline-secondary"
                                  title="Voir le détail" aria-label={`Voir le détail de ${l.titre}`}>
                                  <i className="bx bx-show"></i>
                                </Link>
                                <button type="button" className="btn btn-sm btn-icon btn-outline-secondary" onClick={() => setFenetre({ lecon: l })} disabled={occupe}
                                  title="Modifier" aria-label={`Modifier ${l.titre}`}>
                                  <i className="bx bx-edit"></i>
                                </button>
                                <button type="button" className="btn btn-sm btn-icon btn-outline-danger" onClick={() => supprimer(l)} disabled={occupe}
                                  title="Supprimer" aria-label={`Supprimer ${l.titre}`}>
                                  <i className="bx bx-trash"></i>
                                </button>
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>
              );
            })
          )}
        </>
      )}

      {fenetre && (
        <FenetreLecon
          lecon={fenetre.lecon || null}
          matieres={matieres}
          matiereParDefaut={fenetre.matiere || filtreMatiere}
          annee={annee}
          onEnregistree={enregistree}
          onClose={() => setFenetre(null)}
        />
      )}
    </div>
  );
};

export default MesLecons;

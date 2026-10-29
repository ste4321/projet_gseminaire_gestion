import React, { useEffect, useState } from 'react';
import api, { estAnnulee } from '../api/client';
import StatutResultat from './StatutResultat';
import BoutonCopier from './BoutonCopier';
import SituationEtudiant from './SituationEtudiant';
import { dateCourte, libelleStatut, situationAnnee } from '../utils/parcours';

const initiales = (nom = '') =>
  nom.split(/\s+/).filter(Boolean).slice(0, 2).map((m) => m[0].toUpperCase()).join('') || '?';

const note = (n) => (n === null || n === undefined ? '—' : Number(n).toFixed(2));

/**
 * Fiche courte d'un étudiant : identité, coordonnées et où il en est cette année.
 * Ses notes se consultent ici, année par année, anciennes comprises (lecture seule) ; elles se modifient dans la page Notes.
 * `etudiant` : ligne de la liste (nom_prenom, matricule, email, telephone, diocese, niveau,
 * original = inscription affichée).
 */
const FicheEtudiant = ({ modalId, etudiant, role, onModifier, onDepart, onRetour }) => {
  const parcoursId = etudiant?.original?.id; // année de la ligne cliquée dans la liste
  const etudiantId = etudiant?.id;
  const [inscriptions, setInscriptions] = useState([]); // toutes ses années, la plus récente d'abord
  const [choisi, setChoisi] = useState(parcoursId); // année dont on consulte la moyenne et les notes
  const [releves, setReleves] = useState({}); // parcours → relevé (false = indisponible), gardés en mémoire
  const [notesOuvertes, setNotesOuvertes] = useState(false);

  // Autre étudiant : année de la ligne cliquée, notes repliées, liste de ses années
  useEffect(() => {
    setChoisi(parcoursId);
    setNotesOuvertes(false);
    setInscriptions([]);
    setReleves({}); // fiche rouverte : notes à jour
    if (!etudiantId) return undefined;
    const controle = new AbortController();
    api.get(`/etudiants/${etudiantId}`, { signal: controle.signal })
      .then((res) => setInscriptions(res.data.parcours || []))
      .catch(() => {}); // sans la liste, seule l'année de la ligne est proposée
    return () => controle.abort();
  }, [etudiantId, parcoursId]);

  // Relevé de l'année choisie : chargé une seule fois
  useEffect(() => {
    if (!choisi || releves[choisi] !== undefined) return undefined;
    const controle = new AbortController();
    api.get(`/notes/releve/${choisi}`, { signal: controle.signal })
      .then((res) => setReleves((r) => ({ ...r, [choisi]: res.data })))
      .catch((err) => { if (!estAnnulee(err)) setReleves((r) => ({ ...r, [choisi]: false })); });
    return () => controle.abort();
  }, [choisi, releves]);

  const releve = choisi ? releves[choisi] ?? null : false;
  const general = releve ? releve.general : releve;
  const inscription = inscriptions.find((p) => p.id === choisi);
  const annee = inscription?.annee_academique?.annee_aca || etudiant?.original?.annee_academique?.annee_aca;
  // Passant / redoublant pour l'année de la ligne cliquée (comparée à l'année d'avant une fois ses années chargées)
  const parcoursLigne = inscriptions.find((p) => p.id === parcoursId) || etudiant?.original;
  const situationLigne = inscriptions.length > 0 || parcoursLigne?.statut !== 'inscrit'
    ? situationAnnee(parcoursLigne, inscriptions)
    : null;
  // Un lien « Notes L1 · 2025-2026 » par année (sans la liste des années : celle de la ligne cliquée)
  const annees = inscriptions.length > 0
    ? inscriptions
    : parcoursId ? [{ id: parcoursId, niveau: { niveau: etudiant?.niveau }, annee_academique: etudiant?.original?.annee_academique, notes_saisies: general?.notes_saisies ?? 0 }] : [];
  // Clic : affiche les notes de cette année ; second clic sur la même : les masque
  const voirNotes = (id) => {
    if (id === choisi && notesOuvertes) {
      setNotesOuvertes(false);
      return;
    }
    setChoisi(id);
    setNotesOuvertes(true);
  };

  const lignes = [
    { icone: 'bx-envelope', valeur: etudiant?.email, lien: etudiant?.email && `mailto:${etudiant.email}` },
    { icone: 'bx-phone', valeur: etudiant?.telephone, lien: etudiant?.telephone && `tel:${etudiant.telephone.replace(/\s+/g, '')}` },
    { icone: 'bx-map', valeur: etudiant?.diocese },
  ];

  return (
    <div className="modal fade" id={modalId} tabIndex="-1" aria-labelledby={`${modalId}-titre`} aria-hidden="true">
      <div className={`modal-dialog modal-dialog-centered modal-dialog-scrollable${notesOuvertes ? ' modal-lg' : ''}`}>
        <div className="modal-content">
          {etudiant && (
            <>
              <div className="modal-header border-0 pb-0">
                <div className="d-flex align-items-center gap-3 min-w-0">
                  <span className="gstf-fiche-etudiant__avatar" aria-hidden="true">{initiales(etudiant.nom_prenom)}</span>
                  <div className="min-w-0">
                    <h5 className="modal-title mb-0 text-truncate" id={`${modalId}-titre`}>{etudiant.nom_prenom}</h5>
                    <small className="text-muted d-inline-flex align-items-center gap-1 flex-wrap">
                      <span className="fw-semibold text-body">{etudiant.matricule}</span>
                      <BoutonCopier texte={etudiant.matricule} libelle="Copier le matricule" />
                      {[etudiant.niveau, etudiant.original?.annee_academique?.annee_aca].filter(Boolean).map((t) => <span key={t}>· {t}</span>)}
                      {situationLigne && <span className="ms-1"><SituationEtudiant situation={situationLigne} /></span>}
                    </small>
                  </div>
                </div>
                <button type="button" className="btn-close align-self-start" data-bs-dismiss="modal" aria-label="Fermer"></button>
              </div>

              <div className="modal-body">
                <ul className="list-unstyled mb-0 gstf-fiche-etudiant__infos">
                  {lignes.map((l) => (
                    <li key={l.icone}>
                      <i className={`bx ${l.icone}`} aria-hidden="true"></i>
                      {l.valeur
                        ? (l.lien ? <a href={l.lien} className="text-truncate">{l.valeur}</a> : <span className="text-truncate">{l.valeur}</span>)
                        : <span className="text-muted">Non renseigné</span>}
                    </li>
                  ))}
                </ul>

                {etudiant.date_sortie && (
                  <div className="gstf-fiche-etudiant__sortie" role="note">
                    <i className="bx bx-log-out-circle" aria-hidden="true"></i>
                    <span>
                      <strong className="d-block text-body">{libelleStatut(etudiant.statut) || 'A quitté le séminaire'} · {dateCourte(etudiant.date_sortie)}</strong>
                      {etudiant.motif_sortie && <span className="text-muted">{etudiant.motif_sortie}</span>}
                    </span>
                  </div>
                )}

                {general !== false && (
                  <div className="gstf-fiche-etudiant__bilan">
                    <span className="text-muted">Moyenne {annee && `${annee}`}</span>
                    {general ? (
                      <>
                        <strong>{general.moyenne === null ? '—' : `${Number(general.moyenne).toFixed(2)} / 20`}</strong>
                        <StatutResultat statut={general.statut} attente="En attente" />
                      </>
                    ) : (
                      <span className="gstf-squelette" style={{ width: '8rem', height: '1.2rem' }} aria-hidden="true" />
                    )}
                  </div>
                )}

                {/* Un lien par année : ses notes, anciennes comprises */}
                {annees.length > 0 && (
                  <div className="gstf-fiche-etudiant__liens">
                    {annees.map((p) => {
                      const actif = notesOuvertes && p.id === choisi;
                      return (
                        <button key={p.id} type="button" className={`gstf-lien-notes${actif ? ' is-actif' : ''}`}
                          onClick={() => voirNotes(p.id)} disabled={!p.notes_saisies}
                          aria-expanded={actif} aria-controls={`${modalId}-notes`}
                          title={p.notes_saisies ? undefined : `Aucune note en ${p.annee_academique?.annee_aca}`}>
                          <i className="bx bx-spreadsheet" aria-hidden="true"></i>
                          Notes {p.niveau?.niveau}
                          <small>{p.annee_academique?.annee_aca}{p.notes_saisies ? ` · ${p.notes_saisies}` : ''}</small>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Notes de l'année choisie : consultation seulement */}
                {notesOuvertes && !releve && (
                  <span className="gstf-squelette d-block mt-3" style={{ height: '8rem' }} aria-hidden="true" />
                )}
                {notesOuvertes && releve && (
                  <div className="gstf-fiche-etudiant__notes" id={`${modalId}-notes`}>
                    <h6 className="mb-1 d-flex flex-wrap align-items-center gap-2">
                      Notes {releve.niveau} · {releve.annee}
                      <SituationEtudiant situation={situationAnnee(inscription, inscriptions)} />
                    </h6>
                    <p className="small text-muted mb-3">
                      <i className="bx bx-lock-alt me-1" aria-hidden="true"></i>
                      Consultation seulement : les notes se modifient dans la page Notes.
                    </p>
                    {releve.semestres.map((s) => (
                      <section key={s.id ?? 'hors'} className="gstf-releve-semestre">
                        <header className="gstf-releve-semestre__entete">
                          <span className="d-flex flex-wrap align-items-center gap-2 min-w-0">
                            <h6 className="mb-0">{s.semestre}</h6>
                            {!s.publie && (
                              <span className="gstf-releve-semestre__prive" title="Les étudiants ne voient pas encore ces notes">
                                <i className="bx bx-hide" aria-hidden="true"></i>Non publié
                              </span>
                            )}
                          </span>
                          <span className="d-flex align-items-center gap-2 text-nowrap">
                            <span className="gstf-releve-semestre__moyenne">
                              {s.moyenne === null ? '—' : note(s.moyenne)}<small> / 20</small>
                            </span>
                            {s.statut && <StatutResultat statut={s.statut} />}
                          </span>
                        </header>
                        <table className="gstf-releve">
                          <colgroup>
                            <col />
                            <col className="gstf-releve__col-coef" />
                            <col className="gstf-releve__col-note" />
                          </colgroup>
                          <thead>
                            <tr>
                              <th scope="col">Matière</th>
                              <th scope="col" className="text-center" title="Coefficient">Coef.</th>
                              <th scope="col" className="text-end">Note / 20</th>
                            </tr>
                          </thead>
                          <tbody>
                            {s.matieres.map((m) => {
                              const faible = m.note !== null && m.note < 10;
                              return (
                                <tr key={m.id}>
                                  <td>
                                    <span className="d-block text-body">{m.matiere}</span>
                                    {m.code && <small className="text-muted">{m.code}</small>}
                                  </td>
                                  <td className="text-center text-muted">{m.coefficient}</td>
                                  <td>
                                    {m.note === null ? (
                                      <span className="d-block text-end text-muted" title="Note pas encore saisie">—</span>
                                    ) : (
                                      <span className={`gstf-releve__note${faible ? ' is-faible' : ''}`}
                                        title={faible ? 'Inférieure à 10 / 20' : undefined}>
                                        <span className="gstf-releve__barre" aria-hidden="true">
                                          <span style={{ width: `${Math.min(100, (m.note / 20) * 100)}%` }}></span>
                                        </span>
                                        <strong>{note(m.note)}</strong>
                                        {faible && <span className="visually-hidden"> (inférieure à 10)</span>}
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </section>
                    ))}
                  </div>
                )}
              </div>

              <div className="modal-footer">
                {role === 'admin' && (etudiant.date_sortie ? (
                  <button type="button" className="btn btn-outline-secondary me-auto" onClick={onRetour}>
                    <i className="bx bx-undo me-1"></i>Annuler le départ
                  </button>
                ) : (
                  <button type="button" className="btn btn-outline-danger me-auto" onClick={onDepart}>
                    <i className="bx bx-log-out-circle me-1"></i>Déclarer un départ
                  </button>
                ))}
                <button type="button" className="btn btn-outline-secondary" data-bs-dismiss="modal">Fermer</button>
                {role === 'admin' && (
                  <button type="button" className="btn btn-primary" onClick={onModifier}>
                    <i className="bx bx-edit me-1"></i>Modifier
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default FicheEtudiant;

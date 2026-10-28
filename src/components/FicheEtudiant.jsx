import React, { useEffect, useState } from 'react';
import api, { estAnnulee } from '../api/client';
import useDerniereRequete from '../hooks/useDerniereRequete';
import StatutResultat from './StatutResultat';
import BoutonCopier from './BoutonCopier';
import { dateCourte, libelleStatut } from '../utils/parcours';

const initiales = (nom = '') =>
  nom.split(/\s+/).filter(Boolean).slice(0, 2).map((m) => m[0].toUpperCase()).join('') || '?';

/**
 * Fiche courte d'un étudiant : identité, coordonnées et où il en est cette année.
 * `etudiant` : ligne de la liste (nom_prenom, matricule, email, telephone, diocese, niveau,
 * original = inscription affichée).
 */
const FicheEtudiant = ({ modalId, etudiant, role, onModifier, onDepart, onRetour }) => {
  const [general, setGeneral] = useState(null); // moyenne et résultat de l'année affichée
  const nouvelleRequete = useDerniereRequete();
  const parcoursId = etudiant?.original?.id;
  const annee = etudiant?.original?.annee_academique?.annee_aca;

  useEffect(() => {
    if (!parcoursId) return;
    const signal = nouvelleRequete(); // ouverture d'une autre fiche : l'ancienne réponse est ignorée
    setGeneral(null);
    api.get(`/notes/releve/${parcoursId}`, { signal })
      .then((res) => setGeneral(res.data.general))
      .catch((err) => { if (!estAnnulee(err)) setGeneral(false); }); // indisponible : la ligne est masquée
  }, [parcoursId, nouvelleRequete]);

  const lignes = [
    { icone: 'bx-envelope', valeur: etudiant?.email, lien: etudiant?.email && `mailto:${etudiant.email}` },
    { icone: 'bx-phone', valeur: etudiant?.telephone, lien: etudiant?.telephone && `tel:${etudiant.telephone.replace(/\s+/g, '')}` },
    { icone: 'bx-map', valeur: etudiant?.diocese },
  ];

  return (
    <div className="modal fade" id={modalId} tabIndex="-1" aria-labelledby={`${modalId}-titre`} aria-hidden="true">
      <div className="modal-dialog modal-dialog-centered">
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
                      {[etudiant.niveau, annee].filter(Boolean).map((t) => <span key={t}>· {t}</span>)}
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

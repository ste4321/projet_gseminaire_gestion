import React from 'react';
import { ilYA } from '../utils/dates';

// Une annonce dans une liste (page Annonces, accueils étudiant et enseignant) : même présentation partout.
// Sert aussi aux actualités du site (page Actualités, avec l'auteur en guise d'expéditeur).
// Sobre : vignette de date neutre, une seule couleur d'accent (le point des annonces nouvelles).

export const ETUDIANTS = 'etudiants';
export const ENSEIGNANTS = 'enseignants';
export const TOUS = 'tous';

export const libelleDestinataires = (a) => {
  if (a.destinataires === TOUS) return 'Tout le monde';
  if (a.destinataires === ENSEIGNANTS) return 'Enseignants';
  return a.niveau?.niveau ? `Étudiants ${a.niveau.niveau}` : 'Tous les étudiants';
};

export const iconeDestinataires = (a) => ({ [TOUS]: 'bx-globe', [ENSEIGNANTS]: 'bx-chalkboard' }[a.destinataires] || 'bx-group');

// Vignette : « 23 » / « oct. »
const jourDuMois = (iso) => (iso ? new Date(iso).getDate() : '');
const moisCourt = (iso) => (iso ? new Date(iso).toLocaleDateString('fr-FR', { month: 'short' }) : '');

/**
 * @param annonce           l'annonce
 * @param nouvelle          arrivée depuis la dernière visite (point bordeaux, titre plus marqué)
 * @param avecDestinataires affiche à qui elle s'adresse (inutile pour un étudiant)
 * @param onClick           ouverture du détail
 */
const LigneAnnonce = ({ annonce: a, nouvelle = false, avecDestinataires = false, onClick }) => (
  <li className="list-group-item p-0">
    <button type="button" className={`gstf-annonce gstf-annonce__corps w-100${nouvelle ? ' is-nouvelle' : ''}`} onClick={onClick}>
      <span className="gstf-annonce__date" aria-hidden="true">
        <span className="gstf-annonce__jour">{jourDuMois(a.created_at)}</span>
        <span className="gstf-annonce__mois">{moisCourt(a.created_at)}</span>
      </span>
      <span className="d-block min-w-0 flex-grow-1">
        <span className="d-flex align-items-baseline gap-2 min-w-0">
          {nouvelle && <span className="gstf-annonce__point" title="Nouvelle depuis votre dernière visite"></span>}
          <strong className="gstf-annonce__titre text-truncate">{a.titre}</strong>
          {nouvelle && <span className="visually-hidden">(nouvelle)</span>}
          <small className="gstf-annonce__quand ms-auto">{ilYA(a.created_at)}</small>
        </span>
        <span className="gstf-annonce__extrait">{a.description}</span>
        <span className="gstf-annonce__infos">
          {avecDestinataires && <span><i className={`bx ${iconeDestinataires(a)}`} aria-hidden="true"></i>{libelleDestinataires(a)}</span>}
          <span><i className="bx bx-user-voice" aria-hidden="true"></i>{a.expediteur}</span>
          {a.fichier && <span><i className="bx bx-paperclip" aria-hidden="true"></i>Pièce jointe</span>}
        </span>
      </span>
      <i className="bx bx-chevron-right gstf-annonce__fleche" aria-hidden="true"></i>
    </button>
  </li>
);

/** Lignes grises affichées pendant le chargement */
export const LignesAnnonceChargement = ({ nombre = 4 }) =>
  Array.from({ length: nombre }, (_, i) => (
    <li className="list-group-item gstf-annonce" key={i} aria-hidden="true">
      <span className="gstf-squelette gstf-annonce__date" />
      <span className="d-block flex-grow-1">
        <span className="gstf-squelette mb-2" style={{ width: `${40 + (i % 3) * 12}%`, height: '1rem' }} />
        <span className="gstf-squelette mb-2" style={{ width: '85%', height: '0.75rem' }} />
        <span className="gstf-squelette" style={{ width: '35%', height: '0.7rem' }} />
      </span>
    </li>
  ));

export default LigneAnnonce;

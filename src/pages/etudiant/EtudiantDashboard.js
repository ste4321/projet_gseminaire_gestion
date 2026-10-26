import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useReleve } from '../../contexts/EspaceEtudiantContext';
import { useAnnonce } from '../../contexts/AnnonceContext';
import { useNotificationsAnnonces } from '../../contexts/NotificationAnnonceContext';
import { useFeedback } from '../../contexts/FeedbackContext';
import { telechargerBulletin } from '../../utils/bulletin';
import LigneAnnonce, { LignesAnnonceChargement } from '../../components/LigneAnnonce';
import StatutResultat from '../../components/StatutResultat';

// Accueil de l'étudiant : l'essentiel en un coup d'œil (moyenne, annonces non lues, dernières annonces)
// et les accès les plus utiles.

const NB_ANNONCES = 4;

const salutation = () => {
  const heure = new Date().getHours();
  return heure < 12 ? 'Bonjour' : heure < 18 ? 'Bon après-midi' : 'Bonsoir';
};
const aujourdhui = () => {
  const texte = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return texte.charAt(0).toUpperCase() + texte.slice(1);
};
const format = (n) => Number(n).toFixed(2);

const EtudiantDashboard = () => {
  const nomPrenom = localStorage.getItem('nom_prenom') || '';
  const { annonces, loading: chargementAnnonces } = useAnnonce();
  const { nonLues, ouvrir } = useNotificationsAnnonces();
  const { notify } = useFeedback();

  // Relevé de l'année en cours (gardé en mémoire, partagé avec « Mes notes ») ; sans inscription, la carte l'indique
  const { releve, loading: chargementReleve } = useReleve();
  const [pdfEnCours, setPdfEnCours] = useState(false);

  const general = releve?.general;
  const notesPubliees = general && general.semestres_publies > 0;
  const progression = general?.matieres_total ? Math.round((general.notes_saisies / general.matieres_total) * 100) : 0;
  const idsNonLues = new Set(nonLues.map((a) => a.id));
  const dernieres = annonces.slice(0, NB_ANNONCES);

  const telecharger = async () => {
    setPdfEnCours(true);
    try {
      await telechargerBulletin(releve, { publiesSeulement: true });
      notify.success('Bulletin téléchargé.');
    } catch (e) {
      notify.error("Le bulletin n'a pas pu être généré.");
    } finally {
      setPdfEnCours(false);
    }
  };

  return (
    <div className="container-xxl flex-grow-1 container-p-y">
      {/* Bienvenue */}
      <div className="card mb-4 gstf-bienvenue">
        <div className="card-body d-flex flex-wrap align-items-center gap-3">
          <img src="/images/logo-GS.jpg" alt="" width="56" height="56" className="rounded-circle flex-shrink-0" />
          <div className="min-w-0 flex-grow-1">
            <p className="text-muted small mb-1">{aujourdhui()}</p>
            <h4 className="mb-1">{salutation()}{nomPrenom ? `, ${nomPrenom}` : ''}</h4>
            {chargementReleve ? (
              <span className="gstf-squelette d-inline-block" style={{ width: '14rem', height: '0.9rem' }} aria-hidden="true" />
            ) : releve ? (
              <div className="gstf-bienvenue__infos">
                <span><i className="bx bx-layer" aria-hidden="true"></i>{releve.niveau}</span>
                <span><i className="bx bx-calendar" aria-hidden="true"></i>Année {releve.annee}</span>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* L'essentiel */}
      <div className="row">
        <div className="col-md-6 mb-4">
          <div className="card h-100 gstf-carte-lien">
            <div className="card-body gstf-stat align-items-start">
              <div className="gstf-stat__icon" aria-hidden="true"><i className="bx bx-medal"></i></div>
              <div className="flex-grow-1 min-w-0">
                <div className="gstf-stat__label mb-1">Ma moyenne</div>
                {chargementReleve ? (
                  <span className="gstf-squelette d-block" style={{ width: '6rem', height: '1.6rem' }} aria-hidden="true" />
                ) : !releve ? (
                  <p className="text-muted mb-0 small">Aucune inscription pour l'année en cours.</p>
                ) : notesPubliees && general.moyenne !== null ? (
                  <>
                    <div className="d-flex flex-wrap align-items-center gap-2">
                      <span className="gstf-stat__value">{format(general.moyenne)}<small className="text-muted fs-6 fw-normal"> / 20</small></span>
                      <StatutResultat statut={general.statut} attente="En cours" />
                    </div>
                    <div className="gstf-bar mt-3" role="progressbar" aria-valuenow={progression} aria-valuemin="0" aria-valuemax="100" aria-label="Notes disponibles">
                      <span style={{ width: `${progression}%` }}></span>
                    </div>
                    <small className="text-muted">{general.notes_saisies} note{general.notes_saisies > 1 ? 's' : ''} disponible{general.notes_saisies > 1 ? 's' : ''} sur {general.matieres_total}</small>
                  </>
                ) : (
                  <p className="text-muted mb-0 small"><i className="bx bx-time-five me-1"></i>Vos notes apparaîtront ici dès leur publication.</p>
                )}
                <Link to="/etudiant/notes" className="stretched-link gstf-carte-lien__action">
                  Voir mes notes<i className="bx bx-right-arrow-alt" aria-hidden="true"></i>
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-6 mb-4">
          <div className="card h-100 gstf-carte-lien">
            <div className="card-body gstf-stat align-items-start">
              <div className="gstf-stat__icon gstf-stat__icon--gold" aria-hidden="true"><i className="bx bxs-megaphone"></i></div>
              <div className="flex-grow-1 min-w-0">
                <div className="gstf-stat__label mb-1">Annonces</div>
                {chargementAnnonces ? (
                  <span className="gstf-squelette d-block" style={{ width: '6rem', height: '1.6rem' }} aria-hidden="true" />
                ) : nonLues.length > 0 ? (
                  <div className="gstf-stat__value">
                    {nonLues.length}<small className="text-muted fs-6 fw-normal"> non lue{nonLues.length > 1 ? 's' : ''}</small>
                  </div>
                ) : (
                  <p className="mb-0"><i className="bx bx-check-circle me-1 text-muted"></i>Vous êtes à jour.</p>
                )}
                <Link to="/etudiant/annonce" className="stretched-link gstf-carte-lien__action">
                  {nonLues.length > 0 ? 'Les lire' : 'Toutes les annonces'}<i className="bx bx-right-arrow-alt" aria-hidden="true"></i>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        {/* Dernières annonces */}
        <div className="col-lg-8 mb-4">
          <div className="card h-100">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="card-title gstf-section-title mb-0">Dernières annonces</h5>
              <Link to="/etudiant/annonce" className="btn btn-sm btn-outline-primary">Toutes les annonces</Link>
            </div>
            {!chargementAnnonces && dernieres.length === 0 ? (
              <div className="gstf-empty">
                <i className="bx bx-bell-off d-block"></i>
                Aucune annonce pour l'instant.
              </div>
            ) : (
              <ul className="list-group list-group-flush gstf-annonces" aria-busy={chargementAnnonces}>
                {chargementAnnonces ? (
                  <LignesAnnonceChargement nombre={3} />
                ) : (
                  dernieres.map((a) => (
                    <LigneAnnonce key={a.id} annonce={a} nouvelle={idsNonLues.has(a.id)} onClick={() => ouvrir(a.id)} />
                  ))
                )}
              </ul>
            )}
          </div>
        </div>

        {/* Accès rapides */}
        <div className="col-lg-4 mb-4">
          <div className="card h-100">
            <div className="card-header">
              <h5 className="card-title gstf-section-title mb-0">Accès rapides</h5>
            </div>
            <div className="card-body d-grid gap-2 align-content-start">
              <button type="button" className="gstf-quick-link text-start bg-transparent w-100" onClick={telecharger}
                disabled={!notesPubliees || pdfEnCours}
                title={!notesPubliees ? 'Disponible dès la publication de vos notes' : undefined}>
                <i className="bx bx-download" aria-hidden="true"></i>
                <span className="flex-grow-1">{pdfEnCours ? 'Préparation du bulletin…' : 'Télécharger mon bulletin'}</span>
              </button>
              <Link to="/etudiant/edt" className="gstf-quick-link">
                <i className="bx bx-calendar" aria-hidden="true"></i>Emploi du temps
              </Link>
              <Link to="/etudiant/listeProf" className="gstf-quick-link">
                <i className="bx bx-user-voice" aria-hidden="true"></i>Mes enseignants
              </Link>
              <Link to="/changer-mot-de-passe" className="gstf-quick-link">
                <i className="bx bx-lock-alt" aria-hidden="true"></i>Changer mon mot de passe
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EtudiantDashboard;

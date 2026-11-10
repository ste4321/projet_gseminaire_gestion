import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api, { errorMessage, estAnnulee } from '../../api/client';
import { useFeedback } from '../../contexts/FeedbackContext';
import { useMessagesSite } from '../../contexts/MessagesSiteContext';
import SearchBar from '../../components/SearchBar';
import Pagination from '../../components/Pagination';
import BoutonCopier from '../../components/BoutonCopier';
import { LignesAnnonceChargement } from '../../components/LigneAnnonce';
import { ilYA } from '../../utils/dates';

// Messages envoyés depuis le formulaire « Contactez-nous » du site vitrine (projet_gseminaire_frontend).
// Ouvrir un message le marque comme lu. « Répondre » ouvre la messagerie de l'ordinateur
// (lien mailto, réponse pré-remplie) et marque le message comme répondu.
// En direct (MessagesSiteContext) : un message reçu ou modifié ailleurs met la liste à jour aussitôt,
// et un nouveau message est mis en évidence quelques secondes.

const FILTRES = [
  { valeur: 'tous', label: 'Tous' },
  { valeur: 'non_lus', label: 'Non lus' },
  { valeur: 'non_repondus', label: 'Sans réponse' },
];

const initiales = (nom) => String(nom || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((m) => m[0].toUpperCase()).join('');
// « Jeudi 23 octobre 2026 à 10 h 15 »
const dateHeure = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const jour = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return `${jour.charAt(0).toUpperCase()}${jour.slice(1)} à ${d.getHours()} h ${String(d.getMinutes()).padStart(2, '0')}`;
};

// Réponse pré-remplie, avec le message d'origine cité (raccourci : les liens mailto trop longs sont refusés)
const lienReponse = (m) => {
  const cite = m.message.length > 1200 ? `${m.message.slice(0, 1200)}…` : m.message;
  const corps = [
    `Bonjour ${m.name},`,
    '',
    '',
    '',
    'Grand Séminaire de Théologie Faliarivo',
    '',
    `--- Votre message du ${dateHeure(m.created_at)} ---`,
    ...cite.split('\n').map((ligne) => `> ${ligne}`),
  ].join('\n');
  const sujet = 'Réponse à votre message — Grand Séminaire de Théologie Faliarivo';
  return `mailto:${m.email}?subject=${encodeURIComponent(sujet)}&body=${encodeURIComponent(corps)}`;
};

const modal = () => window.bootstrap?.Modal.getOrCreateInstance(document.getElementById('messageModal'));

const Messages = () => {
  const { notify, confirm } = useFeedback();
  const { evenement } = useMessagesSite();
  const location = useLocation();
  const navigate = useNavigate();
  const [frais, setFrais] = useState(() => new Set()); // messages arrivés en direct, mis en évidence
  const [filtre, setFiltre] = useState('tous');
  const [recherche, setRecherche] = useState('');
  const [terme, setTerme] = useState(''); // recherche envoyée au serveur (après une courte pause de frappe)
  const [page, setPage] = useState(0);
  const [resultat, setResultat] = useState(null); // { data, pages, total, compteurs }
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);
  const [detail, setDetail] = useState(null);
  const detailId = useRef(null); // message ouvert, lu par les mises à jour en direct
  detailId.current = detail?.id ?? null;
  const requete = useRef(null);

  // Recherche : envoyée 300 ms après la dernière frappe
  useEffect(() => {
    const t = setTimeout(() => setTerme(recherche.trim()), 300);
    return () => clearTimeout(t);
  }, [recherche]);
  useEffect(() => setPage(0), [filtre, terme]);

  // silencieux : mise à jour en direct, sans estomper la liste ni effacer une erreur affichée
  const charger = useCallback(async ({ silencieux = false } = {}) => {
    requete.current?.abort();
    const ctrl = new AbortController();
    requete.current = ctrl;
    if (!silencieux) {
      setChargement(true);
      setErreur(null);
    }
    try {
      const res = await api.get('/contacts', { params: { filtre, q: terme || undefined, page: page + 1 }, signal: ctrl.signal });
      setResultat(res.data);
    } catch (err) {
      if (estAnnulee(err) || silencieux) return;
      setErreur(errorMessage(err, 'Impossible de charger les messages.'));
    } finally {
      if (requete.current === ctrl) setChargement(false);
    }
  }, [filtre, terme, page]);

  useEffect(() => {
    charger();
    return () => requete.current?.abort();
  }, [charger]);

  // Direct : relecture de la page affichée (filtres, recherche et page conservés)
  const dernierTraite = useRef(evenement?.n);
  const minuteries = useRef([]);
  useEffect(() => () => minuteries.current.forEach(clearTimeout), []);
  useEffect(() => {
    if (!evenement || evenement.n === dernierTraite.current) return;
    dernierTraite.current = evenement.n;
    charger({ silencieux: true });
    const { action, message } = evenement;
    if (!message) return;
    if (action === 'supprime') {
      // Supprimé par un autre administrateur pendant qu'il était ouvert ici
      if (detailId.current === message.id) modal()?.hide();
      return;
    }
    setDetail((d) => (d?.id === message.id ? { ...d, ...message } : d));
    if (action === 'recu') {
      setFrais((f) => new Set(f).add(message.id));
      minuteries.current.push(setTimeout(() => setFrais((f) => {
        const copie = new Set(f);
        copie.delete(message.id);
        return copie;
      }), 6000));
    }
  }, [evenement, charger]);

  // Message mis à jour par le serveur : remplacé dans la liste, compteurs ajustés
  const appliquer = (avant, apres) => {
    // 1 si le message compte parmi les « non lus » / « sans réponse » (pas de date)
    const sans = (m, champ) => (m[champ] ? 0 : 1);
    setResultat((r) => r && {
      ...r,
      data: r.data.map((m) => (m.id === apres.id ? apres : m)),
      compteurs: {
        ...r.compteurs,
        non_lus: r.compteurs.non_lus - sans(avant, 'lu_le') + sans(apres, 'lu_le'),
        non_repondus: r.compteurs.non_repondus - sans(avant, 'repondu_le') + sans(apres, 'repondu_le'),
      },
    });
    setDetail((d) => (d?.id === apres.id ? apres : d));
  };

  const marquer = async (m, changements, succes) => {
    try {
      const res = await api.patch(`/contacts/${m.id}`, changements);
      appliquer(m, res.data);
      if (succes) notify.success(succes);
      return res.data;
    } catch (err) {
      notify.error(errorMessage(err, 'Impossible de mettre à jour le message.'));
      return null;
    }
  };

  const ouvrir = (m) => {
    setDetail(m);
    modal()?.show();
    if (!m.lu_le) marquer(m, { lu: true });
  };

  // Arrivée depuis la cloche ou la notification (« Lire ») : le message demandé s'ouvre
  const demande = location.state?.message;
  useEffect(() => {
    if (!demande || !resultat) return;
    const trouve = resultat.data.find((m) => m.id === demande);
    navigate(location.pathname, { replace: true, state: null });
    if (trouve) ouvrir(trouve);
    else if (filtre !== 'tous' || terme || page !== 0) {
      // Pas dans la vue actuelle : retour à la liste complète, où il est en tête
      setFiltre('tous');
      setRecherche('');
      setPage(0);
    }
  }, [demande, resultat]); // eslint-disable-line react-hooks/exhaustive-deps

  const repondre = (m) => {
    window.location.href = lienReponse(m);
    if (!m.repondu_le) marquer(m, { repondu: true }, 'Message marqué comme répondu.');
  };

  const supprimer = async (m) => {
    modal()?.hide();
    const ok = await confirm({
      title: `Supprimer le message de ${m.name} ?`,
      message: 'Il disparaîtra définitivement de la liste.',
      confirmLabel: 'Supprimer',
      danger: true,
    });
    if (!ok) {
      modal()?.show();
      return;
    }
    try {
      await api.delete(`/contacts/${m.id}`);
      notify.success('Message supprimé.');
      setDetail(null);
      charger();
    } catch (err) {
      notify.error(errorMessage(err, 'Erreur lors de la suppression.'));
    }
  };

  const compteurs = resultat?.compteurs;
  const messages = resultat?.data || [];
  const premierChargement = chargement && !resultat;

  return (
    <div className="container-xxl flex-grow-1 container-p-y">
      <div className="gstf-page-header">
        <div>
          <h4 className="fw-bold mb-1">
            <span className="text-muted fw-light">Administration /</span> Messages du site
          </h4>
          <small className="text-muted">Envoyés par les visiteurs depuis le formulaire « Contactez-nous » du site du séminaire.</small>
        </div>
      </div>

      <div className="card">
        <h5 className="card-header">
          Messages reçus
          {compteurs && (
            <small className="text-muted fw-normal ms-2">
              · {compteurs.tous} message{compteurs.tous > 1 ? 's' : ''}
              {compteurs.non_lus > 0 && <span className="text-primary"> · {compteurs.non_lus} non lu{compteurs.non_lus > 1 ? 's' : ''}</span>}
            </small>
          )}
        </h5>

        <div className="card-body pb-3 pt-0">
          <div className="gstf-filtres">
            <SearchBar className="gstf-filtres__recherche" searchTerm={recherche} onSearchChange={setRecherche}
              placeholder="Rechercher par nom, e-mail ou contenu…" />
            <div className="gstf-segments" role="group" aria-label="Filtrer les messages">
              {FILTRES.map((f) => (
                <button key={f.valeur} type="button" aria-pressed={filtre === f.valeur}
                  className={`gstf-segments__item ${filtre === f.valeur ? 'is-active' : ''}`}
                  onClick={() => setFiltre(f.valeur)}>
                  {f.label}
                  {compteurs && <span className="gstf-segments__nombre">{compteurs[f.valeur]}</span>}
                </button>
              ))}
            </div>
          </div>
        </div>

        {erreur ? (
          <div className="gstf-empty">
            <i className="bx bx-error-circle d-block"></i>
            <p className="mb-3">{erreur}</p>
            <button type="button" className="btn btn-sm btn-outline-primary" onClick={charger}>Réessayer</button>
          </div>
        ) : (
          <ul className={`list-group list-group-flush gstf-annonces gstf-messages ${chargement && resultat ? 'is-refreshing' : ''}`} aria-busy={chargement}>
            {premierChargement ? (
              <LignesAnnonceChargement />
            ) : (
              messages.map((m) => (
                <li key={m.id} className="list-group-item p-0">
                  <button type="button" onClick={() => ouvrir(m)}
                    className={`gstf-annonce gstf-annonce__corps w-100${m.lu_le ? '' : ' is-nouvelle'}${frais.has(m.id) ? ' is-fresh' : ''}`}>
                    <span className="avatar flex-shrink-0 align-self-start" aria-hidden="true">
                      <span className="avatar-initial rounded-circle bg-label-primary">{initiales(m.name)}</span>
                    </span>
                    <span className="d-block min-w-0 flex-grow-1">
                      <span className="d-flex align-items-baseline gap-2 min-w-0">
                        {!m.lu_le && <span className="gstf-annonce__point" title="Non lu"></span>}
                        <strong className="gstf-annonce__titre text-truncate">{m.name}</strong>
                        {!m.lu_le && <span className="visually-hidden">(non lu)</span>}
                        <small className="gstf-annonce__quand ms-auto">{ilYA(m.created_at)}</small>
                      </span>
                      <span className="gstf-annonce__extrait">{m.message}</span>
                      <span className="gstf-annonce__infos">
                        <span><i className="bx bx-envelope" aria-hidden="true"></i>{m.email}</span>
                        {m.repondu_le && (
                          <span className="text-success"><i className="bx bx-check-double" aria-hidden="true"></i>Répondu</span>
                        )}
                      </span>
                    </span>
                    <i className="bx bx-chevron-right gstf-annonce__fleche" aria-hidden="true"></i>
                  </button>
                </li>
              ))
            )}
          </ul>
        )}

        {!premierChargement && !erreur && messages.length === 0 && (
          <div className="gstf-empty">
            {terme ? (
              <>
                <i className="bx bx-search-alt d-block"></i>
                Aucun message ne correspond à « {terme} ».
                <div className="mt-3">
                  <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => setRecherche('')}>Effacer la recherche</button>
                </div>
              </>
            ) : filtre === 'tous' ? (
              <>
                <i className="bx bx-envelope d-block"></i>
                Aucun message reçu pour l'instant. Ils arriveront ici dès qu'un visiteur utilisera le formulaire du site.
              </>
            ) : (
              <>
                <i className="bx bx-check-circle d-block text-success"></i>
                {filtre === 'non_lus' ? 'Tous les messages ont été lus.' : 'Tous les messages ont reçu une réponse.'}
              </>
            )}
          </div>
        )}

        <Pagination currentPage={page} totalPages={resultat?.pages || 0} onPageChange={setPage} />
      </div>

      {/* Détail d'un message */}
      <div className="modal fade" id="messageModal" tabIndex="-1" aria-labelledby="messageModalTitre" aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-lg">
          <div className="modal-content">
            {detail && (
              <>
                <div className="modal-header gstf-annonce-detail__entete">
                  <span className="avatar avatar-md flex-shrink-0" aria-hidden="true">
                    <span className="avatar-initial rounded-circle bg-label-primary">{initiales(detail.name)}</span>
                  </span>
                  <div className="min-w-0 flex-grow-1">
                    <h4 className="modal-title gstf-annonce-detail__titre mb-1" id="messageModalTitre">{detail.name}</h4>
                    <div className="d-flex align-items-center gap-1 flex-wrap">
                      <a href={`mailto:${detail.email}`} className="text-break">{detail.email}</a>
                      <BoutonCopier texte={detail.email} libelle="Copier l'adresse e-mail" />
                    </div>
                  </div>
                  <button type="button" className="btn-close align-self-start" data-bs-dismiss="modal" aria-label="Fermer"></button>
                </div>

                <div className="modal-body">
                  <div className="gstf-annonce-detail__meta">
                    <span><i className="bx bx-calendar me-1" aria-hidden="true"></i>Reçu le {dateHeure(detail.created_at).replace(/^./, (c) => c.toLowerCase())}</span>
                    {detail.repondu_le ? (
                      <span className="text-success"><i className="bx bx-check-double me-1" aria-hidden="true"></i>Répondu le {dateHeure(detail.repondu_le).replace(/^./, (c) => c.toLowerCase())}</span>
                    ) : (
                      <span><i className="bx bx-time-five me-1" aria-hidden="true"></i>En attente de réponse</span>
                    )}
                  </div>
                  <div className="gstf-annonce-detail__texte">{detail.message}</div>
                </div>

                <div className="modal-footer gstf-annonce-detail__pied flex-wrap">
                  <button type="button" className="btn btn-outline-danger me-auto" onClick={() => supprimer(detail)}>
                    <i className="bx bx-trash me-1"></i>Supprimer
                  </button>
                  <button type="button" className="btn btn-outline-secondary"
                    onClick={() => marquer(detail, { lu: false }, 'Message marqué comme non lu.').then(() => modal()?.hide())}>
                    <i className="bx bx-envelope me-1"></i>Marquer non lu
                  </button>
                  {detail.repondu_le ? (
                    <button type="button" className="btn btn-outline-secondary" onClick={() => marquer(detail, { repondu: false })}>
                      <i className="bx bx-undo me-1"></i>Pas encore répondu
                    </button>
                  ) : (
                    <button type="button" className="btn btn-outline-secondary" onClick={() => marquer(detail, { repondu: true }, 'Message marqué comme répondu.')}
                      title="Si vous avez répondu autrement (téléphone, autre messagerie…)">
                      <i className="bx bx-check me-1"></i>Marquer répondu
                    </button>
                  )}
                  <button type="button" className="btn btn-primary" onClick={() => repondre(detail)}>
                    <i className="bx bx-reply me-1"></i>Répondre par e-mail
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

export default Messages;

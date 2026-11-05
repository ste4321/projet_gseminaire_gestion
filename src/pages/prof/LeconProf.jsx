import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import api, { errorMessage } from '../../api/client';
import { storageUrl } from '../../config';
import { useFeedback } from '../../contexts/FeedbackContext';
import { useDonneesEnseignant } from '../../contexts/EspaceEnseignantContext';
import { Os } from '../../components/Squelettes';
import useMesMatieres from '../../hooks/useMesMatieres';
import { apercuPossible, dateCourte, extension, iconeFichier } from '../../utils/lecons';
import { FenetreLecon, versFormulaire } from './MesLecons';

const JOUR = 24 * 60 * 60 * 1000;
// Ordre d'affichage dans la matière : la plus récente d'abord (comme côté étudiant)
const date = (l) => new Date(l.publie_le || l.updated_at || 0).getTime();

// Détail d'une leçon côté enseignant : ce que voient les étudiants, avec les actions (visibilité, modifier, supprimer).
// Les données viennent de la liste « Mes leçons » déjà en mémoire (même requête).
const LeconProf = () => {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { notify, confirm } = useFeedback();
  const { annee, matieres, recharger: rechargerMatieres } = useMesMatieres(params.get('annee') || '');
  const { data: lecons, erreur, recharger: rechargerLecons } = useDonneesEnseignant(
    annee ? '/enseignant/lecons' : null,
    { annee },
    'Impossible de charger vos leçons.'
  );
  const [apercu, setApercu] = useState(false);
  const [modifier, setModifier] = useState(false);
  const [enCours, setEnCours] = useState(false);

  useEffect(() => setApercu(false), [id]);

  const lecon = (lecons || []).find((l) => String(l.id) === String(id));
  const autres = useMemo(
    () => (lecon ? (lecons || []).filter((l) => l.id_matiere === lecon.id_matiere).sort((a, b) => date(b) - date(a)) : []),
    [lecons, lecon]
  );
  const lienListe = `/prof/lecons${annee ? `?annee=${annee}` : ''}`;
  const lienLecon = (l) => `/prof/lecons/${l.id}${annee ? `?annee=${annee}` : ''}`;

  const actualiser = () => { rechargerLecons(); rechargerMatieres(); };

  const retour = (
    <Link to={lienListe} className="gstf-retour mb-3">
      <i className="bx bx-chevron-left"></i>Mes leçons
    </Link>
  );

  if (!lecons && !erreur) {
    return (
      <div className="container-xxl flex-grow-1 container-p-y" aria-busy="true">
        <span className="visually-hidden" role="status">Chargement de la leçon…</span>
        {retour}
        <Os className="d-block mb-2" largeur="7rem" hauteur="1.3rem" />
        <Os className="d-block mb-2" largeur="18rem" hauteur="1.8rem" />
        <Os className="d-block mb-4" largeur="14rem" hauteur="0.85rem" />
        <div className="row g-4">
          <div className="col-lg-8">
            <div className="card"><div className="card-body">
              {[100, 96, 92, 98, 60].map((l, i) => <Os key={i} className="d-block mb-3" largeur={`${l}%`} />)}
            </div></div>
          </div>
          <div className="col-lg-4">
            <div className="card"><div className="card-body">
              <Os className="d-block mb-3" largeur="8rem" hauteur="1rem" />
              {[0, 1, 2].map((i) => <Os key={i} className="d-block mb-2" hauteur="2.2rem" />)}
            </div></div>
          </div>
        </div>
      </div>
    );
  }

  if (!lecon) {
    return (
      <div className="container-xxl flex-grow-1 container-p-y">
        {retour}
        <div className="card">
          <div className="gstf-empty">
            <i className="bx bx-book-open d-block"></i>
            <p className="mb-3">{erreur || "Cette leçon n'existe plus ou n'appartient pas à l'année affichée."}</p>
            <div className="d-flex justify-content-center gap-2">
              <button type="button" className="btn btn-sm btn-outline-primary" onClick={actualiser}>Réessayer</button>
              <Link to={lienListe} className="btn btn-sm btn-primary">Voir mes leçons</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const matiere = matieres.find((m) => m.id === lecon.id_matiere);
  const position = autres.findIndex((l) => l.id === lecon.id);
  const precedente = position >= 0 ? autres[position + 1] : null;
  const suivante = position > 0 ? autres[position - 1] : null;
  const modifiee = lecon.publie_le && lecon.updated_at && new Date(lecon.updated_at) - new Date(lecon.publie_le) > JOUR;
  const fichier = lecon.fichier ? storageUrl(lecon.fichier) : null;
  const nomFichier = lecon.nom_fichier || 'Fichier joint';
  const ext = extension(lecon.nom_fichier || lecon.fichier);

  const basculer = async () => {
    const publier = !lecon.publie_le;
    setEnCours(true);
    try {
      await api.post(`/enseignant/lecons/${lecon.id}`, versFormulaire({ ...lecon, publier }));
      actualiser();
      notify.success(publier ? 'Leçon publiée : les étudiants peuvent la consulter.' : 'Leçon retirée : les étudiants ne la voient plus.');
    } catch (err) {
      notify.error(errorMessage(err, 'La modification a échoué.'));
    } finally {
      setEnCours(false);
    }
  };

  const supprimer = async () => {
    const ok = await confirm({
      title: `Supprimer « ${lecon.titre} » ?`,
      message: `Elle disparaîtra pour les étudiants${lecon.fichier ? ', avec son fichier joint' : ''}. Cette action est définitive.`,
      confirmLabel: 'Supprimer',
      danger: true,
    });
    if (!ok) return;
    setEnCours(true);
    try {
      const res = await api.delete(`/enseignant/lecons/${lecon.id}`);
      notify.success(res.data.message);
      actualiser();
      navigate(lienListe);
    } catch (err) {
      notify.error(errorMessage(err, 'La suppression a échoué.'));
      setEnCours(false);
    }
  };

  return (
    <div className="container-xxl flex-grow-1 container-p-y">
      {retour}

      <header className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
        <div className="min-w-0">
          <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
            <span className="badge bg-label-primary">{lecon.matiere?.matiere || matiere?.matiere}</span>
            {lecon.matiere?.code_matiere && <span className="badge bg-label-secondary">{lecon.matiere.code_matiere}</span>}
            {matiere?.niveau && <span className="badge bg-label-secondary">{matiere.niveau}</span>}
          </div>
          <h4 className="fw-bold mb-1">{lecon.titre}</h4>
          <small className="text-muted d-flex flex-wrap gap-2">
            <span>
              <i className="bx bx-calendar me-1"></i>
              {lecon.publie_le ? `Publiée le ${dateCourte(lecon.publie_le)}` : `Brouillon · modifié le ${dateCourte(lecon.updated_at)}`}
            </span>
            {modifiee && <span>· mise à jour le {dateCourte(lecon.updated_at)}</span>}
          </small>
        </div>
        <div className="gstf-lecons-prof__actions">
          <div className={`form-check form-switch gstf-lecons-prof__visible${lecon.publie_le ? ' is-visible' : ''}`}
            title={lecon.publie_le ? 'Visible par les étudiants : cliquer pour la retirer' : 'Brouillon : cliquer pour la publier'}>
            <input className="form-check-input" type="checkbox" role="switch" id="visible-detail"
              checked={Boolean(lecon.publie_le)} onChange={basculer} disabled={enCours} />
            <label className="form-check-label" htmlFor="visible-detail">
              {enCours ? <span className="spinner-border spinner-border-sm" role="status" aria-label="En cours" /> : lecon.publie_le ? 'Visible' : 'Masquée'}
            </label>
          </div>
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setModifier(true)} disabled={enCours}>
            <i className="bx bx-edit me-1"></i>Modifier
          </button>
          <button type="button" className="btn btn-sm btn-icon btn-outline-danger" onClick={supprimer} disabled={enCours}
            title="Supprimer" aria-label={`Supprimer ${lecon.titre}`}>
            <i className="bx bx-trash"></i>
          </button>
        </div>
      </header>

      {!lecon.publie_le && (
        <div className="alert alert-secondary d-flex align-items-start gap-2" role="note">
          <i className="bx bx-hide mt-1"></i>
          <span>Brouillon : les étudiants ne voient pas encore cette leçon. Activez « Visible » pour la publier.</span>
        </div>
      )}

      <div className="row g-4">
        <div className="col-lg-8">
          {lecon.contenu && (
            <article className="card mb-4">
              <div className="card-body gstf-lecon__contenu">{lecon.contenu}</div>
            </article>
          )}

          {fichier && (
            <div className="card">
              <div className="card-body">
                <div className="gstf-lecon__fichier">
                  <i className={`bx ${iconeFichier(nomFichier)} gstf-lecon__fichier-icone`} aria-hidden="true"></i>
                  <div className="min-w-0 flex-grow-1">
                    <strong className="d-block text-truncate" title={nomFichier}>{nomFichier}</strong>
                    <small className="text-muted">{ext ? `Fichier ${ext.toUpperCase()}` : 'Fichier joint'}</small>
                  </div>
                  <div className="d-flex flex-wrap gap-2">
                    {apercuPossible(nomFichier) && (
                      <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => setApercu((v) => !v)} aria-expanded={apercu}>
                        <i className={`bx ${apercu ? 'bx-hide' : 'bx-show'} me-1`}></i>{apercu ? "Masquer l'aperçu" : 'Aperçu'}
                      </button>
                    )}
                    <a href={fichier} target="_blank" rel="noreferrer" download={nomFichier} className="btn btn-sm btn-primary">
                      <i className="bx bx-download me-1"></i>Télécharger
                    </a>
                  </div>
                </div>
                {apercu && (
                  <div className="gstf-lecon__apercu mt-3">
                    {ext === 'pdf'
                      ? <iframe src={fichier} title={`Aperçu de ${nomFichier}`} />
                      : <img src={fichier} alt={`Document joint : ${nomFichier}`} />}
                  </div>
                )}
              </div>
            </div>
          )}

          {!lecon.contenu && !fichier && (
            <div className="card"><div className="gstf-empty">Cette leçon n'a ni texte ni fichier.</div></div>
          )}

          {(precedente || suivante) && (
            <nav className="d-flex flex-wrap justify-content-between gap-2 mt-4" aria-label="Leçons de la matière">
              {precedente ? (
                <Link to={lienLecon(precedente)} className="btn btn-outline-secondary">
                  <i className="bx bx-chevron-left me-1"></i>Précédente
                </Link>
              ) : <span />}
              {suivante && (
                <Link to={lienLecon(suivante)} className="btn btn-outline-secondary">
                  Suivante<i className="bx bx-chevron-right ms-1"></i>
                </Link>
              )}
            </nav>
          )}
        </div>

        <aside className="col-lg-4">
          <div className="card">
            <div className="card-header">
              <h6 className="mb-0">Dans cette matière</h6>
              <small className="text-muted">
                {autres.length} leçon{autres.length > 1 ? 's' : ''}
                {' · '}{autres.filter((l) => !l.publie_le).length} brouillon{autres.filter((l) => !l.publie_le).length > 1 ? 's' : ''}
              </small>
            </div>
            <div className="list-group list-group-flush">
              {autres.map((l) => (
                <Link key={l.id} to={lienLecon(l)}
                  className={`list-group-item list-group-item-action gstf-lecon-nav${l.id === lecon.id ? ' is-actuelle' : ''}`}
                  aria-current={l.id === lecon.id ? 'page' : undefined}>
                  <span className="d-block text-truncate fw-semibold">{l.titre}</span>
                  <small className={l.id === lecon.id ? '' : 'text-muted'}>
                    {l.publie_le ? dateCourte(l.publie_le) : <><i className="bx bx-hide me-1"></i>Brouillon</>}
                  </small>
                </Link>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {modifier && (
        <FenetreLecon
          lecon={lecon}
          matieres={matieres}
          annee={annee}
          onEnregistree={(publiee) => {
            setModifier(false);
            actualiser();
            notify.success(publiee ? 'Leçon enregistrée.' : 'Leçon enregistrée en brouillon.');
          }}
          onClose={() => setModifier(false)}
        />
      )}
    </div>
  );
};

export default LeconProf;

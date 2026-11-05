import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { storageUrl } from '../../config';
import { useLecon } from '../../contexts/EspaceEtudiantContext';
import { useNotificationsEtudiant } from '../../contexts/NotificationsEtudiantContext';
import { Os } from '../../components/Squelettes';
import { apercuPossible, dateCourte, extension, iconeFichier } from '../../utils/lecons';

const JOUR = 24 * 60 * 60 * 1000;

// Page d'une leçon : son contenu complet, le fichier joint (aperçu quand le navigateur sait l'afficher)
// et les autres leçons de la même matière pour passer de l'une à l'autre.
const LeconDetail = () => {
  const { id } = useParams();
  const { lecon, loading, erreur, recharger } = useLecon(id);
  const { marquerLeconVue } = useNotificationsEtudiant();
  const [apercu, setApercu] = useState(false);

  // Ouverte : ne compte plus comme nouvelle sur la cloche
  useEffect(() => {
    if (lecon) marquerLeconVue(lecon.id);
  }, [lecon, marquerLeconVue]);
  useEffect(() => setApercu(false), [id]);

  const retour = (
    <Link to="/etudiant/cours" className="gstf-retour mb-3">
      <i className="bx bx-chevron-left"></i>Mes cours
    </Link>
  );

  if (loading) {
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
            <p className="mb-3">{erreur || "Cette leçon n'est pas disponible."}</p>
            <p className="small text-muted mb-3">Elle a peut-être été retirée par l'enseignant.</p>
            <div className="d-flex justify-content-center gap-2">
              <button type="button" className="btn btn-sm btn-outline-primary" onClick={recharger}>Réessayer</button>
              <Link to="/etudiant/cours" className="btn btn-sm btn-primary">Voir mes cours</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const autres = lecon.memes_matiere || [];
  const position = autres.findIndex((l) => l.id === lecon.id);
  // Liste de la plus récente à la plus ancienne : la « suivante » est la plus récente
  const precedente = position >= 0 ? autres[position + 1] : null;
  const suivante = position > 0 ? autres[position - 1] : null;
  const modifiee = lecon.modifie_le && new Date(lecon.modifie_le) - new Date(lecon.publie_le) > JOUR;
  const fichier = lecon.fichier ? storageUrl(lecon.fichier) : null;
  const nomFichier = lecon.nom_fichier || 'Fichier joint';
  const ext = extension(lecon.nom_fichier || lecon.fichier);

  return (
    <div className="container-xxl flex-grow-1 container-p-y">
      {retour}

      <header className="mb-4">
        <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
          <span className="badge bg-label-primary">{lecon.matiere}</span>
          {lecon.code_matiere && <span className="badge bg-label-secondary">{lecon.code_matiere}</span>}
        </div>
        <h4 className="fw-bold mb-1">{lecon.titre}</h4>
        <small className="text-muted d-flex flex-wrap gap-2">
          {lecon.enseignant && <span><i className="bx bx-user me-1"></i>{lecon.enseignant}</span>}
          <span><i className="bx bx-calendar me-1"></i>Publiée le {dateCourte(lecon.publie_le)}</span>
          {modifiee && <span>· mise à jour le {dateCourte(lecon.modifie_le)}</span>}
        </small>
      </header>

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

          {(precedente || suivante) && (
            <nav className="d-flex flex-wrap justify-content-between gap-2 mt-4" aria-label="Leçons de la matière">
              {precedente ? (
                <Link to={`/etudiant/cours/${precedente.id}`} className="btn btn-outline-secondary">
                  <i className="bx bx-chevron-left me-1"></i>Précédente
                </Link>
              ) : <span />}
              {suivante && (
                <Link to={`/etudiant/cours/${suivante.id}`} className="btn btn-outline-secondary">
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
              <small className="text-muted">{autres.length} leçon{autres.length > 1 ? 's' : ''} publiée{autres.length > 1 ? 's' : ''}</small>
            </div>
            <div className="list-group list-group-flush">
              {autres.map((l) => (
                <Link key={l.id} to={`/etudiant/cours/${l.id}`}
                  className={`list-group-item list-group-item-action gstf-lecon-nav${l.id === lecon.id ? ' is-actuelle' : ''}`}
                  aria-current={l.id === lecon.id ? 'page' : undefined}>
                  <span className="d-block text-truncate fw-semibold">{l.titre}</span>
                  <small className={l.id === lecon.id ? '' : 'text-muted'}>{dateCourte(l.publie_le)}</small>
                </Link>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default LeconDetail;

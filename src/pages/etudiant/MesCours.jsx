import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLecons, useParcours } from '../../contexts/EspaceEtudiantContext';
import { useNotificationsEtudiant } from '../../contexts/NotificationsEtudiantContext';
import { ListeCarteChargement } from '../../components/Squelettes';
import { dateCourte, extension } from '../../utils/lecons';

// Première visite (rien de mémorisé) : seules les leçons des 14 derniers jours sont marquées « Nouveau »
const RECENT = 14 * 24 * 60 * 60 * 1000;
const instant = (iso) => (iso ? new Date(iso).getTime() : 0);

// Leçons publiées par les enseignants, rangées par matière ; chaque leçon s'ouvre sur sa page de détail
const MesCours = () => {
  const parcours = useParcours();
  const [parcoursId, setParcoursId] = useState(''); // '' = inscription la plus récente
  const [matiere, setMatiere] = useState(''); // '' = toutes
  // Gardées en mémoire : revenir sur la page l'affiche aussitôt, et une leçon publiée entre-temps s'ajoute en direct
  const { lecons, loading, erreur, recharger } = useLecons(parcoursId);

  // « Nouveau » : publiées depuis la visite précédente (figé à l'ouverture de la page, avant de tout marquer lu)
  const { coursLusJusqua, leconsVues, marquerCoursLus } = useNotificationsEtudiant();
  const [seuil] = useState(() => (coursLusJusqua ? instant(coursLusJusqua) : Date.now() - RECENT));
  const estNouvelle = (l) => instant(l.publie_le) > seuil && !leconsVues.includes(l.id);
  useEffect(() => {
    if (lecons && !parcoursId) marquerCoursLus();
  }, [lecons, parcoursId, marquerCoursLus]);

  useEffect(() => setMatiere(''), [parcoursId]);

  const parMatiere = useMemo(() => {
    const groupes = new Map();
    (lecons || []).forEach((l) => groupes.set(l.matiere, [...(groupes.get(l.matiere) || []), l]));
    return [...groupes.entries()].sort(([a], [b]) => String(a).localeCompare(String(b)));
  }, [lecons]);
  const affiches = matiere ? parMatiere.filter(([m]) => m === matiere) : parMatiere;

  return (
    <div className="container-xxl flex-grow-1 container-p-y">
      <div className="gstf-page-header">
        <div>
          <h4 className="fw-bold mb-1">Mes cours</h4>
          <small className="text-muted">
            {lecons && lecons.length > 0
              ? `${lecons.length} leçon${lecons.length > 1 ? 's' : ''} dans ${parMatiere.length} matière${parMatiere.length > 1 ? 's' : ''}`
              : 'Les leçons déposées par vos enseignants.'}
          </small>
        </div>
        {parcours.length > 1 && (
          <select className="form-select w-auto" aria-label="Année académique" value={parcoursId || parcours[0]?.id || ''}
            onChange={(e) => setParcoursId(e.target.value)}>
            {parcours.map((p) => <option key={p.id} value={p.id}>{p.annee} · {p.niveau}</option>)}
          </select>
        )}
      </div>

      {/* Filtre par matière, seulement s'il y a de quoi filtrer */}
      {parMatiere.length > 1 && (
        <div className="gstf-segments mb-4" role="group" aria-label="Filtrer par matière">
          {[['', 'Toutes', lecons.length], ...parMatiere.map(([m, liste]) => [m, m, liste.length])].map(([valeur, libelle, total]) => (
            <button key={valeur || 'toutes'} type="button" className={`gstf-segments__item ${matiere === valeur ? 'is-active' : ''}`}
              aria-pressed={matiere === valeur} onClick={() => setMatiere(valeur)}>
              {libelle}
              <span className="gstf-segments__nombre">{total}</span>
            </button>
          ))}
        </div>
      )}

      {erreur ? (
        <div className="card">
          <div className="gstf-empty">
            <i className="bx bx-info-circle d-block"></i>
            <p className="mb-3">{erreur}</p>
            <button type="button" className="btn btn-outline-primary btn-sm" onClick={recharger}>Réessayer</button>
          </div>
        </div>
      ) : loading ? (
        <>
          <ListeCarteChargement titre lignes={2} libelle="Chargement de vos cours…" />
          <ListeCarteChargement titre lignes={1} />
        </>
      ) : lecons.length === 0 ? (
        <div className="card">
          <div className="gstf-empty">
            <i className="bx bx-book-open d-block"></i>
            Aucune leçon n'a encore été publiée pour votre niveau.
          </div>
        </div>
      ) : (
        affiches.map(([nom, liste]) => (
          <section className="card mb-4" key={nom} aria-label={nom}>
            <div className="card-header d-flex flex-wrap justify-content-between align-items-center gap-2">
              <h5 className="card-title gstf-section-title mb-0">{nom}</h5>
              <small className="text-muted">
                {liste[0].enseignant ? `${liste[0].enseignant} · ` : ''}{liste.length} leçon{liste.length > 1 ? 's' : ''}
              </small>
            </div>
            <ul className="list-group list-group-flush">
              {liste.map((l) => (
                <li className="list-group-item p-0" key={l.id}>
                  <Link to={`/etudiant/cours/${l.id}`} className="gstf-cours-ligne">
                    <span className="gstf-cours-ligne__icone" aria-hidden="true">
                      <i className={`bx ${l.fichier ? 'bx-file' : 'bx-text'}`}></i>
                    </span>
                    <span className="gstf-cours-ligne__texte">
                      <span className="d-flex flex-wrap align-items-center gap-2">
                        <strong className="gstf-cours-ligne__titre">{l.titre}</strong>
                        {estNouvelle(l) && <span className="badge bg-label-primary">Nouveau</span>}
                      </span>
                      {l.contenu && <span className="gstf-cours-ligne__extrait">{l.contenu}</span>}
                      <small className="text-muted d-flex flex-wrap gap-2">
                        <span>Publiée le {dateCourte(l.publie_le)}</span>
                        {l.fichier && (
                          <span><i className="bx bx-paperclip"></i> {extension(l.nom_fichier || l.fichier).toUpperCase() || 'Fichier'}</span>
                        )}
                      </small>
                    </span>
                    <i className="bx bx-chevron-right gstf-cours-ligne__fleche" aria-hidden="true"></i>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
};

export default MesCours;

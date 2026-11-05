import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLecons, useParcours } from '../../contexts/EspaceEtudiantContext';
import { useNotificationsEtudiant } from '../../contexts/NotificationsEtudiantContext';
import SearchBar from '../../components/SearchBar';
import { CoursChargement } from '../../components/Squelettes';
import { dateCourte, extension, iconeFichier } from '../../utils/lecons';

// Première visite (rien de mémorisé) : seules les leçons des 14 derniers jours sont marquées « Nouveau »
const RECENT = 14 * 24 * 60 * 60 * 1000;
const instant = (iso) => (iso ? new Date(iso).getTime() : 0);

const normaliser = (texte) => String(texte ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
// Terme recherché surligné (comparaison sans accents ni majuscules)
const surligner = (texte, recherche) => {
  const terme = normaliser(recherche);
  const i = terme ? normaliser(texte).indexOf(terme) : -1;
  if (i < 0) return texte;
  return <>{texte.slice(0, i)}<mark>{texte.slice(i, i + terme.length)}</mark>{texte.slice(i + terme.length)}</>;
};
// Extrait centré sur le terme trouvé dans le contenu, pour qu'il reste visible malgré la coupe à deux lignes
const extrait = (contenu, recherche) => {
  const terme = normaliser(recherche);
  const i = terme ? normaliser(contenu).indexOf(terme) : -1;
  return i > 60 ? `…${contenu.slice(i - 40)}` : contenu;
};
const initiales = (nom) => String(nom || '?').split(/\s+/).filter((m) => m.length > 2 || /^[A-Z]/.test(m)).slice(0, 2).map((m) => m[0].toUpperCase()).join('') || '?';

// Leçons publiées par les enseignants, rangées par matière ; chaque leçon s'ouvre sur sa page de détail
const MesCours = () => {
  const parcours = useParcours();
  const [parcoursId, setParcoursId] = useState(''); // '' = inscription la plus récente
  const [matiere, setMatiere] = useState(''); // '' = toutes
  const [recherche, setRecherche] = useState('');
  // Gardées en mémoire : revenir sur la page l'affiche aussitôt, et une leçon publiée entre-temps s'ajoute en direct
  const { lecons, loading, erreur, recharger } = useLecons(parcoursId);

  // « Nouveau » : publiées depuis la visite précédente (figé à l'ouverture de la page, avant de tout marquer lu)
  const { coursLusJusqua, leconsVues, marquerCoursLus } = useNotificationsEtudiant();
  const [seuil] = useState(() => (coursLusJusqua ? instant(coursLusJusqua) : Date.now() - RECENT));
  const estNouvelle = (l) => instant(l.publie_le) > seuil && !leconsVues.includes(l.id);
  useEffect(() => {
    if (lecons && !parcoursId) marquerCoursLus();
  }, [lecons, parcoursId, marquerCoursLus]);

  useEffect(() => { setMatiere(''); setRecherche(''); }, [parcoursId]);

  const parMatiere = useMemo(() => {
    const groupes = new Map();
    (lecons || []).forEach((l) => groupes.set(l.matiere, [...(groupes.get(l.matiere) || []), l]));
    return [...groupes.entries()].sort(([a], [b]) => String(a).localeCompare(String(b)));
  }, [lecons]);

  // Filtre matière puis recherche (titre, contenu, matière, enseignant, type de fichier)
  const terme = normaliser(recherche);
  const affiches = useMemo(() => parMatiere
    .filter(([m]) => !matiere || m === matiere)
    .map(([m, liste]) => [m, terme
      ? liste.filter((l) => normaliser([l.titre, l.contenu, l.matiere, l.enseignant, l.nom_fichier].join(' ')).includes(terme))
      : liste])
    .filter(([, liste]) => liste.length > 0), [parMatiere, matiere, terme]);
  const nbTrouvees = affiches.reduce((n, [, liste]) => n + liste.length, 0);
  const filtre = Boolean(terme || matiere);

  const effacer = () => { setRecherche(''); setMatiere(''); };

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

      {erreur ? (
        <div className="card">
          <div className="gstf-empty">
            <i className="bx bx-info-circle d-block"></i>
            <p className="mb-3">{erreur}</p>
            <button type="button" className="btn btn-outline-primary btn-sm" onClick={recharger}>Réessayer</button>
          </div>
        </div>
      ) : loading ? (
        <CoursChargement libelle="Chargement de vos cours…" />
      ) : lecons.length === 0 ? (
        <div className="card">
          <div className="gstf-empty">
            <i className="bx bx-book-open d-block"></i>
            Aucune leçon n'a encore été publiée pour votre niveau.
          </div>
        </div>
      ) : (
        <>
          <div className="gstf-filtres">
            <SearchBar
              className="gstf-filtres__recherche"
              searchTerm={recherche}
              onSearchChange={setRecherche}
              placeholder="Rechercher une leçon, une matière, un enseignant…"
            />
            {parMatiere.length > 1 && (
              <select className="form-select w-auto gstf-cours-filtre" aria-label="Filtrer par matière" value={matiere}
                onChange={(e) => setMatiere(e.target.value)}>
                <option value="">Toutes les matières ({lecons.length})</option>
                {parMatiere.map(([m, liste]) => <option key={m} value={m}>{m} ({liste.length})</option>)}
              </select>
            )}
          </div>

          {filtre && (
            <p className="gstf-cours-resultats" role="status">
              {nbTrouvees === 0 ? 'Aucune leçon trouvée' : `${nbTrouvees} leçon${nbTrouvees > 1 ? 's' : ''} trouvée${nbTrouvees > 1 ? 's' : ''}`}
              {terme && <> pour « <strong>{recherche.trim()}</strong> »</>}
              <button type="button" className="btn btn-link btn-sm p-0 ms-2" onClick={effacer}>Effacer les filtres</button>
            </p>
          )}

          {affiches.length === 0 ? (
            <div className="card">
              <div className="gstf-empty">
                <i className="bx bx-search-alt d-block"></i>
                <p className="mb-3">Aucune leçon ne correspond à votre recherche.</p>
                <button type="button" className="btn btn-outline-primary btn-sm" onClick={effacer}>Voir toutes les leçons</button>
              </div>
            </div>
          ) : (
            affiches.map(([nom, liste]) => {
              const enseignant = liste[0].enseignant;
              const nouvelles = liste.filter(estNouvelle).length;
              return (
                <section className="card mb-4 gstf-cours-matiere" key={nom} aria-label={nom}>
                  <div className="gstf-cours-matiere__entete">
                    <span className="gstf-cours-matiere__pastille" aria-hidden="true">{initiales(nom)}</span>
                    <div className="flex-grow-1 min-w-0">
                      <h5 className="gstf-cours-matiere__nom">{surligner(nom, recherche)}</h5>
                      {enseignant && (
                        <span className="gstf-cours-matiere__prof">
                          <i className="bx bx-user" aria-hidden="true"></i> {surligner(enseignant, recherche)}
                        </span>
                      )}
                    </div>
                    <div className="d-flex align-items-center gap-2 flex-shrink-0">
                      {nouvelles > 0 && <span className="badge bg-label-primary">{nouvelles} nouvelle{nouvelles > 1 ? 's' : ''}</span>}
                      <span className="gstf-cours-matiere__compte">{liste.length} leçon{liste.length > 1 ? 's' : ''}</span>
                    </div>
                  </div>
                  <ul className="gstf-cours-liste">
                    {liste.map((l) => {
                      const ext = l.fichier ? extension(l.nom_fichier || l.fichier) : '';
                      return (
                        <li key={l.id}>
                          <Link to={`/etudiant/cours/${l.id}`} className={`gstf-cours-ligne${estNouvelle(l) ? ' is-nouvelle' : ''}`}>
                            <span className="gstf-cours-ligne__icone" aria-hidden="true">
                              <i className={`bx ${l.fichier ? iconeFichier(l.nom_fichier || l.fichier) : 'bx-text'}`}></i>
                            </span>
                            <span className="gstf-cours-ligne__texte">
                              <span className="d-flex flex-wrap align-items-center gap-2">
                                <strong className="gstf-cours-ligne__titre">{surligner(l.titre, recherche)}</strong>
                                {estNouvelle(l) && <span className="badge bg-label-primary">Nouveau</span>}
                              </span>
                              {l.contenu && <span className="gstf-cours-ligne__extrait">{surligner(extrait(l.contenu, recherche), recherche)}</span>}
                              <span className="gstf-cours-ligne__meta">
                                <span><i className="bx bx-calendar" aria-hidden="true"></i> {dateCourte(l.publie_le)}</span>
                                {l.fichier && <span className="gstf-cours-ligne__fichier">{ext.toUpperCase() || 'Fichier'}</span>}
                              </span>
                            </span>
                            <i className="bx bx-chevron-right gstf-cours-ligne__fleche" aria-hidden="true"></i>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })
          )}
        </>
      )}
    </div>
  );
};

export default MesCours;

// Squelettes de chargement : la forme de la page apparaît tout de suite, grisée, à la place d'un indicateur qui tourne.
// Chaque squelette reprend la mise en page du contenu qu'il remplace, pour que rien ne saute à l'arrivée des données.
// Les lecteurs d'écran entendent le libellé (« Chargement de vos notes… ») ; les blocs grisés leur sont masqués.

/** Bloc grisé animé */
export const Os = ({ largeur = '100%', hauteur = '0.9rem', className = '', style }) => (
  <span className={`gstf-squelette ${className}`} style={{ width: largeur, height: hauteur, ...style }} aria-hidden="true" />
);

/** Annonce le chargement aux lecteurs d'écran */
const Annonce = ({ libelle }) => <span className="visually-hidden" role="status">{libelle}</span>;

// Largeurs variées : des lignes toutes identiques se lisent comme un motif, pas comme du contenu
const largeur = (i, base, pas) => `${base + (i % 3) * pas}rem`;

/** Rangée de cartes chiffrées (gstf-stat) */
export const StatsChargement = ({ nombre = 3, libelle }) => (
  <div className="row" aria-busy="true">
    {libelle && <Annonce libelle={libelle} />}
    {Array.from({ length: nombre }, (_, i) => (
      <div className="col-sm-6 col-xl-4 mb-4" key={i}>
        <div className="card h-100">
          <div className="card-body gstf-stat">
            {/* Même taille que l'icône réelle (gstf-stat__icon) */}
            <span className="gstf-squelette gstf-stat__icon" aria-hidden="true" />
            <div className="flex-grow-1">
              <Os className="d-block mb-2" largeur={largeur(i, 4.5, 1.5)} hauteur="1.6rem" />
              <Os className="d-block" largeur={largeur(i + 1, 6, 2)} hauteur="0.8rem" />
            </div>
          </div>
        </div>
      </div>
    ))}
  </div>
);

/** Carte contenant une liste (leçons, cours…) ; titre : affiche un en-tête de carte grisé */
export const ListeCarteChargement = ({ lignes = 4, titre = false, actions = false, libelle }) => (
  <div className="card mb-4" aria-busy="true">
    {libelle && <Annonce libelle={libelle} />}
    {titre && (
      <div className="card-header">
        <Os className="d-block" largeur="10rem" hauteur="1.1rem" />
      </div>
    )}
    <ul className="list-group list-group-flush">
      {Array.from({ length: lignes }, (_, i) => (
        <li className="list-group-item d-flex align-items-center gap-3 py-3" key={i} aria-hidden="true">
          <div className="flex-grow-1 min-w-0">
            <Os className="d-block mb-2" largeur={largeur(i, 10, 3)} hauteur="1rem" />
            <Os className="d-block" largeur={largeur(i + 2, 12, 2.5)} hauteur="0.75rem" />
          </div>
          {actions && (
            <div className="d-flex gap-2 flex-shrink-0">
              <Os largeur="4.5rem" hauteur="1.9rem" />
              <Os largeur="1.9rem" hauteur="1.9rem" />
              <Os largeur="1.9rem" hauteur="1.9rem" />
            </div>
          )}
        </li>
      ))}
    </ul>
  </div>
);

/** Tableau dans une carte ; colonnes : libellés d'en-tête (le vrai en-tête reste lisible) */
export const TableauCarteChargement = ({ colonnes, lignes = 6, titre = true, libelle, centrees = [] }) => (
  <div className="card mb-4" aria-busy="true">
    {libelle && <Annonce libelle={libelle} />}
    {titre && (
      <div className="card-header d-flex justify-content-between align-items-center gap-2">
        <Os largeur="10rem" hauteur="1.1rem" />
        <Os largeur="6rem" hauteur="1.9rem" />
      </div>
    )}
    <div className="table-responsive">
      <table className="table mb-0">
        <thead>
          <tr>
            {colonnes.map((c, j) => (
              <th scope="col" key={c} className={centrees.includes(j) ? 'text-center text-nowrap' : undefined}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody aria-hidden="true">
          {Array.from({ length: lignes }, (_, i) => (
            <tr key={i}>
              {colonnes.map((c, j) => (
                <td key={c} className={centrees.includes(j) ? 'text-center' : undefined}>
                  <Os className={centrees.includes(j) ? 'd-inline-block' : 'd-block'}
                    largeur={centrees.includes(j) ? '3rem' : largeur(i + j, j === 0 ? 5 : 9, 2.5)} hauteur="0.9rem" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

/** Mes notes (étudiant) : bilan avec jauge, puis carte du semestre (mêmes classes que la page) */
export const NotesEtudiantChargement = ({ lignes = 5, libelle }) => (
  <div aria-busy="true">
    {libelle && <Annonce libelle={libelle} />}
    <div className="card mb-4" aria-hidden="true">
      <div className="card-body gstf-bilan-notes">
        <span className="gstf-squelette gstf-jauge gstf-jauge--squelette" />
        <div className="gstf-bilan-notes__infos">
          <div>
            <Os className="d-block mb-2" largeur="11rem" hauteur="1.2rem" />
            <Os className="d-block" largeur="5.5rem" hauteur="1.3rem" style={{ borderRadius: '2rem' }} />
          </div>
          <div className="gstf-bilan-notes__chiffres">
            <div>
              <Os className="d-block mb-2" largeur="7rem" hauteur="0.75rem" />
              <Os className="d-block mb-2" largeur="3.5rem" hauteur="1.35rem" />
              <Os className="d-block" hauteur="0.5rem" />
            </div>
            <div>
              <Os className="d-block mb-2" largeur="7.5rem" hauteur="0.75rem" />
              <Os className="d-block" largeur="3rem" hauteur="1.35rem" />
            </div>
          </div>
        </div>
      </div>
    </div>
    <div className="card mb-4" aria-hidden="true">
      <div className="card-header d-flex flex-wrap justify-content-between align-items-center gap-3">
        <Os largeur="8rem" hauteur="2.3rem" />
        <div className="d-flex align-items-center gap-2">
          <Os largeur="8rem" hauteur="0.8rem" />
          <Os largeur="3.5rem" hauteur="1.15rem" />
        </div>
      </div>
      <ul className="gstf-notes-liste">
        {Array.from({ length: lignes }, (_, i) => (
          <li className="gstf-note-ligne" key={i}>
            <div className="gstf-note-ligne__matiere">
              <Os className="d-block mb-2" largeur={largeur(i, 9, 3)} hauteur="1rem" />
              <Os className="d-block" largeur={largeur(i + 1, 8, 1.5)} hauteur="0.7rem" />
            </div>
            <div className="gstf-note-ligne__note">
              {/* Largeur laissée à la classe (plus courte sur mobile) */}
              <span className="gstf-squelette gstf-note-ligne__barre" />
              <Os largeur="3rem" hauteur="1.05rem" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  </div>
);

/** Mes cours (étudiant) : barre de recherche, puis une carte par matière (mêmes classes que la page) */
export const CoursChargement = ({ matieres = [2, 1], libelle }) => (
  <div aria-busy="true">
    {libelle && <Annonce libelle={libelle} />}
    <div className="gstf-filtres" aria-hidden="true">
      <Os className="gstf-filtres__recherche" hauteur="2.4rem" />
      <Os largeur="12rem" hauteur="2.4rem" />
    </div>
    {matieres.map((lignes, k) => (
      <div className="card mb-4 gstf-cours-matiere" key={k} aria-hidden="true">
        <div className="gstf-cours-matiere__entete">
          <span className="gstf-squelette gstf-cours-matiere__pastille" />
          <div className="flex-grow-1 min-w-0">
            <Os className="d-block mb-2" largeur={largeur(k, 9, 3)} hauteur="1.1rem" />
            <Os className="d-block" largeur="7rem" hauteur="0.75rem" />
          </div>
          <Os largeur="4.5rem" hauteur="1.4rem" />
        </div>
        <ul className="gstf-cours-liste">
          {Array.from({ length: lignes }, (_, i) => (
            <li key={i}>
              <div className="gstf-cours-ligne">
                <span className="gstf-squelette gstf-cours-ligne__icone" />
                <span className="gstf-cours-ligne__texte">
                  <Os className="d-block" largeur={largeur(i + k, 10, 3)} hauteur="1rem" />
                  <Os className="d-block" largeur="90%" hauteur="0.75rem" />
                  <Os className="d-block" largeur="8rem" hauteur="0.7rem" />
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    ))}
  </div>
);

/** Lignes de matières de l'enseignant (même grille que gstf-matiere-prof) */
export const MatieresChargement = ({ nombre = 2, libelle }) => (
  <div aria-busy="true">
    {libelle && <Annonce libelle={libelle} />}
    {Array.from({ length: nombre }, (_, i) => (
      <div className="card gstf-matiere-prof mb-3" key={i} aria-hidden="true">
        <div className="gstf-matiere-prof__corps">
          <div className="gstf-matiere-prof__identite">
            <span className="gstf-squelette gstf-matiere-prof__pastille" />
            <div className="flex-grow-1 min-w-0">
              <Os className="d-block mb-2" largeur={largeur(i, 10, 3)} hauteur="1.2rem" />
              <Os className="d-block" largeur="14rem" hauteur="0.8rem" />
            </div>
          </div>
          <div className="gstf-matiere-prof__suivi">
            <div className="d-flex justify-content-between mb-2">
              <Os largeur="6rem" hauteur="0.75rem" />
              <Os largeur="2.5rem" hauteur="0.75rem" />
            </div>
            <Os className="d-block mb-2" hauteur="0.5rem" />
            <div className="d-flex gap-2">
              <Os largeur="6.5rem" hauteur="1.3rem" />
              <Os largeur="4.5rem" hauteur="1.3rem" />
            </div>
          </div>
          <div className="gstf-matiere-prof__actions">
            <Os largeur="9.5rem" hauteur="2.4rem" />
            <Os largeur="6rem" hauteur="2.4rem" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

import React from 'react';
import { Link } from 'react-router-dom';
import Accueil from '../Accueil';
import useMesMatieres from '../../hooks/useMesMatieres';

// Chiffres de l'année et matières dont les notes ne sont pas complètes
const Resume = () => {
  const { annee, matieres, chargement, erreur } = useMesMatieres('');

  if (chargement || erreur) return null;
  if (matieres.length === 0) {
    return (
      <div className="alert alert-info d-flex align-items-start gap-2 mb-4" role="note">
        <i className="bx bx-info-circle mt-1"></i>
        <span>Aucune matière ne vous est attribuée pour le moment. Dès que l'administration l'aura fait, vous pourrez saisir vos notes et déposer vos leçons ici.</span>
      </div>
    );
  }

  const aCompleter = matieres.filter((m) => !m.publie && m.notes_saisies < m.etudiants);
  const notesManquantes = aCompleter.reduce((s, m) => s + m.etudiants - m.notes_saisies, 0);
  const lecons = matieres.reduce((s, m) => s + m.lecons, 0);

  return (
    <>
      <div className="row">
        {[
          { libelle: matieres.length > 1 ? 'Matières cette année' : 'Matière cette année', valeur: matieres.length, icone: 'bx-book', to: '/prof/matieres' },
          { libelle: notesManquantes > 1 ? 'Notes à saisir' : 'Note à saisir', valeur: notesManquantes, icone: 'bx-spreadsheet', to: '/prof/notes' },
          { libelle: lecons > 1 ? 'Leçons déposées' : 'Leçon déposée', valeur: lecons, icone: 'bx-book-open', to: '/prof/lecons' },
        ].map((c) => (
          <div className="col-sm-6 col-xl-4 mb-4" key={c.to}>
            <Link to={c.to} className="card h-100 text-decoration-none">
              <div className="card-body gstf-stat">
                <div className="gstf-stat__icon" aria-hidden="true"><i className={`bx ${c.icone}`}></i></div>
                <div>
                  <div className="gstf-stat__value">{c.valeur}</div>
                  <div className="gstf-stat__label">{c.libelle}</div>
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>

      {aCompleter.length > 0 && (
        <div className="card mb-4">
          <div className="card-header">
            <h5 className="card-title gstf-section-title mb-0">Notes à compléter</h5>
          </div>
          <ul className="list-group list-group-flush">
            {aCompleter.slice(0, 5).map((m) => (
              <li className="list-group-item d-flex flex-wrap align-items-center gap-2" key={m.id}>
                <span className="flex-grow-1">
                  <strong>{m.matiere}</strong>
                  <small className="text-muted ms-2">{m.niveau} · {m.notes_saisies} / {m.etudiants}</small>
                </span>
                <Link className="btn btn-sm btn-outline-primary" to={`/prof/notes?matiere=${m.id}&annee=${annee}`}>Saisir</Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
};

const ProfDashboard = () => (
  <Accueil
    annoncesTo="/prof/annonce"
    enTete={<Resume />}
    liens={[
      { to: '/prof/matieres', icon: 'bx-book', label: 'Mes matières' },
      { to: '/prof/notes', icon: 'bx-spreadsheet', label: 'Saisie des notes' },
      { to: '/prof/lecons', icon: 'bx-book-open', label: 'Mes leçons' },
      { to: '/prof/edt', icon: 'bx-calendar', label: 'Emploi du temps' },
    ]}
  />
);

export default ProfDashboard;

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import useMesMatieres from '../../hooks/useMesMatieres';
import { MatieresChargement } from '../../components/Squelettes';

const pluriel = (n, mot, motPluriel = `${mot}s`) => `${n} ${n > 1 ? motPluriel : mot}`;

// Pastille de la matière : son code (PHM), sinon les initiales de son nom (Philosophie morale → PM)
const pastille = (m) =>
  m.code ||
  String(m.matiere)
    .split(/\s+/)
    .filter((mot) => mot.length > 2)
    .slice(0, 2)
    .map((mot) => mot[0].toUpperCase())
    .join('') ||
  String(m.matiere).slice(0, 2).toUpperCase();

// Où en sont les notes : une seule étiquette, celle qui demande (ou non) une action
const etatNotes = (m) => {
  if (m.publie) return { libelle: 'Notes publiées', classe: 'bg-label-success', icone: 'bx-lock-alt' };
  if (m.etudiants === 0) return { libelle: 'Aucun étudiant inscrit', classe: 'bg-label-secondary', icone: 'bx-group' };
  const reste = m.etudiants - m.notes_saisies;
  if (reste <= 0) return { libelle: 'Notes complètes', classe: 'bg-label-info', icone: 'bx-check' };
  return { libelle: `${pluriel(reste, 'note')} à saisir`, classe: 'bg-label-warning', icone: 'bx-edit-alt' };
};

const LigneMatiere = ({ m, annee }) => {
  const progression = m.etudiants ? Math.round((m.notes_saisies / m.etudiants) * 100) : 0;
  const etat = etatNotes(m);
  const details = [
    m.semestre,
    `Coef. ${m.coefficient}`,
    m.heures ? `${m.heures} h` : null,
    pluriel(m.etudiants, 'étudiant'),
  ].filter(Boolean);

  return (
    <article className="card gstf-matiere-prof mb-3" aria-labelledby={`matiere-${m.id}`}>
      <div className="gstf-matiere-prof__corps">
        {/* Identité : quelle matière, pour qui */}
        <div className="gstf-matiere-prof__identite">
          <span className="gstf-matiere-prof__pastille" aria-hidden="true">{pastille(m)}</span>
          <div className="min-w-0">
            <h5 className="gstf-matiere-prof__nom" id={`matiere-${m.id}`}>{m.matiere}</h5>
            <div className="gstf-matiere-prof__details">
              <span className="badge bg-label-primary">{m.niveau}</span>
              {details.map((d) => <span key={d}>{d}</span>)}
            </div>
          </div>
        </div>

        {/* Avancement : notes saisies et leçons déposées */}
        <div className="gstf-matiere-prof__suivi">
          <div className="d-flex justify-content-between align-items-baseline small mb-1">
            <span className="text-muted">Notes saisies</span>
            <strong className="gstf-matiere-prof__compte">{m.notes_saisies} / {m.etudiants}</strong>
          </div>
          <div className="gstf-bar" role="progressbar" aria-valuenow={progression} aria-valuemin="0" aria-valuemax="100" aria-label={`Notes saisies en ${m.matiere}`}>
            <span style={{ width: `${progression}%` }}></span>
          </div>
          <div className="d-flex flex-wrap gap-2 mt-2">
            <span className={`badge ${etat.classe}`}><i className={`bx ${etat.icone} me-1`}></i>{etat.libelle}</span>
            <span className="badge bg-label-secondary"><i className="bx bx-book-open me-1"></i>{pluriel(m.lecons, 'leçon')}</span>
          </div>
        </div>

        <div className="gstf-matiere-prof__actions">
          <Link className="btn btn-primary" to={`/prof/notes?matiere=${m.id}&annee=${annee}`}>
            <i className="bx bx-spreadsheet me-1"></i>{m.publie ? 'Voir les notes' : 'Saisir les notes'}
          </Link>
          <Link className="btn btn-outline-primary" to={`/prof/lecons?matiere=${m.id}&annee=${annee}`}>
            <i className="bx bx-book-open me-1"></i>Leçons
          </Link>
        </div>
      </div>
    </article>
  );
};

// Une ligne par matière attribuée : où en sont les notes, et l'accès direct à la saisie et aux leçons.
// Pleine largeur : une seule matière s'affiche aussi bien que dix.
const MesMatieres = () => {
  const [anneeChoisie, setAnneeChoisie] = useState('');
  const { annees, annee, matieres, chargement, erreur, recharger } = useMesMatieres(anneeChoisie);

  const libelleAnnee = annees.find((a) => String(a.id) === String(annee))?.annee_aca;
  const aSaisir = matieres.filter((m) => !m.publie).reduce((s, m) => s + Math.max(0, m.etudiants - m.notes_saisies), 0);
  const lecons = matieres.reduce((s, m) => s + m.lecons, 0);

  // Plusieurs niveaux : un intertitre par niveau (la liste arrive déjà triée par niveau)
  const parNiveau = matieres.reduce((groupes, m) => {
    const dernier = groupes[groupes.length - 1];
    if (dernier && dernier.niveau === m.niveau) dernier.matieres.push(m);
    else groupes.push({ niveau: m.niveau, matieres: [m] });
    return groupes;
  }, []);

  return (
    <div className="container-xxl flex-grow-1 container-p-y">
      <div className="gstf-page-header">
        <div>
          <h4 className="fw-bold mb-1">Mes matières</h4>
          <small className="text-muted">
            {!chargement && !erreur && matieres.length > 0
              ? [
                  `${pluriel(matieres.length, 'matière')}${libelleAnnee ? ` en ${libelleAnnee}` : ''}`,
                  aSaisir > 0 ? `${pluriel(aSaisir, 'note')} à saisir` : 'toutes les notes sont saisies',
                  `${pluriel(lecons, 'leçon déposée', 'leçons déposées')}`,
                ].join(' · ')
              : "Les matières que l'administration vous a attribuées."}
          </small>
        </div>
        {annees.length > 1 && (
          <select className="form-select w-auto" aria-label="Année académique" value={annee ?? ''} onChange={(e) => setAnneeChoisie(e.target.value)}>
            {annees.map((a) => <option key={a.id} value={a.id}>{a.annee_aca}</option>)}
          </select>
        )}
      </div>

      {chargement ? (
        <MatieresChargement libelle="Chargement de vos matières…" />
      ) : erreur ? (
        <div className="card">
          <div className="gstf-empty">
            <i className="bx bx-error-circle d-block"></i>
            <p className="mb-3">{erreur}</p>
            <button type="button" className="btn btn-sm btn-outline-primary" onClick={recharger}>Réessayer</button>
          </div>
        </div>
      ) : matieres.length === 0 ? (
        <div className="card">
          <div className="gstf-empty">
            <i className="bx bx-book d-block"></i>
            Aucune matière ne vous est attribuée {libelleAnnee ? `en ${libelleAnnee}` : 'pour le moment'}. L'administration les attribue depuis le programme de l'année.
          </div>
        </div>
      ) : parNiveau.length === 1 ? (
        matieres.map((m) => <LigneMatiere key={m.id} m={m} annee={annee} />)
      ) : (
        parNiveau.map((g) => (
          <section key={g.niveau} className="mb-4" aria-label={`Niveau ${g.niveau}`}>
            <h6 className="gstf-matiere-prof__groupe">
              {g.niveau}<span>{pluriel(g.matieres.length, 'matière')}</span>
            </h6>
            {g.matieres.map((m) => <LigneMatiere key={m.id} m={m} annee={annee} />)}
          </section>
        ))
      )}
    </div>
  );
};

export default MesMatieres;

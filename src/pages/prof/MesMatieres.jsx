import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import useMesMatieres from '../../hooks/useMesMatieres';

// Une ligne par matière attribuée : où en sont les notes, et l'accès direct à la saisie et aux leçons
const MesMatieres = () => {
  const [anneeChoisie, setAnneeChoisie] = useState('');
  const { annees, annee, matieres, chargement, erreur, recharger } = useMesMatieres(anneeChoisie);

  return (
    <div className="container-xxl flex-grow-1 container-p-y">
      <div className="gstf-page-header">
        <div>
          <h4 className="fw-bold mb-1">Mes matières</h4>
          <small className="text-muted">Les matières que l'administration vous a attribuées.</small>
        </div>
        {annees.length > 1 && (
          <select className="form-select w-auto" aria-label="Année académique" value={annee ?? ''} onChange={(e) => setAnneeChoisie(e.target.value)}>
            {annees.map((a) => <option key={a.id} value={a.id}>{a.annee_aca}</option>)}
          </select>
        )}
      </div>

      {chargement ? (
        <div className="text-center py-5" role="status">
          <div className="spinner-border text-primary"></div>
          <p className="mt-2 text-muted">Chargement de vos matières…</p>
        </div>
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
            Aucune matière ne vous est attribuée pour le moment. L'administration les attribue depuis le programme de l'année.
          </div>
        </div>
      ) : (
        <div className="row">
          {matieres.map((m) => {
            const progression = m.etudiants ? Math.round((m.notes_saisies / m.etudiants) * 100) : 0;
            return (
              <div className="col-md-6 col-xl-4 mb-4" key={m.id}>
                <div className="card h-100">
                  <div className="card-body d-flex flex-column">
                    <h5 className="card-title mb-1">{m.matiere}</h5>
                    <small className="text-muted mb-3">
                      {m.niveau}{m.semestre ? ` · ${m.semestre}` : ''} · Coef. {m.coefficient}{m.heures ? ` · ${m.heures} h` : ''}
                    </small>

                    <div className="d-flex justify-content-between small mb-1">
                      <span>Notes saisies</span>
                      <span>{m.notes_saisies} / {m.etudiants}</span>
                    </div>
                    <div className="gstf-bar mb-3" role="progressbar" aria-valuenow={progression} aria-valuemin="0" aria-valuemax="100" aria-label={`Notes saisies en ${m.matiere}`}>
                      <span style={{ width: `${progression}%` }}></span>
                    </div>

                    <div className="d-flex flex-wrap gap-2 mb-3">
                      {m.publie
                        ? <span className="badge bg-label-success"><i className="bx bx-lock-alt me-1"></i>Notes publiées</span>
                        : <span className="badge bg-label-secondary">Non publiées</span>}
                      <span className="badge bg-label-primary">{m.lecons} leçon{m.lecons > 1 ? 's' : ''}</span>
                    </div>

                    <div className="d-flex flex-wrap gap-2 mt-auto">
                      <Link className="btn btn-sm btn-primary" to={`/prof/notes?matiere=${m.id}&annee=${annee}`}>
                        <i className="bx bx-spreadsheet me-1"></i>{m.publie ? 'Voir les notes' : 'Saisir les notes'}
                      </Link>
                      <Link className="btn btn-sm btn-outline-primary" to={`/prof/lecons?matiere=${m.id}&annee=${annee}`}>
                        <i className="bx bx-book-open me-1"></i>Leçons
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MesMatieres;

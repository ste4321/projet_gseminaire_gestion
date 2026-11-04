import React, { useEffect, useMemo, useState } from 'react';
import api, { errorMessage, estAnnulee } from '../../api/client';
import { storageUrl } from '../../config';
import { useParcours } from '../../contexts/EspaceEtudiantContext';

const dateCourte = (iso) => (iso ? new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '');

// Leçons publiées par les enseignants, rangées par matière
const MesCours = () => {
  const parcours = useParcours();
  const [parcoursId, setParcoursId] = useState(''); // '' = inscription la plus récente
  const [lecons, setLecons] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const controle = new AbortController();
    setLecons(null);
    setErreur(null);
    api
      .get('/etudiant/lecons', { params: { parcours: parcoursId || undefined }, signal: controle.signal })
      .then((res) => setLecons(res.data))
      .catch((err) => {
        if (!estAnnulee(err)) setErreur(errorMessage(err, 'Impossible de charger vos cours.'));
      });
    return () => controle.abort();
  }, [parcoursId, version]);

  const parMatiere = useMemo(() => {
    const groupes = new Map();
    (lecons || []).forEach((l) => groupes.set(l.matiere, [...(groupes.get(l.matiere) || []), l]));
    return [...groupes.entries()].sort(([a], [b]) => String(a).localeCompare(String(b)));
  }, [lecons]);

  return (
    <div className="container-xxl flex-grow-1 container-p-y">
      <div className="gstf-page-header">
        <div>
          <h4 className="fw-bold mb-1">Mes cours</h4>
          <small className="text-muted">Les leçons déposées par vos enseignants.</small>
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
            <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => setVersion((v) => v + 1)}>Réessayer</button>
          </div>
        </div>
      ) : lecons === null ? (
        <div className="text-center py-5" role="status">
          <div className="spinner-border text-primary"></div>
          <p className="mt-2 text-muted">Chargement de vos cours…</p>
        </div>
      ) : lecons.length === 0 ? (
        <div className="card">
          <div className="gstf-empty">
            <i className="bx bx-book-open d-block"></i>
            Aucune leçon n'a encore été publiée pour votre niveau.
          </div>
        </div>
      ) : (
        parMatiere.map(([matiere, liste]) => (
          <div className="card mb-4" key={matiere}>
            <div className="card-header">
              <h5 className="card-title gstf-section-title mb-0">{matiere}</h5>
            </div>
            <ul className="list-group list-group-flush">
              {liste.map((l) => (
                <li className="list-group-item py-3" key={l.id}>
                  <div className="d-flex flex-wrap justify-content-between gap-2">
                    <strong>{l.titre}</strong>
                    <small className="text-muted">{l.enseignant ? `${l.enseignant} · ` : ''}{dateCourte(l.publie_le)}</small>
                  </div>
                  {l.contenu && <p className="mb-2 mt-2" style={{ whiteSpace: 'pre-line' }}>{l.contenu}</p>}
                  {l.fichier && (
                    <a href={storageUrl(l.fichier)} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-primary mt-2">
                      <i className="bx bx-download me-1"></i>{l.nom_fichier || 'Télécharger'}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </div>
  );
};

export default MesCours;

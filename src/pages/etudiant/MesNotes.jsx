import React, { useEffect, useState } from 'react';
import { useFeedback } from '../../contexts/FeedbackContext';
import { useParcours, useReleve } from '../../contexts/EspaceEtudiantContext';
import { useNotificationsEtudiant } from '../../contexts/NotificationsEtudiantContext';
import { telechargerBulletin } from '../../utils/bulletin';
import StatutResultat from '../../components/StatutResultat';
import { NotesEtudiantChargement } from '../../components/Squelettes';

const format = (n) => (n === null || n === undefined ? '—' : Number(n).toFixed(2));
const estNote = (n) => n !== null && n !== undefined;

// Jauge circulaire de la moyenne sur 20
const Jauge = ({ valeur }) => {
  const r = 52;
  const tour = 2 * Math.PI * r;
  const ratio = estNote(valeur) ? Math.min(Math.max(valeur / 20, 0), 1) : 0;
  const faible = estNote(valeur) && valeur < 10;
  return (
    <div className={`gstf-jauge${faible ? ' is-faible' : ''}`} role="img"
      aria-label={estNote(valeur) ? `Moyenne ${format(valeur)} sur 20` : 'Moyenne non disponible'}>
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <circle className="gstf-jauge__fond" cx="60" cy="60" r={r} />
        <circle className="gstf-jauge__arc" cx="60" cy="60" r={r}
          strokeDasharray={tour} strokeDashoffset={tour * (1 - ratio)} />
      </svg>
      <div className="gstf-jauge__texte" aria-hidden="true">
        <strong>{format(valeur)}</strong>
        <span>/ 20</span>
      </div>
    </div>
  );
};

// Une matière : nom, détails, note et barre sur 20 (seule une note sous la moyenne est signalée)
const LigneMatiere = ({ m }) => {
  const saisie = estNote(m.note);
  const faible = saisie && m.note < 10;
  return (
    <li className={`gstf-note-ligne${faible ? ' is-faible' : ''}`}>
      <div className="gstf-note-ligne__matiere">
        <span className="gstf-note-ligne__nom">{m.matiere}</span>
        <span className="gstf-note-ligne__details">
          {m.code} · {m.heures} h · <span className="gstf-note-ligne__coef">coef. {m.coefficient}</span>
        </span>
      </div>
      <div className="gstf-note-ligne__note">
        <div className="gstf-note-ligne__barre" aria-hidden="true">
          <span style={{ width: saisie ? `${Math.min(m.note / 20, 1) * 100}%` : 0 }}></span>
        </div>
        {saisie ? (
          <strong title={faible ? 'Inférieure à 10 / 20' : undefined}>
            {format(m.note)}
            {faible && <span className="visually-hidden"> (inférieure à 10)</span>}
          </strong>
        ) : (
          <strong className="is-vide" title="Note pas encore saisie">—</strong>
        )}
      </div>
    </li>
  );
};

const MesNotes = () => {
  const { notify } = useFeedback();
  const parcours = useParcours();
  const [parcoursId, setParcoursId] = useState(''); // '' = inscription la plus récente
  // Gardé en mémoire : revenir sur la page (ou sur une année déjà vue) l'affiche aussitôt
  const { releve, loading, erreur, recharger } = useReleve(parcoursId);
  const [pdfEnCours, setPdfEnCours] = useState(false);
  const [semestreChoisi, setSemestreChoisi] = useState(null);

  // Page consultée : les notes publiées ne comptent plus comme nouvelles (cloche de l'en-tête)
  const { marquerNotesLues } = useNotificationsEtudiant();
  useEffect(() => {
    if (releve) marquerNotesLues();
  }, [releve, marquerNotesLues]);

  const telecharger = async () => {
    setPdfEnCours(true);
    try {
      await telechargerBulletin(releve, { publiesSeulement: true });
      notify.success('Bulletin téléchargé.');
    } catch (e) {
      notify.error("Le bulletin n'a pas pu être généré.");
    } finally {
      setPdfEnCours(false);
    }
  };

  const general = releve?.general;
  const progression = general?.matieres_total ? Math.round((general.notes_saisies / general.matieres_total) * 100) : 0;
  const aucunePublication = general && general.semestres_publies === 0;
  const publicationPartielle = general && general.semestres_publies > 0 && general.semestres_publies < general.semestres_total;

  // Semestre affiché : celui choisi, sinon le dernier publié, sinon le premier
  const semestres = releve?.semestres ?? [];
  const cle = (s) => s.id ?? 'hors';
  const semestre = semestres.find((s) => cle(s) === semestreChoisi)
    ?? [...semestres].reverse().find((s) => s.publie)
    ?? semestres[0];

  return (
    <div className="container-xxl flex-grow-1 container-p-y">
      <div className="gstf-page-header">
        <div>
          <h4 className="fw-bold">Mes notes</h4>
          {releve && <small className="text-muted">{releve.niveau} · Année académique {releve.annee}</small>}
        </div>
        <div className="d-flex flex-wrap align-items-center gap-2">
          {parcours.length > 1 && (
            <select
              className="form-select w-auto"
              aria-label="Année académique"
              value={parcoursId || releve?.parcours_id || ''}
              onChange={(e) => setParcoursId(e.target.value)}
            >
              {parcours.map((p) => <option key={p.id} value={p.id}>{p.annee} · {p.niveau}</option>)}
            </select>
          )}
          <button type="button" className="btn btn-primary" onClick={telecharger} disabled={!releve || aucunePublication || pdfEnCours || loading}
            title={aucunePublication ? 'Disponible dès la publication de vos notes' : undefined}>
            <i className="bx bx-download me-1"></i>
            {pdfEnCours ? 'Préparation…' : 'Télécharger mon bulletin'}
          </button>
        </div>
      </div>

      {loading && !releve ? (
        <NotesEtudiantChargement libelle="Chargement de vos notes…" />
      ) : erreur ? (
        <div className="card">
          <div className="gstf-empty">
            <i className="bx bx-info-circle d-block"></i>
            <p className="mb-3">{erreur}</p>
            <button type="button" className="btn btn-outline-primary btn-sm" onClick={recharger}>Réessayer</button>
          </div>
        </div>
      ) : releve && (
        <>
          <div className="card mb-4">
            <div className="card-body gstf-bilan-notes">
              <Jauge valeur={general.moyenne} />
              <div className="gstf-bilan-notes__infos">
                <div>
                  <div className="gstf-bilan-notes__titre">
                    {publicationPartielle ? 'Moyenne des semestres publiés' : 'Moyenne générale'}
                  </div>
                  <StatutResultat statut={general.statut} attente={general.semestres_publies < general.semestres_total ? 'Après publication' : 'Notes incomplètes'} />
                </div>
                <dl className="gstf-bilan-notes__chiffres">
                  <div>
                    <dt>Notes disponibles</dt>
                    <dd>{general.notes_saisies} <small>/ {general.matieres_total}</small></dd>
                    <div className="gstf-bar mt-1" role="progressbar" aria-valuenow={progression} aria-valuemin="0" aria-valuemax="100" aria-label="Notes disponibles">
                      <span style={{ width: `${progression}%` }}></span>
                    </div>
                  </div>
                  <div>
                    <dt>Semestres publiés</dt>
                    <dd>{general.semestres_publies} <small>/ {general.semestres_total}</small></dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>

          {aucunePublication && general.matieres_total > 0 && (
            <div className="card mb-4" role="status">
              <div className="card-body gstf-stat align-items-start">
                <div className="gstf-stat__icon gstf-stat__icon--gold" aria-hidden="true"><i className="bx bx-time-five"></i></div>
                <div>
                  <strong className="d-block text-body mb-1">Vos notes ne sont pas encore publiées.</strong>
                  <span className="text-muted">Elles apparaîtront ici dès que l'administration aura publié les résultats du semestre.</span>
                </div>
              </div>
            </div>
          )}

          {general.matieres_total === 0 ? (
            <div className="card">
              <div className="gstf-empty">
                <i className="bx bx-book d-block"></i>
                Aucune matière n'est encore au programme de votre niveau pour cette année.
              </div>
            </div>
          ) : semestre && (
            <div className="card mb-4">
              <div className="card-header d-flex flex-wrap justify-content-between align-items-center gap-3">
                {semestres.length > 1 ? (
                  <div className="gstf-segments" role="group" aria-label="Choisir le semestre">
                    {semestres.map((s) => (
                      <button key={cle(s)} type="button" aria-pressed={s === semestre}
                        className={`gstf-segments__item ${s === semestre ? 'is-active' : ''}`}
                        onClick={() => setSemestreChoisi(cle(s))}
                        title={s.publie ? undefined : 'Pas encore publié'}>
                        {!s.publie && <i className="bx bx-lock-alt" aria-hidden="true"></i>}
                        {s.semestre}
                      </button>
                    ))}
                  </div>
                ) : (
                  <h5 className="card-title gstf-section-title mb-0">{semestre.semestre}</h5>
                )}
                {semestre.publie ? (
                  <div className="gstf-note-semestre">
                    <span>Moyenne du semestre</span>
                    <strong>{format(semestre.moyenne)}<small> / 20</small></strong>
                    {semestre.statut && <StatutResultat statut={semestre.statut} />}
                  </div>
                ) : (
                  <span className="badge bg-label-secondary">Pas encore publié</span>
                )}
              </div>
              {!semestre.publie ? (
                <div className="gstf-empty">
                  <i className="bx bx-lock-alt d-block"></i>
                  Les notes de ce semestre ({semestre.matieres.length} matière{semestre.matieres.length > 1 ? 's' : ''}) seront visibles après leur publication.
                </div>
              ) : (
                <ul className="gstf-notes-liste">
                  {semestre.matieres.map((m) => <LigneMatiere key={m.id} m={m} />)}
                </ul>
              )}
            </div>
          )}

          <p className="small text-muted">
            <i className="bx bx-info-circle me-1"></i>
            La moyenne est pondérée par les coefficients et ne tient compte que des matières déjà notées.
            Le résultat (Validé à partir de 10/20, sinon Rattrapage) s'affiche quand toutes les notes sont publiées.
            Une question sur une note ? Adressez-vous au secrétariat des études.
          </p>
        </>
      )}
    </div>
  );
};

export default MesNotes;

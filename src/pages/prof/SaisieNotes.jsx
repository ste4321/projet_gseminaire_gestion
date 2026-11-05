import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api, { errorMessage } from '../../api/client';
import { useFeedback } from '../../contexts/FeedbackContext';
import { useDonneesEnseignant } from '../../contexts/EspaceEnseignantContext';
import { StatsChargement, TableauCarteChargement } from '../../components/Squelettes';
import useMesMatieres from '../../hooks/useMesMatieres';
import ImportNotes from '../../components/ImportNotes';

// Saisie accepte la virgule : « 12,5 » vaut 12.5. Renvoie null (vide), un nombre, ou NaN (saisie invalide).
const lire = (texte) => {
  const brut = String(texte ?? '').trim().replace(',', '.');
  if (brut === '') return null;
  const nombre = Number(brut);
  return nombre >= 0 && nombre <= 20 ? nombre : NaN;
};

const format = (n) => (n === null || n === undefined ? '—' : Number(n).toFixed(2));

const SaisieNotes = () => {
  const { notify, confirm } = useFeedback();
  const [params, setParams] = useSearchParams();
  const anneeParam = params.get('annee') || '';
  const matiereParam = params.get('matiere') || '';

  const { annees, annee, matieres, chargement, erreur: erreurMatieres, recharger: rechargerMatieres } = useMesMatieres(anneeParam);
  const matiereId = matiereParam || (matieres[0] ? String(matieres[0].id) : '');

  // Réponse du serveur pour la matière affichée, gardée en mémoire d'une page à l'autre (EspaceEnseignantContext)
  const { data: donnees, erreur, recharger: rechargerNotes } = useDonneesEnseignant(
    matiereId && annee ? `/enseignant/matieres/${matiereId}/notes` : null,
    { annee },
    'Impossible de charger les notes.'
  );
  const [saisies, setSaisies] = useState({}); // id_etudiant_parcours → texte saisi
  const [envoi, setEnvoi] = useState(false);
  const [importOuvert, setImportOuvert] = useState(false);
  const champs = useRef({});
  const recues = useRef({ cle: null, donnees: null }); // réponse d'où viennent les saisies

  // Nouvelle réponse : remplit les champs. Pour la même matière (mise à jour en arrière-plan, après un enregistrement),
  // les notes que l'enseignant est en train de modifier sont conservées.
  const cle = `${matiereId}:${annee}`;
  useLayoutEffect(() => {
    if (!donnees || donnees === recues.current.donnees) return;
    const avant = recues.current.cle === cle ? recues.current.donnees : null;
    const anciennes = new Map((avant?.etudiants || []).map((e) => [e.id_etudiant_parcours, e.note]));
    recues.current = { cle, donnees };
    setSaisies((actuelles) => Object.fromEntries(donnees.etudiants.map((e) => {
      const id = e.id_etudiant_parcours;
      const modifiee = avant && anciennes.has(id) && id in actuelles && lire(actuelles[id]) !== anciennes.get(id);
      return [id, modifiee ? actuelles[id] : e.note === null ? '' : String(e.note)];
    })));
  }, [donnees, cle]);

  const etudiants = useMemo(() => donnees?.etudiants || [], [donnees]);
  const verrouillee = Boolean(donnees?.verrouillee);
  const modifications = etudiants.filter((e) => {
    const valeur = lire(saisies[e.id_etudiant_parcours]);
    return Number.isNaN(valeur) || valeur !== e.note;
  });
  const invalides = etudiants.filter((e) => Number.isNaN(lire(saisies[e.id_etudiant_parcours])));

  // Chiffres de la saisie en cours, avant même l'enregistrement
  const valeurs = etudiants.map((e) => lire(saisies[e.id_etudiant_parcours])).filter((v) => v !== null && !Number.isNaN(v));
  const moyenne = valeurs.length ? valeurs.reduce((s, v) => s + v, 0) / valeurs.length : null;

  // Changer de matière ou d'année ferait perdre la saisie
  const changer = async (nouveaux) => {
    if (modifications.length > 0) {
      const ok = await confirm({
        title: 'Quitter sans enregistrer ?',
        message: `${modifications.length} note${modifications.length > 1 ? 's' : ''} modifiée${modifications.length > 1 ? 's' : ''} ne ${modifications.length > 1 ? 'sont' : 'est'} pas enregistrée${modifications.length > 1 ? 's' : ''}.`,
        confirmLabel: 'Quitter sans enregistrer',
        danger: true,
      });
      if (!ok) return;
    }
    setParams(nouveaux);
  };

  // Entrée : passe à l'étudiant suivant, pour saisir toute la liste au clavier
  const suivant = (e, index) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const prochain = etudiants[index + 1];
    if (prochain) champs.current[prochain.id_etudiant_parcours]?.focus();
  };

  const enregistrer = async (e) => {
    e.preventDefault();
    if (invalides.length > 0) {
      notify.error(`${invalides.length} note${invalides.length > 1 ? 's sont invalides' : ' est invalide'} : saisissez un nombre entre 0 et 20.`);
      return;
    }
    if (modifications.length === 0) return;

    setEnvoi(true);
    try {
      const res = await api.put(`/enseignant/matieres/${matiereId}/notes`, {
        annee,
        notes: modifications.map((m) => ({ id_etudiant_parcours: m.id_etudiant_parcours, note: lire(saisies[m.id_etudiant_parcours]) })),
      });
      notify.success(res.data.message);
      rechargerNotes();
      rechargerMatieres();
    } catch (err) {
      notify.error(errorMessage(err, "Les notes n'ont pas pu être enregistrées."));
      // Semestre publié entre-temps : la page repasse en lecture seule
      if (err.response?.status === 409) rechargerNotes();
    } finally {
      setEnvoi(false);
    }
  };

  const lectureSeule = verrouillee || envoi;

  // Import : les notes du fichier remplacent celles affichées, la saisie en cours serait perdue
  const ouvrirImport = async () => {
    if (modifications.length > 0) {
      const ok = await confirm({
        title: 'Importer sans enregistrer ?',
        message: `${modifications.length} note${modifications.length > 1 ? 's' : ''} modifiée${modifications.length > 1 ? 's' : ''} ne ${modifications.length > 1 ? 'sont' : 'est'} pas enregistrée${modifications.length > 1 ? 's' : ''}. Elles seront remplacées par celles du fichier.`,
        confirmLabel: 'Continuer',
        danger: true,
      });
      if (!ok) return;
    }
    setImportOuvert(true);
  };

  // Nom de fichier attendu pour la matière affichée (le serveur refuse toute matière qui n'est pas la sienne)
  const anneeLibelle = annees.find((a) => String(a.id) === String(annee))?.annee_aca;
  const nomAttendu = donnees
    ? `NOTES_${donnees.matiere.code || 'CODE'}_${donnees.matiere.niveau || 'L1'}_${donnees.matiere.code_semestre || 'S1'}_${anneeLibelle || '2025-2026'}.xlsx`
    : undefined;

  const apresImport = (reponse) => {
    // Fichier d'une autre de ses matières (ou d'une autre année) : on l'affiche
    if (String(reponse.matiere) !== String(matiereId) || String(reponse.annee) !== String(annee)) {
      setParams({ matiere: String(reponse.matiere), annee: String(reponse.annee) });
    } else {
      recues.current = { cle: null, donnees: null }; // les notes importées remplacent la saisie en cours
      rechargerNotes();
    }
    rechargerMatieres();
  };

  return (
    <div className="container-xxl flex-grow-1 container-p-y">
      <div className="gstf-page-header">
        <div>
          <h4 className="fw-bold mb-1">Saisie des notes</h4>
          {donnees && (
            <small className="text-muted">
              {donnees.matiere.niveau}{donnees.matiere.semestre ? ` · ${donnees.matiere.semestre}` : ''} · Coef. {donnees.matiere.coefficient}
            </small>
          )}
        </div>
        <div className="d-flex flex-wrap gap-2">
          {annees.length > 1 && (
            <select className="form-select w-auto" aria-label="Année académique" value={annee ?? ''}
              onChange={(e) => changer({ annee: e.target.value })}>
              {annees.map((a) => <option key={a.id} value={a.id}>{a.annee_aca}</option>)}
            </select>
          )}
          {matieres.length > 0 && (
            <select className="form-select w-auto" aria-label="Matière" value={matiereId}
              onChange={(e) => changer({ matiere: e.target.value, annee })}>
              {matieres.map((m) => <option key={m.id} value={m.id}>{m.matiere} ({m.niveau})</option>)}
            </select>
          )}
        </div>
      </div>

      {erreurMatieres || erreur ? (
        <div className="card">
          <div className="gstf-empty">
            <i className="bx bx-error-circle d-block"></i>
            <p className="mb-3">{erreurMatieres || erreur}</p>
            <button type="button" className="btn btn-sm btn-outline-primary"
              onClick={() => { rechargerMatieres(); rechargerNotes(); }}>Réessayer</button>
          </div>
        </div>
      ) : !chargement && matieres.length === 0 ? (
        <div className="card">
          <div className="gstf-empty">
            <i className="bx bx-book d-block"></i>
            Aucune matière ne vous est attribuée pour le moment.
          </div>
        </div>
      ) : !donnees ? (
        <>
          <StatsChargement libelle="Chargement des notes…" />
          <TableauCarteChargement colonnes={['Matricule', 'Étudiant', 'Note /20']} centrees={[2]} lignes={8} />
        </>
      ) : (
        <>
          {verrouillee && (
            <div className="alert alert-info d-flex align-items-start gap-2" role="note">
              <i className="bx bx-lock-alt mt-1"></i>
              <span>Ce semestre est publié : les étudiants voient ces notes et elles ne sont plus modifiables. Pour une correction, adressez-vous à l'administration.</span>
            </div>
          )}

          <div className="row">
            {[
              { libelle: 'Notes saisies', valeur: `${valeurs.length} / ${etudiants.length}`, icone: 'bx-spreadsheet' },
              { libelle: 'Moyenne de la classe', valeur: moyenne === null ? '—' : `${format(moyenne)} / 20`, icone: 'bx-medal' },
              { libelle: 'Plus basse · plus haute', valeur: valeurs.length ? `${format(Math.min(...valeurs))} · ${format(Math.max(...valeurs))}` : '—', icone: 'bx-bar-chart-alt-2' },
            ].map((c) => (
              <div className="col-sm-6 col-xl-4 mb-4" key={c.libelle}>
                <div className="card h-100">
                  <div className="card-body gstf-stat">
                    <div className="gstf-stat__icon" aria-hidden="true"><i className={`bx ${c.icone}`}></i></div>
                    <div>
                      <div className="gstf-stat__value">{c.valeur}</div>
                      <div className="gstf-stat__label">{c.libelle}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <form className="card" onSubmit={enregistrer}>
            <div className="card-header d-flex flex-wrap justify-content-between align-items-center gap-2">
              <h5 className="card-title gstf-section-title mb-0">{donnees.matiere.matiere}</h5>
              <div className="d-flex flex-wrap gap-2">
                {!verrouillee && (
                  <button type="button" className="btn btn-sm btn-outline-primary" onClick={ouvrirImport} disabled={envoi || etudiants.length === 0}
                    title="Importer les notes depuis un fichier Excel ou CSV">
                    <i className="bx bx-import me-1"></i>Importer
                  </button>
                )}
                {!verrouillee && (
                  <button type="submit" className="btn btn-sm btn-primary" disabled={envoi || modifications.length === 0}>
                    {envoi ? <span className="spinner-border spinner-border-sm me-1" /> : <i className="bx bx-save me-1"></i>}
                    Enregistrer{modifications.length > 0 ? ` (${modifications.length})` : ''}
                  </button>
                )}
              </div>
            </div>

            {etudiants.length === 0 ? (
              <div className="gstf-empty">
                <i className="bx bx-group d-block"></i>
                Aucun étudiant n'est inscrit à ce niveau pour cette année.
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead>
                    <tr>
                      <th scope="col">Matricule</th>
                      <th scope="col">Étudiant</th>
                      <th scope="col" className="text-center text-nowrap">Note /20</th>
                    </tr>
                  </thead>
                  <tbody>
                    {etudiants.map((e, index) => {
                      const id = e.id_etudiant_parcours;
                      const invalide = Number.isNaN(lire(saisies[id]));
                      return (
                        <tr key={id}>
                          <td className="text-nowrap">{e.matricule || <span className="text-muted">—</span>}</td>
                          <td className="fw-semibold">{e.nom_prenom}</td>
                          <td className="text-center">
                            <input
                              ref={(el) => { champs.current[id] = el; }}
                              type="text"
                              inputMode="decimal"
                              className={`form-control form-control-sm text-center d-inline-block ${invalide ? 'is-invalid' : ''}`}
                              style={{ width: '5.5rem' }}
                              value={saisies[id] ?? ''}
                              onChange={(ev) => setSaisies((avant) => ({ ...avant, [id]: ev.target.value }))}
                              onKeyDown={(ev) => suivant(ev, index)}
                              readOnly={lectureSeule}
                              autoComplete="off"
                              aria-label={`Note de ${e.nom_prenom}`}
                              aria-invalid={invalide}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </form>

          <ImportNotes
            ouvert={importOuvert}
            onClose={() => setImportOuvert(false)}
            url="/enseignant/notes/import"
            exemple={nomAttendu}
            consigne="Seules les matières qui vous sont attribuées peuvent être importées, tant que le semestre n'est pas publié."
            onImporte={apresImport}
          />

          {!verrouillee && etudiants.length > 0 && (
            <p className="small text-muted mt-3">
              <i className="bx bx-info-circle me-1"></i>
              La touche Entrée passe à l'étudiant suivant. Laissez vide pour effacer une note ; 0 est une note valide.
              Les étudiants ne voient les notes qu'après leur publication par l'administration.
            </p>
          )}
        </>
      )}
    </div>
  );
};

export default SaisieNotes;

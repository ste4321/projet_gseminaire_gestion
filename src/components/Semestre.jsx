import React, { useEffect, useMemo, useState } from 'react';
import { useSemestre } from '../contexts/SemestreContext';
import api, { errorMessage } from '../api/client';
import { useFeedback } from '../contexts/FeedbackContext';
import { ListeChargement, FenetreFormulaire, ActionsLigne, fenetre, pluriel } from './Referentiel';

// Semestres de l'année (Semestre 1 / S1…) : chaque matière appartient à un semestre, les notes se publient par semestre.
// Suppression refusée par le serveur dès qu'une matière y est rattachée.

const FORMULAIRE_VIDE = { semestre: '', code_semestre: '' };
// « Semestre 2 » → « S2 » (proposé tant que le code n'a pas été saisi à la main)
const codePropose = (nom) => {
  const m = /(\d+)\s*$/.exec(String(nom ?? '').trim());
  return m ? `S${m[1]}` : '';
};
const normaliser = (texte) => String(texte ?? '').trim().toLowerCase();

const Semestre = () => {
  const { notify, confirm } = useFeedback();
  const { semestres, loading, fetchSemestres } = useSemestre();
  const [form, setForm] = useState(FORMULAIRE_VIDE);
  const [codeManuel, setCodeManuel] = useState(false);
  const [enEdition, setEnEdition] = useState(null);
  const [enCours, setEnCours] = useState(false);

  // Relu à chaque ouverture de la page : la liste gardée en mémoire par l'espace admin peut dater (chiffres périmés)
  useEffect(() => {
    fetchSemestres();
  }, [fetchSemestres]);

  const tries = useMemo(() => [...semestres].sort((a, b) => a.id - b.id), [semestres]);

  // ---------- Formulaire ----------
  const nom = form.semestre.trim();
  const doublon = nom && tries.some((s) => normaliser(s.semestre) === normaliser(nom) && s.id !== enEdition?.id);
  const valide = nom.length > 0 && !doublon;

  const ouvrir = (semestre = null) => {
    setEnEdition(semestre);
    setForm(semestre ? { semestre: semestre.semestre ?? '', code_semestre: semestre.code_semestre ?? '' } : { semestre: `Semestre ${tries.length + 1}`, code_semestre: `S${tries.length + 1}` });
    setCodeManuel(Boolean(semestre));
    fenetre('semestreModal').show();
  };

  const changerNom = (valeur) => setForm((f) => ({ semestre: valeur, code_semestre: codeManuel ? f.code_semestre : codePropose(valeur) }));

  const enregistrer = async (e) => {
    e.preventDefault();
    if (!valide) return;
    setEnCours(true);
    const donnees = { semestre: nom, code_semestre: form.code_semestre.trim().toUpperCase() || null };
    try {
      if (enEdition) await api.put(`/semestres/${enEdition.id}`, donnees);
      else await api.post('/semestres', donnees);
      await fetchSemestres();
      fenetre('semestreModal').hide();
      notify.success(enEdition ? 'Semestre modifié.' : `${nom} ajouté.`);
    } catch (err) {
      notify.error(errorMessage(err, "Erreur lors de l'enregistrement."));
    } finally {
      setEnCours(false);
    }
  };

  const supprimer = async (semestre) => {
    const ok = await confirm({
      title: `Supprimer « ${semestre.semestre} » ?`,
      message: 'Il ne sera plus proposé pour les matières ni la publication des notes.',
      confirmLabel: 'Supprimer',
      danger: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/semestres/${semestre.id}`);
      await fetchSemestres();
      notify.success(`${semestre.semestre} supprimé.`);
    } catch (err) {
      notify.error(errorMessage(err, 'Erreur lors de la suppression.'));
    }
  };

  return (
    <div className="container-xxl flex-grow-1 container-p-y">
      <div className="gstf-page-header">
        <div>
          <h4 className="fw-bold mb-1">
            <span className="text-muted fw-light">Administration /</span> Semestres
          </h4>
          <small className="text-muted">Chaque matière appartient à un semestre ; les notes sont publiées semestre par semestre.</small>
        </div>
        <button className="btn btn-primary" onClick={() => ouvrir()} disabled={loading}>
          <i className="bx bx-plus me-1"></i>Nouveau semestre
        </button>
      </div>

      <div className="card">
        {loading ? (
          <ListeChargement lignes={2} />
        ) : tries.length === 0 ? (
          <div className="gstf-empty">
            <i className="bx bx-calendar-check d-block"></i>
            Aucun semestre n'est encore créé.
            <div className="mt-3">
              <button type="button" className="btn btn-sm btn-primary" onClick={() => ouvrir()}>Créer le premier semestre</button>
            </div>
          </div>
        ) : (
          <ul className="gstf-ref-liste">
            {tries.map((s) => {
              const matieres = s.matieres_count ?? 0;
              return (
                <li key={s.id} className="gstf-ref-ligne">
                  <span className="gstf-ref-pastille" aria-hidden="true">{s.code_semestre || '—'}</span>
                  <div className="flex-grow-1 min-w-0">
                    <div className="gstf-ref-titre">{s.semestre}</div>
                    <div className="gstf-ref-meta">
                      <span><i className="bx bx-book" aria-hidden="true"></i>{pluriel(matieres, 'matière')}</span>
                      {!s.code_semestre && <span>Sans code court</span>}
                    </div>
                  </div>
                  <ActionsLigne
                    nom={s.semestre}
                    onModifier={() => ouvrir(s)}
                    onSupprimer={() => supprimer(s)}
                    suppressionImpossible={matieres > 0 && `Impossible de supprimer : ${pluriel(matieres, 'matière')} y ${matieres > 1 ? 'sont rattachées' : 'est rattachée'}`}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <FenetreFormulaire
        id="semestreModal"
        titre={enEdition ? `Modifier « ${enEdition.semestre} »` : 'Nouveau semestre'}
        onSubmit={enregistrer}
        valide={valide}
        enCours={enCours}
        libelleValider={enEdition ? 'Enregistrer' : 'Ajouter'}
      >
        <div className="row g-3">
          <div className="col-8">
            <label className="gstf-ref-champ" htmlFor="semestre-nom">Nom</label>
            <input id="semestre-nom" type="text" className={`form-control ${doublon ? 'is-invalid' : ''}`} maxLength={100} required
              placeholder="ex. Semestre 1" value={form.semestre} onChange={(e) => changerNom(e.target.value)} />
            <div className="invalid-feedback">Ce semestre existe déjà.</div>
          </div>
          <div className="col-4">
            <label className="gstf-ref-champ" htmlFor="semestre-code">Code court</label>
            <input id="semestre-code" type="text" className="form-control" maxLength={20} placeholder="S1"
              value={form.code_semestre} onChange={(e) => { setCodeManuel(true); setForm((f) => ({ ...f, code_semestre: e.target.value.toUpperCase() })); }} />
          </div>
        </div>
        <div className="form-text mt-2">Le code court s'affiche dans les tableaux de notes et les bulletins.</div>
      </FenetreFormulaire>
    </div>
  );
};

export default Semestre;

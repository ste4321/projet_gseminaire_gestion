import React, { useEffect, useMemo, useState } from 'react';
import { useNiveau } from '../../contexts/NiveauContext';
import { useAnnee } from '../../contexts/AnneeContext';
import api, { errorMessage } from '../../api/client';
import { useFeedback } from '../../contexts/FeedbackContext';
import { trierNiveaux, libelleNiveau } from '../../utils/niveaux';
import { ListeChargement, FenetreFormulaire, ActionsLigne, fenetre, pluriel } from '../../components/Referentiel';

// Niveaux (classes) : L1, L2, L3… L'ordre sert au passage d'année des réinscriptions :
// le niveau suivant est le même cycle avec le numéro + 1 (L1 → L2) ; sans suivant, l'étudiant est diplômé.
// Suppression refusée par le serveur dès qu'une inscription ou une matière y est rattachée.

const FORMAT = /^([A-Z]+)\s*(\d+)$/;
const normaliserCode = (texte) => String(texte ?? '').toUpperCase().replace(/\s+/g, '');

// Même règle que le serveur (Niveau::suivant)
const codeSuivant = (code) => {
  const m = FORMAT.exec(normaliserCode(code));
  return m ? `${m[1]}${Number(m[2]) + 1}` : null;
};

const Niveau = () => {
  const { notify, confirm } = useFeedback();
  const { niveaux, loading, fetchNiveaux } = useNiveau();
  const { annees, fetchAnnees } = useAnnee();
  const [code, setCode] = useState('');
  const [enEdition, setEnEdition] = useState(null);
  const [enCours, setEnCours] = useState(false);

  // Relu à chaque ouverture de la page : la liste gardée en mémoire par l'espace admin peut dater (chiffres périmés)
  useEffect(() => {
    fetchNiveaux();
    fetchAnnees();
  }, [fetchNiveaux, fetchAnnees]);

  const tries = useMemo(() => trierNiveaux(niveaux), [niveaux]);
  const codes = useMemo(() => new Set(tries.map((n) => normaliserCode(n.niveau))), [tries]);
  const anneeCourante = annees.find((a) => a.courante)?.annee_aca;

  // Parcours par cycle : L1 → L2 → L3 → Diplôme
  const cycles = useMemo(() => {
    const parCycle = {};
    tries.forEach((n) => {
      const m = FORMAT.exec(normaliserCode(n.niveau));
      const cle = m ? m[1] : n.niveau;
      (parCycle[cle] ||= []).push(n.niveau);
    });
    return Object.values(parCycle);
  }, [tries]);

  // ---------- Formulaire ----------
  const saisi = normaliserCode(code);
  const doublon = saisi && codes.has(saisi) && normaliserCode(enEdition?.niveau) !== saisi;
  const valide = saisi.length > 0 && saisi.length <= 20 && !doublon;

  const ouvrir = (niveau = null) => {
    setEnEdition(niveau);
    setCode(niveau?.niveau ?? '');
    fenetre('niveauModal').show();
  };

  const enregistrer = async (e) => {
    e.preventDefault();
    if (!valide) return;
    setEnCours(true);
    try {
      if (enEdition) await api.put(`/niveaux/${enEdition.id}`, { niveau: saisi });
      else await api.post('/niveaux', { niveau: saisi });
      await fetchNiveaux();
      fenetre('niveauModal').hide();
      notify.success(enEdition ? `Niveau renommé en ${saisi}.` : `Niveau ${saisi} ajouté.`);
    } catch (err) {
      notify.error(errorMessage(err, "Erreur lors de l'enregistrement."));
    } finally {
      setEnCours(false);
    }
  };

  const supprimer = async (niveau) => {
    const ok = await confirm({
      title: `Supprimer le niveau ${niveau.niveau} ?`,
      message: 'Il ne sera plus proposé pour les inscriptions, les matières ni les annonces.',
      confirmLabel: 'Supprimer',
      danger: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/niveaux/${niveau.id}`);
      await fetchNiveaux();
      notify.success(`Niveau ${niveau.niveau} supprimé.`);
    } catch (err) {
      notify.error(errorMessage(err, 'Erreur lors de la suppression.'));
    }
  };

  const suivantDe = (niveau) => {
    const suivant = codeSuivant(niveau.niveau);
    return suivant && codes.has(suivant) ? suivant : null;
  };

  return (
    <div className="container-xxl flex-grow-1 container-p-y">
      <div className="gstf-page-header">
        <div>
          <h4 className="fw-bold mb-1">
            <span className="text-muted fw-light">Administration /</span> Niveaux
          </h4>
          <small className="text-muted">Les classes du séminaire. Leur ordre détermine le passage d'année lors des réinscriptions.</small>
        </div>
        <button className="btn btn-primary" onClick={() => ouvrir()} disabled={loading}>
          <i className="bx bx-plus me-1"></i>Nouveau niveau
        </button>
      </div>

      <div className="card">
        {!loading && cycles.length > 0 && (
          <div className="gstf-ref-info">
            <i className="bx bx-git-commit" aria-hidden="true"></i>
            <span>Parcours :</span>
            {cycles.map((cycle) => (
              <span key={cycle[0]} className="gstf-ref-chaine">
                {cycle.map((n) => (
                  <React.Fragment key={n}>
                    <span className="gstf-ref-chaine__etape">{n}</span>
                    <i className="bx bx-right-arrow-alt" aria-hidden="true"></i>
                  </React.Fragment>
                ))}
                <span className="gstf-ref-chaine__fin">diplôme</span>
              </span>
            ))}
          </div>
        )}

        {loading ? (
          <ListeChargement />
        ) : tries.length === 0 ? (
          <div className="gstf-empty">
            <i className="bx bx-layer d-block"></i>
            Aucun niveau n'est encore créé.
            <div className="mt-3">
              <button type="button" className="btn btn-sm btn-primary" onClick={() => ouvrir()}>Créer le premier niveau</button>
            </div>
          </div>
        ) : (
          <ul className="gstf-ref-liste">
            {tries.map((n) => {
              const suivant = suivantDe(n);
              const inscrits = n.inscrits_count ?? 0;
              const matieres = n.matieres_count ?? 0;
              const lie = inscrits > 0 || matieres > 0;
              return (
                <li key={n.id} className="gstf-ref-ligne">
                  <span className="gstf-ref-pastille" aria-hidden="true">{n.niveau}</span>
                  <div className="flex-grow-1 min-w-0">
                    <div className="gstf-ref-titre">{libelleNiveau(n.niveau)}</div>
                    <div className="gstf-ref-meta">
                      <span title={anneeCourante ? `Inscrits en ${anneeCourante}` : undefined}>
                        <i className="bx bx-group" aria-hidden="true"></i>
                        {pluriel(inscrits, 'inscrit')}{anneeCourante && ` en ${anneeCourante}`}
                      </span>
                      <span><i className="bx bx-book" aria-hidden="true"></i>{pluriel(matieres, 'matière')}</span>
                      <span>
                        <i className="bx bx-right-arrow-alt" aria-hidden="true"></i>
                        {suivant ? `Passage en ${suivant}` : 'Fin de cycle : diplôme'}
                      </span>
                    </div>
                  </div>
                  <ActionsLigne
                    nom={`le niveau ${n.niveau}`}
                    onModifier={() => ouvrir(n)}
                    onSupprimer={() => supprimer(n)}
                    suppressionImpossible={lie && `Impossible de supprimer : ${pluriel(inscrits, 'inscrit')} et ${pluriel(matieres, 'matière')} y sont rattachés`}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <FenetreFormulaire
        id="niveauModal"
        titre={enEdition ? `Modifier le niveau ${enEdition.niveau}` : 'Nouveau niveau'}
        onSubmit={enregistrer}
        valide={valide}
        enCours={enCours}
        libelleValider={enEdition ? 'Enregistrer' : 'Ajouter'}
      >
        <label className="gstf-ref-champ" htmlFor="niveau-code">Code du niveau</label>
        <input id="niveau-code" type="text" className={`form-control ${doublon ? 'is-invalid' : ''}`} maxLength={20} required
          placeholder="ex. L1, M2" autoComplete="off"
          value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
        <div className="invalid-feedback">Ce niveau existe déjà.</div>
        <div className="form-text">Lettre du cycle puis numéro : L pour Licence, M pour Master, D pour Doctorat.</div>

        {saisi && !doublon && (
          <div className="gstf-ref-apercu">
            <strong>{saisi}</strong> — {libelleNiveau(saisi)}
            <div className="text-muted small mt-1">
              {FORMAT.test(saisi)
                ? (codes.has(codeSuivant(saisi)) ? `Les étudiants passeront ensuite en ${codeSuivant(saisi)}.` : `Fin de cycle tant que ${codeSuivant(saisi)} n'existe pas : les étudiants seront diplômés.`)
                : 'Format non reconnu : aucun passage automatique vers un niveau suivant.'}
            </div>
          </div>
        )}
        {enEdition && (enEdition.inscrits_count > 0 || enEdition.matieres_count > 0) && (
          <div className="form-text mt-2">Les inscriptions et matières rattachées suivent le nouveau nom.</div>
        )}
      </FenetreFormulaire>
    </div>
  );
};

export default Niveau;

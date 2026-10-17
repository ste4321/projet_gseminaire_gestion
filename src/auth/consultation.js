// « Ouvrir l'espace de… » : l'administration voit l'espace d'un étudiant ou d'un enseignant
// exactement comme lui, en lecture seule (le serveur refuse toute modification), pendant 1 h au maximum.
import api, { errorMessage } from '../api/client';
import { HOME_BY_ROLE, demarrerConsultation, getConsultation, terminerConsultation } from './session';

const LIBELLES = { etudiant: 'étudiant', prof: 'enseignant' };

/**
 * @param {object} p
 * @param {number|null} p.userId  identifiant du compte de connexion (id_user_cession)
 * @param {string} p.nom          nom affiché dans la confirmation
 * @param {'etudiant'|'prof'} p.role
 */
export const ouvrirEspace = async ({ userId, nom, role, confirm, notify }) => {
  if (!userId) {
    notify.warning(`${nom} n'a pas encore de compte de connexion.`);
    return;
  }
  const ok = await confirm({
    title: `Ouvrir l'espace de ${nom} ?`,
    message: `Vous verrez son espace ${LIBELLES[role] || ''} exactement comme lui, en lecture seule, pendant 1 heure au maximum.\n`
      + 'Aucune modification ne sera possible. Cette consultation est enregistrée.',
    confirmLabel: 'Ouvrir son espace',
  });
  if (!ok) return;

  try {
    const res = await api.post(`/consultation/${userId}`);
    demarrerConsultation(res.data, `${window.location.pathname}${window.location.search}`);
    // Rechargement complet : aucune donnée de l'espace admin ne reste en mémoire
    window.location.assign(HOME_BY_ROLE[res.data.user.role]);
  } catch (err) {
    notify.error(errorMessage(err, "Impossible d'ouvrir cet espace."));
  }
};

/** Ferme la consultation (jeton supprimé côté serveur) et revient à l'espace admin */
export const quitterConsultation = async () => {
  try {
    await api.post('/consultation/fin', null, { sansRedirection: true });
  } catch (e) {
    // Jeton déjà expiré : la session admin est restaurée quand même
  }
  const retour = terminerConsultation();
  window.location.assign(retour || '/');
};

export { getConsultation };

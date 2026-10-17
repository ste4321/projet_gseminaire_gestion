// Actions sensibles (publier les notes, publier une actualité) : le serveur émet un code
// que l'administrateur doit recopier. Le serveur refuse la publication sans ce code.
import api from '../api/client';

/**
 * Demande un code au serveur puis l'affiche dans la boîte de confirmation.
 * @returns {Promise<string|null>} le code à envoyer avec la publication, ou null si l'utilisateur annule
 */
export const confirmerAvecCode = async (confirm, action, options) => {
  const res = await api.post('/confirmations', { action });
  const ok = await confirm({ ...options, code: res.data.code });
  return ok ? res.data.code : null;
};

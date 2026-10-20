// Ordre d'affichage commun à tous les tableaux : les derniers ajoutés en premier.
// Date de création si elle est connue, sinon identifiant (attribué dans l'ordre d'ajout).
// Ne modifie pas la liste reçue (souvent l'état d'un contexte partagé).
export const plusRecentsDabord = (liste = []) =>
  [...liste].sort((a, b) => {
    const ecart = new Date(b.created_at || 0) - new Date(a.created_at || 0);
    return ecart || (b.id ?? 0) - (a.id ?? 0);
  });

import { useCallback, useMemo } from 'react';
import { creerRessource } from '../api/ressource';

const { Provider, useRessource } = creerRessource({ url: '/emplois', nom: "l'emploi du temps" });

export const EmploiProvider = Provider;

// Chargé à la première utilisation, puis gardé en mémoire (voir api/ressource.js).
// Une seule liste côté serveur, présentée par semestre.
export const useEmploi = () => {
  const { data, setData, loading, erreur, recharger } = useRessource();

  // Number() : un élément tout juste créé revient avec le semestre envoyé par le formulaire (« 1 »)
  const emploiSemestre1 = useMemo(() => data.filter((e) => Number(e.semestre) === 1), [data]);
  const emploiSemestre2 = useMemo(() => data.filter((e) => Number(e.semestre) === 2), [data]);

  // Remplace les images d'un semestre (valeur ou fonction, comme un setState) sans toucher à l'autre
  const majSemestre = useCallback(
    (semestre, maj) =>
      setData((tout) => {
        const avant = tout.filter((e) => Number(e.semestre) === semestre);
        const apres = typeof maj === 'function' ? maj(avant) : maj;
        return [...tout.filter((e) => Number(e.semestre) !== semestre), ...apres.map((e) => ({ ...e, semestre }))];
      }),
    [setData]
  );
  const setEmploiSemestre1 = useCallback((maj) => majSemestre(1, maj), [majSemestre]);
  const setEmploiSemestre2 = useCallback((maj) => majSemestre(2, maj), [majSemestre]);

  return { emploiSemestre1, emploiSemestre2, setEmploiSemestre1, setEmploiSemestre2, loading, erreur, fetchEmplois: recharger };
};

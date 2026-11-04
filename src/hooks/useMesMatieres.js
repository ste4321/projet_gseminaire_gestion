import { useCallback, useEffect, useState } from 'react';
import api, { errorMessage, estAnnulee } from '../api/client';

// Matières attribuées à l'enseignant connecté pour une année, avec l'avancement des notes et des leçons.
// Sans année demandée, le serveur choisit l'année en cours (renvoyée dans `annee`).
const useMesMatieres = (anneeDemandee) => {
  const [data, setData] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const controle = new AbortController(); // changement d'année rapide : seule la dernière réponse compte
    setErreur(null);
    api
      .get('/enseignant/matieres', { params: { annee: anneeDemandee || undefined }, signal: controle.signal })
      .then((res) => setData(res.data))
      .catch((err) => {
        if (!estAnnulee(err)) setErreur(errorMessage(err, 'Impossible de charger vos matières.'));
      });
    return () => controle.abort();
  }, [anneeDemandee, version]);

  const recharger = useCallback(() => setVersion((v) => v + 1), []);

  return {
    annees: data?.annees || [],
    annee: data?.annee ?? null,
    matieres: data?.matieres || [],
    chargement: !data && !erreur,
    erreur,
    recharger,
  };
};

export default useMesMatieres;

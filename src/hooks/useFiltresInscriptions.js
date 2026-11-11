import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAnnee } from '../contexts/AnneeContext';
import { useNiveau } from '../contexts/NiveauContext';
import { trierNiveaux } from '../utils/niveaux';
import useParcoursPagines, { prechargerParcours } from './useParcoursPagines';

// Listes d'inscriptions filtrées par année, niveau et recherche (pages Étudiants et Notes).
//
// - Filtres gardés dans l'adresse (?annee=2&niveau=L2&page=3&q=jean) : au retour sur la page
//   (après une fiche, une autre page, un rafraîchissement…), on retrouve la même liste au même endroit.
// - Pagination et recherche faites par le serveur (useParcoursPagines).
// - Anticipation : une fois la page affichée, la page suivante et les autres niveaux sont préparés
//   en arrière-plan ; « Suivant » et le changement d'onglet L1 / L2 / L3 s'affichent sans attente.
const useFiltresInscriptions = ({ parPage = 10 } = {}) => {
  const { annees: anneesListe, loading: loadingAnnees } = useAnnee();
  const { niveaux, loading: loadingNiveaux } = useNiveau();
  const [params, setParams] = useSearchParams();

  const majFiltres = (valeurs) =>
    setParams((avant) => {
      const p = new URLSearchParams(avant);
      Object.entries(valeurs).forEach(([cle, valeur]) => {
        const vide = valeur === '' || valeur === null || valeur === undefined || (cle === 'page' && valeur === 1);
        if (vide) p.delete(cle);
        else p.set(cle, String(valeur));
      });
      return p;
    }, { replace: true });

  // Année affichée par défaut : la plus récente
  const annees = useMemo(() => [...anneesListe].sort((a, b) => b.id - a.id), [anneesListe]);
  const selectedAnnee = params.get('annee') || (annees.length > 0 ? String(annees[0].id) : '');
  const anneeAffichee = annees.find((a) => String(a.id) === selectedAnnee);

  // Niveaux de la base, dans l'ordre (L1, L2, L3, M1…) ; si le niveau demandé n'existe pas, le premier est affiché
  const niveauxTries = useMemo(() => trierNiveaux(niveaux), [niveaux]);
  const niveauDemande = params.get('niveau') || 'L1';
  const niveau = niveauxTries.length === 0 || niveauxTries.some((n) => n.niveau === niveauDemande)
    ? niveauDemande
    : niveauxTries[0].niveau;

  const currentPage = Math.max(0, (parseInt(params.get('page'), 10) || 1) - 1);
  const setCurrentPage = (page) => majFiltres({ page: page + 1 });

  // Saisie immédiate dans le champ ; l'adresse et la requête suivent (requête différée de 300 ms)
  const [searchTerm, setSearchTerm] = useState(() => params.get('q') || '');

  const liste = useParcoursPagines({ annee: selectedAnnee, niveau, recherche: searchTerm, page: currentPage, parPage });
  const { pages: totalPages, attente, erreur } = liste;

  // Page devenue vide (suppression du dernier étudiant de la page) : retour à la dernière page existante
  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages - 1) setCurrentPage(totalPages - 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalPages, currentPage]);

  useEffect(() => {
    if (attente || erreur || !selectedAnnee) return undefined;
    const t = setTimeout(() => {
      const base = { annee: selectedAnnee, parPage };
      if (currentPage + 1 < totalPages) {
        prechargerParcours({ ...base, niveau, recherche: searchTerm, page: currentPage + 1 });
      }
      if (!searchTerm.trim()) {
        niveauxTries
          .filter((n) => n.niveau !== niveau)
          .forEach((n) => prechargerParcours({ ...base, niveau: n.niveau, page: 0 }));
      }
    }, 400);
    return () => clearTimeout(t);
  }, [attente, erreur, selectedAnnee, niveau, searchTerm, currentPage, totalPages, niveauxTries, parPage]);

  return {
    ...liste,
    annees,
    anneesListe,
    loadingAnnees,
    niveaux,
    niveauxTries,
    loadingNiveaux,
    selectedAnnee,
    anneeAffichee,
    niveau,
    searchTerm,
    currentPage,
    setCurrentPage,
    // premier chargement : rien à montrer encore (squelettes)
    chargement: liste.premierChargement && !erreur && (loadingAnnees || anneesListe.length > 0),
    handleSearchChange: (value) => {
      setSearchTerm(value);
      majFiltres({ q: value.trim(), page: 1 });
    },
    handleNiveauChange: (n) => majFiltres({ niveau: n === 'L1' ? '' : n, page: 1 }),
    handleAnneeChange: (a) =>
      majFiltres({ annee: annees.length > 0 && a === String(annees[0].id) ? '' : a, page: 1 }),
  };
};

export default useFiltresInscriptions;

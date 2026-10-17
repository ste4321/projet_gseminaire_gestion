import * as XLSX from 'xlsx';

/**
 * Génère et télécharge un fichier Excel des identifiants provisoires créés lors d'un import.
 * Le fichier n'existe que sur l'ordinateur de l'admin : le serveur ne garde aucun mot de passe en clair.
 */
export const telechargerIdentifiants = (comptes, nomFichier) => {
  const lignes = comptes.map((c) => ({
    Matricule: c.matricule,
    'Nom et prénom': c.nom_prenom,
    Identifiant: c.email,
    'Mot de passe provisoire': c.mot_de_passe,
  }));

  const feuille = XLSX.utils.json_to_sheet(lignes);
  feuille['!cols'] = [{ wch: 14 }, { wch: 32 }, { wch: 36 }, { wch: 24 }];

  const classeur = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(classeur, feuille, 'Identifiants');
  XLSX.writeFile(classeur, nomFichier);
};

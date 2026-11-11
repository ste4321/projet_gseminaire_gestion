// La bibliothèque Excel est volumineuse : elle n'est téléchargée que lorsqu'un import commence
// (prechargerExcel), pas à l'ouverture de l'application.
let excel = null;
export const prechargerExcel = () => {
  excel = excel || import('xlsx').catch((e) => {
    excel = null;
    throw e;
  });
  return excel;
};

const COLONNES = ['Matricule', 'Nom et prénom', 'Identifiant', 'Mot de passe provisoire'];

// Secours sans bibliothèque (réseau coupé au mauvais moment) : ces mots de passe ne peuvent pas
// être régénérés, le fichier doit donc être produit quoi qu'il arrive. CSV lisible par Excel (BOM + « ; »).
const telechargerCsv = (lignes, nomFichier) => {
  const cellule = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const contenu = [COLONNES, ...lignes.map((l) => COLONNES.map((c) => l[c]))]
    .map((ligne) => ligne.map(cellule).join(';'))
    .join('\r\n');
  const url = URL.createObjectURL(new Blob(['﻿', contenu], { type: 'text/csv;charset=utf-8' }));
  const lien = document.createElement('a');
  lien.href = url;
  lien.download = nomFichier.replace(/\.xlsx$/i, '.csv');
  document.body.appendChild(lien);
  lien.click();
  lien.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

/**
 * Génère et télécharge un fichier Excel des identifiants provisoires créés lors d'un import.
 * Le fichier n'existe que sur l'ordinateur de l'admin : le serveur ne garde aucun mot de passe en clair.
 */
export const telechargerIdentifiants = async (comptes, nomFichier) => {
  const lignes = comptes.map((c) => ({
    Matricule: c.matricule,
    'Nom et prénom': c.nom_prenom,
    Identifiant: c.email,
    'Mot de passe provisoire': c.mot_de_passe,
  }));

  let XLSX;
  try {
    XLSX = await prechargerExcel();
  } catch {
    telechargerCsv(lignes, nomFichier);
    return;
  }

  const feuille = XLSX.utils.json_to_sheet(lignes);
  feuille['!cols'] = [{ wch: 14 }, { wch: 32 }, { wch: 36 }, { wch: 24 }];

  const classeur = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(classeur, feuille, 'Identifiants');
  XLSX.writeFile(classeur, nomFichier);
};

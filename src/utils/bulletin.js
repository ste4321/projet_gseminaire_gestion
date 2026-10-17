// Bulletin de notes (PDF), généré à partir du relevé calculé par le serveur :
// GET /api/etudiant/releve (étudiant) ou GET /api/notes/releve/{parcours} (administration).
// Utilisé par l'espace étudiant et par la page Notes de l'administration : un seul format, un seul calcul.
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const BORDEAUX = [140, 47, 57];
const OR = [201, 162, 39];

const note = (valeur) => (valeur === null || valeur === undefined ? '—' : Number(valeur).toFixed(2));

const chargerImage = (src) =>
  new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null); // le bulletin reste généré sans logo
    img.src = src;
  });

export const nomFichierBulletin = (releve) => {
  const nom = (releve.etudiant?.nom_prenom || 'etudiant').replace(/[^\w\sÀ-ÿ-]/g, '').replace(/\s+/g, '_');
  return `Bulletin_${releve.annee || ''}_${releve.niveau || ''}_${nom}.pdf`;
};

export const telechargerBulletin = async (releve) => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const largeur = doc.internal.pageSize.getWidth();
  const marge = 14;
  let y = 14;

  // ─── En-tête du séminaire ────────────────────────────────
  const logo = await chargerImage('/images/logo-GS.jpg');
  if (logo) doc.addImage(logo, 'JPEG', marge, y - 2, 24, 24);

  doc.setTextColor(...BORDEAUX);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('GRAND SÉMINAIRE DE THÉOLOGIE FALIARIVO', largeur / 2 + 8, y + 3, { align: 'center' });
  doc.setTextColor(60, 60, 60);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text("Sainte Thérèse de l'Enfant Jésus", largeur / 2 + 8, y + 9, { align: 'center' });
  doc.setFontSize(8.5);
  doc.text('BP-6047 Ambanidia - 101 Antananarivo - Madagascar', largeur / 2 + 8, y + 14, { align: 'center' });
  doc.text('seminairetheo@yahoo.fr  |  +261 38 21 220 21', largeur / 2 + 8, y + 18.5, { align: 'center' });

  y += 28;
  doc.setDrawColor(...OR);
  doc.setLineWidth(0.8);
  doc.line(marge, y, largeur - marge, y);

  // ─── Titre et identité de l'étudiant ─────────────────────
  y += 10;
  doc.setTextColor(...BORDEAUX);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('RELEVÉ DE NOTES', largeur / 2, y, { align: 'center' });
  doc.setTextColor(60, 60, 60);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Année académique ${releve.annee || '—'}`, largeur / 2, y + 6, { align: 'center' });

  y += 14;
  autoTable(doc, {
    startY: y,
    theme: 'plain',
    margin: { left: marge, right: marge },
    styles: { fontSize: 10, cellPadding: 1.2 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 32 }, 2: { fontStyle: 'bold', cellWidth: 28 } },
    body: [
      ['Nom et prénom', releve.etudiant?.nom_prenom || '—', 'Matricule', releve.etudiant?.matricule || '—'],
      ['Niveau', releve.niveau || '—', 'Diocèse', releve.etudiant?.diocese || '—'],
    ],
  });
  y = doc.lastAutoTable.finalY + 6;

  // ─── Notes par semestre ──────────────────────────────────
  (releve.semestres || []).forEach((semestre) => {
    autoTable(doc, {
      startY: y,
      margin: { left: marge, right: marge },
      head: [[{ content: semestre.semestre, colSpan: 4 }], ['Matière', 'Coef.', 'Note /20', 'Points']],
      body: semestre.matieres.map((m) => [
        m.matiere,
        String(m.coefficient),
        note(m.note),
        m.note === null ? '—' : (m.note * m.coefficient).toFixed(2),
      ]),
      foot: [[
        'Moyenne du semestre',
        String(semestre.coefficients || '—'),
        note(semestre.moyenne),
        semestre.points ? Number(semestre.points).toFixed(2) : '—',
      ]],
      theme: 'grid',
      styles: { fontSize: 9.5, cellPadding: 2, lineColor: [220, 214, 205] },
      headStyles: { fillColor: BORDEAUX, textColor: 255, fontStyle: 'bold' },
      footStyles: { fillColor: [248, 241, 220], textColor: [60, 40, 10], fontStyle: 'bold' },
      columnStyles: {
        1: { halign: 'center', cellWidth: 18 },
        2: { halign: 'center', cellWidth: 24 },
        3: { halign: 'center', cellWidth: 22 },
      },
      didParseCell: (data) => {
        // Note inférieure à 10 en rouge
        if (data.section === 'body' && data.column.index === 2) {
          const valeur = semestre.matieres[data.row.index]?.note;
          if (valeur !== null && valeur < 10) data.cell.styles.textColor = [192, 57, 43];
        }
      },
    });
    y = doc.lastAutoTable.finalY + 6;
  });

  // ─── Résultat général ────────────────────────────────────
  const general = releve.general || {};
  if (y > 250) {
    doc.addPage();
    y = 20;
  }
  doc.setFillColor(...BORDEAUX);
  doc.roundedRect(marge, y, largeur - marge * 2, 14, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('MOYENNE GÉNÉRALE', marge + 5, y + 9);
  doc.text(general.moyenne === null || general.moyenne === undefined ? '—' : `${note(general.moyenne)} / 20`, largeur - marge - 5, y + 9, { align: 'right' });

  y += 20;
  doc.setTextColor(90, 90, 90);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(
    `Notes saisies : ${general.notes_saisies ?? 0} sur ${general.matieres_total ?? 0} matière(s). ` +
      'Moyenne pondérée par les coefficients des matières notées.',
    marge,
    y
  );

  // ─── Date et signature ───────────────────────────────────
  y += 14;
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(10);
  doc.text(`Faliarivo, le ${new Date().toLocaleDateString('fr-FR')}`, marge, y);
  doc.text('Le Préfet des études', largeur - marge - 45, y);
  doc.setDrawColor(150, 150, 150);
  doc.setLineWidth(0.3);
  doc.line(largeur - marge - 50, y + 18, largeur - marge, y + 18);

  doc.save(nomFichierBulletin(releve));
};

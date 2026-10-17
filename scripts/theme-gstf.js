// Applique la palette GSTF au thème Sneat (public/assets/vendor/css).
// Le thème code ses couleurs en dur : ce script remplace le violet d'origine.
// Relançable sans risque : node scripts/theme-gstf.js
//   Pour changer de couleur : modifier PALETTE puis relancer (en partant des valeurs actuelles).
const fs = require('fs');
const path = require('path');

const PALETTE = [
  // [origine Sneat, GSTF]
  ['#696cff', '#8c2f39'],               // primaire : bordeaux carmélite
  ['#5f61e6', '#77262f'],               // primaire survol / actif
  ['#e7e7ff', '#f4e4e6'],               // fond des badges « label-primary »
  ['%23696cff', '%238c2f39'],           // primaire dans les SVG intégrés (décors de la page de connexion)
  [/105,\s?108,\s?255/g, '140, 47, 57'], // primaire en RGB (ombres, transparences)
];

const dir = path.join(__dirname, '..', 'public', 'assets', 'vendor', 'css');
for (const file of ['core.css', 'theme-default.css', 'pages/page-auth.css']) {
  const fullPath = path.join(dir, file);
  let css = fs.readFileSync(fullPath, 'utf8');
  let total = 0;
  for (const [from, to] of PALETTE) {
    const regex = from instanceof RegExp ? from : new RegExp(from, 'gi');
    css = css.replace(regex, () => { total++; return to; });
  }
  fs.writeFileSync(fullPath, css);
  console.log(`${file} : ${total} couleur(s) remplacée(s)`);
}

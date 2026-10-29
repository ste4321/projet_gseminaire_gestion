// Calendrier académique du site vitrine : mise en forme des dates, identique au site
// (projet_gseminaire_frontend, FloatingCalendar), pour que l'aperçu corresponde à ce que voient les visiteurs.
// Dates au format AAAA-MM-JJ ; liaison « du » (période) ou « et » (deux jours).

export const SEMESTRES = [
  { numero: 1, titre: 'Premier semestre' },
  { numero: 2, titre: 'Deuxième semestre' },
];

const fmt = (iso, options) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('fr-FR', { timeZone: 'UTC', ...options });
const majuscule = (texte) => texte.charAt(0).toUpperCase() + texte.slice(1);

/** « Lundi 3 novembre », « Du 22 janvier au 4 février », « Vendredi 6 et samedi 7 février » */
export const dateEvenement = ({ date_debut: debut, date_fin: fin, liaison }) => {
  if (!debut) return '';
  if (!fin) return majuscule(fmt(debut, { weekday: 'long', day: 'numeric', month: 'long' }));
  const memeMois = debut.slice(0, 7) === fin.slice(0, 7);
  if (liaison === 'et') {
    const premier = fmt(debut, memeMois ? { weekday: 'long', day: 'numeric' } : { weekday: 'long', day: 'numeric', month: 'long' });
    return majuscule(`${premier} et ${fmt(fin, { weekday: 'long', day: 'numeric', month: 'long' })}`);
  }
  const premier = fmt(debut, memeMois ? { day: 'numeric' } : { day: 'numeric', month: 'long' });
  return `Du ${premier} au ${fmt(fin, { day: 'numeric', month: 'long' })}`;
};

/** « Du 25 septembre 2025 au 7 février 2026 » ; bornes manquantes : déduites des événements, comme sur le site */
export const periodeSemestre = (calendrier, numero) => {
  const evenements = calendrier.evenements.filter((e) => e.semestre === numero);
  const debut = calendrier[`s${numero}_debut`] || evenements.map((e) => e.date_debut).sort()[0];
  const fin = calendrier[`s${numero}_fin`] || evenements.map((e) => e.date_fin || e.date_debut).sort().pop();
  if (!debut || !fin) return null;
  const complet = { day: 'numeric', month: 'long', year: 'numeric' };
  return { texte: `Du ${fmt(debut, complet)} au ${fmt(fin, complet)}`, deduite: !calendrier[`s${numero}_debut`] || !calendrier[`s${numero}_fin`] };
};

/** Calendrier affiché sur le site : le plus récent des publiés (même règle que le serveur) */
export const calendrierAffiche = (calendriers) =>
  calendriers.filter((c) => c.publie).sort((a, b) => b.annee.localeCompare(a.annee))[0] || null;

/** « 2026-2027 » → « 2027-2028 » */
export const anneeSuivante = (annee) => {
  const debut = Number(String(annee || '').slice(0, 4));
  return debut ? `${debut + 1}-${debut + 2}` : '';
};

export const aujourdhui = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/**
 * Situation d'une année par rapport à aujourd'hui (AAAA-MM-JJ), pour le sélecteur d'années :
 * { temps: 'en-cours' | 'a-venir' | 'terminee' | 'vide', progression (0 à 1, en cours), prochain (événement) }
 * Période de l'année : des bornes des semestres et des événements, la plus large.
 */
export const situationAnnee = (calendrier, jour) => {
  const debuts = [calendrier.s1_debut, calendrier.s2_debut, ...calendrier.evenements.map((e) => e.date_debut)].filter(Boolean).sort();
  const fins = [calendrier.s1_fin, calendrier.s2_fin, ...calendrier.evenements.map((e) => e.date_fin || e.date_debut)].filter(Boolean).sort();
  if (!debuts.length) return { temps: 'vide', progression: 0, prochain: null };
  const debut = debuts[0];
  const fin = fins[fins.length - 1];
  const prochain = calendrier.evenements.find((e) => (e.date_fin || e.date_debut) >= jour) || null;
  if (jour < debut) return { temps: 'a-venir', progression: 0, prochain };
  if (jour > fin) return { temps: 'terminee', progression: 1, prochain: null };
  const t = (iso) => new Date(`${iso}T00:00:00Z`).getTime();
  return { temps: 'en-cours', progression: Math.min(1, (t(jour) - t(debut)) / Math.max(1, t(fin) - t(debut))), prochain };
};

/** « 1 nov. » */
export const dateCourte = (iso) => fmt(iso, { day: 'numeric', month: 'short' });

/** Jour suivant : « 2026-02-06 » → « 2026-02-07 » (second jour d'un événement « Deux jours ») */
export const lendemain = (iso) => {
  if (!iso) return '';
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
};

/** « samedi 7 février 2026 » */
export const dateLongue = (iso) => (iso ? fmt(iso, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '');

const JOUR_MS = 24 * 60 * 60 * 1000;
const enJours = (iso) => Math.round(new Date(`${iso}T00:00:00Z`).getTime() / JOUR_MS);

/** Nombre de jours de b à a (a − b) */
export const ecartJours = (a, b) => enJours(a) - enJours(b);

/** Durée d'un événement en jours (1 pour un seul jour) */
export const dureeJours = (ev) => (ev.date_fin ? ecartJours(ev.date_fin, ev.date_debut) + 1 : 1);

/** « aujourd'hui », « demain », « dans 12 jours », « dans 3 mois » */
export const dans = (iso, jour) => {
  const n = ecartJours(iso, jour);
  if (n <= 0) return "aujourd'hui";
  if (n === 1) return 'demain';
  if (n < 45) return `dans ${n} jours`;
  return `dans ${Math.round(n / 30)} mois`;
};

/** Pastille de date : { jour: '26', mois: 'oct.' } */
export const pastille = (iso) => ({ jour: fmt(iso, { day: 'numeric' }), mois: fmt(iso, { month: 'short' }) });

/** « Octobre 2025 » (séparateurs de la liste) */
export const moisAnnee = (iso) => majuscule(fmt(iso, { month: 'long', year: 'numeric' }));

/** Événement hors des dates saisies de son semestre (les bornes déduites ne comptent pas) */
export const horsSemestre = (calendrier, ev) => {
  const debut = calendrier[`s${ev.semestre}_debut`];
  const fin = calendrier[`s${ev.semestre}_fin`];
  return Boolean((debut && ev.date_debut < debut) || (fin && (ev.date_fin || ev.date_debut) > fin));
};

export const normaliser = (texte) => String(texte ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

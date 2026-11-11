import { useEffect } from "react";

// Charge des scripts classiques (non modules).
// Ils sont tous ajoutés d'un coup : le navigateur les télécharge en parallèle,
// et `async = false` garantit qu'ils s'exécutent quand même dans l'ordre de la liste
// (jQuery d'abord, puis ses plugins, puis main.js).
const useScripts = (scripts) => {
  useEffect(() => {
    scripts.forEach((src) => {
      if (document.querySelector(`script[src="${src}"]`)) return;
      const script = document.createElement("script");
      script.src = src;
      script.async = false;
      document.body.appendChild(script);
    });
  }, [scripts]);
};
export default useScripts;

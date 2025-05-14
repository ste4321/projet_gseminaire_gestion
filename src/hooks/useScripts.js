import { useEffect } from "react";

const useScripts = (scripts) => {
  useEffect(() => {
    const loadScript = (src) => {
      return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) {
          resolve();
          return;
        }

        const script = document.createElement("script");
        script.src = src;
        script.async = false; // ← Désactive l'async par défaut
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script); // ← Utilisez head plutôt que body
      });
    };

    // Charge les scripts dans l'ordre
    scripts.reduce((promise, src) => 
      promise.then(() => loadScript(src)), 
      Promise.resolve()
    );
  }, [scripts]);
};
export default useScripts;

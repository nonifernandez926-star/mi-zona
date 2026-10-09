import { useEffect, useRef } from "react";

// Botón "atrás" de Android (y gesto de volver) para las pantallas y ventanas que se abren POR ENCIMA del inicio.
// Sin esto, tocar "atrás" dentro de la app la cierra del todo (se ve como un error y Google Play lo penaliza en las reseñas).
//
// Uso: useAtrasDeCapas([[abierta1, cerrar1], [abierta2, cerrar2], ...])  — de la capa de más abajo a la de más arriba.
// Al abrirse una capa se agrega una entrada al historial; "atrás" cierra la capa de más arriba en vez de salir de la app.
// Si la capa se cierra con su propio botón (✕, "Volver"), la entrada del historial se retira sola.
export function useAtrasDeCapas(capas) {
  const capasRef = useRef(capas);
  capasRef.current = capas;
  const estado = useRef({ empujadas: 0, ignorarPop: false });
  const abiertas = capas.reduce((n, c) => n + (c[0] ? 1 : 0), 0);

  useEffect(() => {
    const alVolver = () => {
      const e = estado.current;
      if (e.ignorarPop) { e.ignorarPop = false; return; } // lo provocamos nosotros al retirar entradas
      if (e.empujadas <= 0) return; // nada abierto: "atrás" se comporta como siempre (salir de la app)
      e.empujadas -= 1;
      const arriba = [...capasRef.current].reverse().find((c) => c[0]);
      if (arriba) arriba[1]();
    };
    window.addEventListener("popstate", alVolver);
    return () => window.removeEventListener("popstate", alVolver);
  }, []);

  useEffect(() => {
    const e = estado.current;
    if (abiertas > e.empujadas) {
      for (let i = e.empujadas; i < abiertas; i += 1) window.history.pushState({ zonaCapa: i + 1 }, "");
      e.empujadas = abiertas;
    } else if (abiertas < e.empujadas) {
      const sobran = e.empujadas - abiertas;
      e.empujadas = abiertas;
      e.ignorarPop = true;
      window.history.go(-sobran);
    }
  }, [abiertas]);
}

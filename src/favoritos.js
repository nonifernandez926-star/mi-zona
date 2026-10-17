import { useEffect, useState } from "react";

// Favoritos de fichas de oficios y alquileres (Fase 6). Se guardan en este dispositivo, igual que los de negocios.
// Cada uno guarda cuándo se guardó, para poder ordenar y filtrar por fecha. Que una ficha siga o no visible lo decide el servidor
// (pausada, vencida u oculta no aparece en Favoritos y vuelve sola si se reactiva).
const CLAVE = "miZonaFavoritosFichas";
const CLAVE_FECHAS_NEGOCIOS = "miZonaFavoritosFechas"; // { [idNegocio]: milisegundos } (los negocios ya tenían su lista de ids)
const EVENTO = "mizona-favoritos";
const MAX = 100;

const leer = (clave, defecto) => { try { return JSON.parse(localStorage.getItem(clave) || "") ?? defecto; } catch { return defecto; } };
const escribir = (clave, valor) => { try { localStorage.setItem(clave, JSON.stringify(valor)); } catch { /* sin almacenamiento */ } window.dispatchEvent(new Event(EVENTO)); };

export const getFavFichas = () => { const l = leer(CLAVE, []); return Array.isArray(l) ? l.filter((x) => x && (x.tipo === "oficio" || x.tipo === "alquiler") && typeof x.id === "string") : []; };
export const esFavFicha = (tipo, id) => getFavFichas().some((x) => x.tipo === tipo && x.id === id);

// Guarda o quita. Devuelve true si quedó guardada.
export function alternarFavFicha(tipo, id) {
  const lista = getFavFichas();
  const existe = lista.some((x) => x.tipo === tipo && x.id === id);
  escribir(CLAVE, existe ? lista.filter((x) => !(x.tipo === tipo && x.id === id)) : [{ tipo, id, en: Date.now() }, ...lista].slice(0, MAX));
  return !existe;
}
export function quitarFavFichas(items) {
  if (!items.length) return;
  escribir(CLAVE, getFavFichas().filter((x) => !items.some((y) => y.tipo === x.tipo && y.id === x.id)));
}
export const borrarFavFichas = () => { try { localStorage.removeItem(CLAVE); localStorage.removeItem(CLAVE_FECHAS_NEGOCIOS); } catch { /* nada */ } window.dispatchEvent(new Event(EVENTO)); };

// Fecha en que se guardó un negocio (los guardados antes de esta versión no la tienen: valen 0 y quedan al final de "más recientes")
export const fechaFavNegocio = (id) => Number(leer(CLAVE_FECHAS_NEGOCIOS, {})[id]) || 0;
export function registrarFavNegocio(id, guardado) {
  const m = leer(CLAVE_FECHAS_NEGOCIOS, {});
  if (guardado) m[id] = Date.now(); else delete m[id];
  escribir(CLAVE_FECHAS_NEGOCIOS, m);
}

// Para que el corazón de una pantalla se actualice cuando se guarda desde otra
export function useEsFavFicha(tipo, id) {
  const [fav, setFav] = useState(() => esFavFicha(tipo, id));
  useEffect(() => {
    const act = () => setFav(esFavFicha(tipo, id));
    act();
    window.addEventListener(EVENTO, act);
    return () => window.removeEventListener(EVENTO, act);
  }, [tipo, id]);
  return fav;
}

// La lista completa de favoritos de fichas (para pintar los corazones de un listado)
export function useFavFichas() {
  const [lista, setLista] = useState(() => getFavFichas());
  useEffect(() => {
    const act = () => setLista(getFavFichas());
    window.addEventListener(EVENTO, act);
    return () => window.removeEventListener(EVENTO, act);
  }, []);
  return lista;
}

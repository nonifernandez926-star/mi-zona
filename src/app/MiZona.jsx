// Componente principal: estado general, navegación entre pantallas y carga de datos.
// (Salió de App.jsx sin cambiar su comportamiento.)
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Briefcase, Building2, Check, Clock, Heart, Home, LocateFixed, Map as MapIcon, Search, Sparkles, Users, Wrench, X } from "lucide-react";
import { AgendaScreen, RecordatoriosToast, useRecordatoriosAgenda } from "../agenda.jsx";
import { DetalleAlquiler, FormularioAlquiler, PasoAlquilerActivado } from "../alquileres.jsx";
import { alquileresApi, comunidadApi, desactivarPush, eliminarNegocio, getAvisosApp, oficiosApi, seguridadApi, setToken, sonidoAviso, suscripcionApi, traerCobertura, traerMiSesion, traerMisConversaciones, traerMisNegocios, traerMisPedidos, vincularSesionCliente } from "../api.js";
import { useAtrasDeCapas } from "../atras.js";
import { PantallaBienvenida, PantallaCrearUsuario, PantallaDeclaracion } from "../bienvenida.jsx";
import BuscadorScreen from "../buscador.jsx";
import { EstadoVacio } from "../componentes/Estados.jsx";
import { ComunidadScreen, DetalleComunidad, FormularioComunidad, PasoPublicado } from "../comunidad.jsx";
import { BotonVolver, LoginModal, NombreModal, infoSuscripcion } from "../cuenta.jsx";
import { AvisoDelEquipo, AvisosEquipoScreen, PantallaSuspension } from "../denuncias.jsx";
import { borrarFavFichas, registrarFavNegocio } from "../favoritos.js";
import FavoritosPantalla from "../favoritosPantalla.jsx";
import ListaInicio, { BarraFiltros, borrarVistosFichas, guardarModo, leerModo } from "../inicio.jsx";
import { PasoNegocioActivado } from "../misFichas.jsx";
import NegocioScreen from "../negocio.jsx";
import { DetalleOficio, FormularioOficio, PasoOficioActivado } from "../oficios.jsx";
import { PedidosScreen } from "../pedidos.jsx";
import { PerfilPublicoScreen } from "../perfil.jsx";
import { ReclamosScreen } from "../reclamos.jsx";
import { SelectorUbicacion } from "../selectorUbicacion.jsx";
import { ActivarFichaModal } from "../suscripcion.jsx";
import { addRecentlyViewed, adoptarClienteId, countUnreadChats, getAutorResenasId, getClienteId, getConversation, getFavorites, getRecentlyViewed, saveConversation, saveFavorites } from "./almacen.js";
import { BusquedaAsistenteScreen } from "./busquedaAsistente.jsx";
import { ChatScreen, ChatsScreen } from "./chats.jsx";
import { CATEGORIES, CAT_OTROS, ORDEN_OPCIONES, QUICK_CATEGORIES, ZONES } from "./constantes.js";
import { BusinessDetail } from "./detalleNegocio.jsx";
import { BusinessForm } from "./formularioNegocio.jsx";
import { AjustesScreen, HerramientasScreen } from "./herramientas.jsx";
import { MapaScreen } from "./mapa.jsx";
import { BottomNav, PublicHeader } from "./navegacion.jsx";
import { activeDiscounts, businessRankPosition, busquedaEmpleoActiva, emptyBusiness, enListados, esNegocioNuevo, normalizeBusiness } from "./negocios.js";
import { NOTIF_ELIMINADAS_KEY, NOTIF_LEIDAS_KEY, NOTIF_TIPOS, NOTIF_VISTAS_KEY, buildNotificaciones, getIdSet, saveIdSet } from "./notificaciones.js";
import { PanelNegocio } from "./panelNegocio.jsx";
import { NotificacionesScreen } from "./pantallaNotificaciones.jsx";
import { BarraTitulo, CategoryModal, ConfirmModal, Lightbox } from "./piezas.jsx";
import { PuntosScreen } from "./puntos.jsx";
import { RankingScreen } from "./ranking.jsx";
import { fetchActividad, loadBusinesses, toggleFavoritoOnServer, trackEvento, updateBusinessOnServer } from "./servidor.js";
import { BusinessCard } from "./tarjetaNegocio.jsx";
import { aplicarTema, catInfo, fmtDate, getTema, haversineKm, isOpenNow, shareBusiness, todayISO, uid } from "./utilidades.js";

export default function MiZona() {
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);

  // navegación pública
  const [zone, setZone] = useState(ZONES[0]);
  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] = useState(null);
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [onlyVistos, setOnlyVistos] = useState(false);
  const [vistosIds, setVistosIds] = useState(() => getRecentlyViewed());
  const [onlyNuevos, setOnlyNuevos] = useState(false);
  const [onlyEmpleo, setOnlyEmpleo] = useState(false); // negocios que buscan personal
  const [sortBy, setSortBy] = useState("destacados");
  const [selectedId, setSelectedId] = useState(null);
  const [perfilVer, setPerfilVer] = useState(null); // usuario cuyo perfil público está abierto
  const [showAllCats, setShowAllCats] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState(null);

  const [errorMsg, setErrorMsg] = useState(null);

  // cuenta de Google
  const [usuario, setUsuario] = useState(null);
  // true cuando ya se revisó si este dispositivo tiene una sesión guardada (evita mostrar la bienvenida un instante a quien ya entró)
  const [sesionRevisada, setSesionRevisada] = useState(() => { try { return !localStorage.getItem("miZonaToken") && !localStorage.getItem("token"); } catch { return true; } });
  const [showLogin, setShowLogin] = useState(null); // null | { motivo, despues }
  const [nombrePendiente, setNombrePendiente] = useState(null); // { sugerido, despues } mientras se le pide el nombre
  const [misNegocios, setMisNegocios] = useState([]); // negocios de esta cuenta (incluye los que esperan el pago)
  const misNegociosRef = useRef([]);
  const [avisoOk, setAvisoOk] = useState(null);
  const ownerBizId = misNegocios[0]?.id || null;
  const misIds = useMemo(() => new Set(misNegocios.map((m) => m.id)), [misNegocios]);

  // agenda del dueño (solo quienes tienen un negocio en su cuenta)
  const [showAgenda, setShowAgenda] = useState(false);
  const [recordatoriosAgenda, setRecordatoriosAgenda] = useState([]);
  useRecordatoriosAgenda(!!ownerBizId, (nuevos) => setRecordatoriosAgenda((prev) => [...nuevos.filter((n) => !prev.some((p) => p.id === n.id)), ...prev]));
  // al tocar una notificación push de la agenda la web abre con ?ir=agenda
  const irAAgenda = useRef(new URLSearchParams(window.location.search).get("ir") === "agenda");
  useEffect(() => {
    if (!irAAgenda.current) return;
    window.history.replaceState({}, "", window.location.pathname);
    if (!ownerBizId) { irAAgenda.current = false; return; }
    irAAgenda.current = false;
    setShowAgenda(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerBizId]);

  // panel del dueño
  const [showEditOwnerBiz, setShowEditOwnerBiz] = useState(false);
  const [selectorUbic, setSelectorUbic] = useState(null); // mapa para elegir la ubicación del negocio: { direccion, zona, lat, lng, alConfirmar }

  // agregar mi local + suscripción
  const [showAddSheet, setShowAddSheet] = useState(false);
  // Oficios y servicios (Fase 4): listado, ficha, formulario, paso final y "Mis fichas"
  const [modo, setModoInicio] = useState(leerModo);
  const cambiarModo = (m) => { setModoInicio(m); guardarModo(m); };
  const [catAlquiler, setCatAlquiler] = useState(""); // categoría elegida en Alquileres
  const [tipoAlquiler, setTipoAlquiler] = useState(""); // tipo elegido dentro de esa categoría (se elige en una subpantalla)
  const [rubroOficio, setRubroOficio] = useState(""); // oficio elegido en Oficios
  const [oficioVer, setOficioVer] = useState(null); // { id, rubro }
  const [oficioForm, setOficioForm] = useState(null); // { inicial } (null = crear)
  const [oficioActivado, setOficioActivado] = useState(null);
  // Alquileres (Fase 5): listado, ficha, formulario y paso final (se ven por encima de "Mis fichas")
  const [alquilerVer, setAlquilerVer] = useState(null); // { id }
  const [alquilerForm, setAlquilerForm] = useState(null); // { inicial } (null = crear)
  const [alquilerActivado, setAlquilerActivado] = useState(null);
  // Pestaña «Negocio» (aparece cuando la cuenta tiene un negocio, oficio o alquiler): perfil abierto y subpantalla del negocio
  const [negocioSel, setNegocioSel] = useState(null); // { tipo: "negocio" | "oficio" | "alquiler", id }
  const [subNegocio, setSubNegocio] = useState(null); // null | "promos" | "empleo" | "qr"
  const [fichasResumen, setFichasResumen] = useState({ oficio: false, alquileres: 0 }); // qué fichas (aparte de negocios) tiene la cuenta
  const [fichasVersion, setFichasVersion] = useState(0); // sube cuando cambia una ficha, para que la pestaña Negocio la vuelva a pedir
  useEffect(() => {
    if (!usuario?.id) { setFichasResumen({ oficio: false, alquileres: 0 }); return; }
    let cancelado = false;
    Promise.allSettled([oficiosApi.mio(), alquileresApi.mios()]).then(([o, a]) => {
      if (cancelado) return;
      setFichasResumen({ oficio: o.status === "fulfilled" && !!o.value, alquileres: a.status === "fulfilled" ? (a.value || []).length : 0 });
    });
    return () => { cancelado = true; };
  }, [usuario?.id, fichasVersion]);
  const [negocioEditandoId, setNegocioEditandoId] = useState(null); // negocio que se edita desde "Mis fichas" (si no, el primero)
  const [showAddBusiness, setShowAddBusiness] = useState(false);
  const [borrador, setBorrador] = useState(null); // negocio recién completado, esperando que elija el plan
  const [planesModal, setPlanesModal] = useState(null); // { tipo, nombre, fichaId, vencimiento, nuevo, cubierto, hasta } → modal para activar una ficha (mes gratis, Google Play o días de invitación)
  const [addBusinessDone, setAddBusinessDone] = useState(null); // { hasta } cuando se publicó sin pagar (ya pagó Mi Asistente)

  const recargarMisNegocios = async () => {
    try {
      const r = await traerMisNegocios();
      const mios = (r.negocios || []).map(normalizeBusiness);
      misNegociosRef.current = mios;
      setMisNegocios(mios);
      // los negocios propios (incluso los que esperan el pago) reemplazan a la versión pública dentro de la lista
      setBusinesses((prev) => [...mios, ...prev.filter((b) => !mios.some((m) => m.id === b.id))]);
      return mios;
    } catch (e) {
      console.error(e);
      return null;
    }
  };

  // modo: "registro" (primera vez) | "login" (ya tiene cuenta)
  const abrirLogin = (motivo, despues = null, modo = "login") => setShowLogin({ motivo, despues, modo });
  const continuarDespues = (despues) => {
    if (despues === "agregar") setShowAddBusiness(true);
    else if (despues === "oficio") abrirOfrecerOficio();
    else if (despues === "alquiler") abrirOfrecerAlquiler();
    else if (despues?.tipo === "chat") setChatBiz(despues.biz);
  };
  // "Ofrecer mis servicios": si ya tiene su ficha de oficios se abre "Mis fichas" (una por persona); si no, el formulario
  const abrirOfrecerOficio = async () => {
    if (!requerirSesion("Para ofrecer tus servicios necesitás una cuenta de Mi Zona. Es rápido y gratis.", "oficio")) return;
    try {
      const mio = await oficiosApi.mio();
      if (mio) irANegocio({ tipo: "oficio", id: mio.id }); else setOficioForm({ inicial: null });
    } catch { setOficioForm({ inicial: null }); }
  };
  // "Ofrecer en alquiler": se pueden tener hasta 5 fichas; si ya llegó al máximo se abre "Mis fichas"
  const abrirOfrecerAlquiler = async () => {
    if (!requerirSesion("Para ofrecer algo en alquiler necesitás una cuenta de Mi Zona. Es rápido y gratis.", "alquiler")) return;
    try {
      const mias = await alquileresApi.mios();
      if (mias.length >= 5) irANegocio(); else setAlquilerForm({ inicial: null });
    } catch { setAlquilerForm({ inicial: null }); }
  };
  // Comunidad: hace falta cuenta y localidad (de ahí sale el departamento que ve lo publicado)
  const abrirComunidad = () => {
    if (!requerirSesion("Para ver Comunidad necesitás una cuenta de Mi Zona. Es rápido y gratis.", null)) return;
    irATab("comunidad");
  };
  const abrirPublicarComunidad = (tipo = null, titulo = "") => {
    if (!requerirSesion("Para publicar en Comunidad necesitás una cuenta de Mi Zona. Es rápido y gratis.", null)) return;
    if (!usuario?.localidad?.localidadId) { alert("Para publicar en Comunidad elegí primero tu localidad en tu perfil."); return; }
    setComunidadForm({ inicial: null, tipo, titulo });
  };
  // Eliminar un negocio propio (la confirmación la pide "Mis fichas")
  const eliminarNegocioPropio = async (id) => {
    await eliminarNegocio(id);
    setBusinesses((prev) => prev.filter((b) => b.id !== id));
    setFavorites((prev) => prev.filter((f) => f !== id));
    await recargarMisNegocios();
  };
  // Funciones importantes (registrar un negocio, dejar una reseña, chatear con el asistente) piden registrarse con Google primero
  const requerirSesion = (motivo, despues = null) => {
    if (usuario) return true;
    abrirLogin(motivo, despues);
    return false;
  };
  const abrirChat = (biz) => {
    if (requerirSesion("Para chatear con el asistente de este negocio necesitás una cuenta de Mi Zona.", { tipo: "chat", biz })) setChatBiz(biz);
  };
  const alIniciarSesion = (r) => {
    const despues = showLogin?.despues || null;
    setUsuario(r.usuario);
    setShowLogin(null);
    if (r.yaExistia && r.desdeRegistro) setAvisoOk("Ya estabas registrado con esa cuenta: te iniciamos sesión.");
    continuarDespues(despues);
  };
  // Fase 8: cuenta suspendida por el equipo (el servidor ya bloquea las acciones; acá se muestra el motivo y cómo apelar) y avisos sin leer
  const [suspension, setSuspension] = useState(null);
  const [suspensionVista, setSuspensionVista] = useState(null); // null | "avisos"
  const [suspensionDescartada, setSuspensionDescartada] = useState(false); // para ir a Privacidad (descargar datos o eliminar la cuenta)
  useEffect(() => { setSuspension(usuario?.suspension || null); setSuspensionDescartada(false); setSuspensionVista(null); }, [usuario?.id, usuario?.suspension?.hasta, usuario?.suspension?.permanente]);
  useEffect(() => {
    const alSuspender = (ev) => { if (usuario) { setSuspension(ev.detail || {}); setSuspensionDescartada(false); } };
    window.addEventListener("mizona:suspension", alSuspender);
    return () => window.removeEventListener("mizona:suspension", alSuspender);
  }, [usuario?.id]);
  // al tocar una notificación del equipo la web abre con ?ir=avisos
  const irAAvisos = useRef(new URLSearchParams(window.location.search).get("ir") === "avisos");
  useEffect(() => {
    if (!irAAvisos.current || !usuario) return;
    irAAvisos.current = false;
    window.history.replaceState({}, "", window.location.pathname);
    irATab("ajustes"); setSubAjustes("avisos");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario?.id]);

  const cerrarSesion = async () => {
    try { await desactivarPush(); } catch { /* no había push activo */ }
    await seguridadApi.salir(); // la sesión de este dispositivo deja de figurar como abierta en Seguridad → Dispositivos
    setToken(null);
    setUsuario(null);
    misNegociosRef.current = [];
    setMisNegocios([]);
    setShowEditOwnerBiz(false);
    try { setBusinesses(await loadBusinesses()); } catch { /* se queda la lista que ya estaba */ }
  };
  const borrarDatosLocales = () => {
    Object.keys(localStorage).filter((k) => k.startsWith("miZona")).forEach((k) => localStorage.removeItem(k));
    setFavorites([]);
    borrarFavFichas(); // favoritos de oficios y alquileres de este dispositivo
    setOnlyFavorites(false);
    setNotifLeidas(new Set());
    setNotifEliminadas(new Set());
    setVistosIds([]);
    setOnlyVistos(false);
    aplicarTema("auto");
  };
  const abrirAgregarNegocio = () => {
    if (requerirSesion("Para registrar tu negocio necesitás una cuenta de Mi Zona. Es rápido y gratis.", "agregar")) setShowAddBusiness(true);
  };

  // Fase 9: al completar el formulario de un negocio nuevo y tocar "Aceptar", se guarda SIN publicar y se elige cómo activarlo:
  // mes gratis, plan de Google Play, días de invitación (o directo, si la cuenta ya pagó Mi Asistente)
  const terminarNegocioNuevo = async (r) => {
    setPlanesModal(null); setBorrador(null); setShowAddBusiness(false);
    const antesIds = new Set((misNegociosRef.current || []).map((m) => m.id));
    const mios = await recargarMisNegocios();
    setAddBusinessDone({ hasta: r.expiresAt, negocio: (mios || []).find((m) => !antesIds.has(m.id)) || null });
  };
  const submitPublicBusiness = async (data) => {
    let gratis = false, hasta = null;
    try {
      const c = await traerCobertura();
      gratis = !!c.cubierto && !misNegocios.some((n) => n.suscripcion?.origen === "asistente");
      hasta = c.hasta;
    } catch { /* si no se puede consultar, sigue el flujo normal */ }
    setBorrador(data);
    if (gratis) { setPlanesModal({ tipo: "negocio", nombre: data.name, cubierto: true, hasta, nuevo: true }); return; }
    try {
      const r = await suscripcionApi.guardarNegocio(data);
      if (r.cubiertoPorAsistente) { await terminarNegocioNuevo(r); return; }
      await recargarMisNegocios();
      setPlanesModal({ tipo: "negocio", nombre: data.name, fichaId: r.bizId, nuevo: true });
    } catch (e) { setErrorMsg(e.message || "No se pudo guardar tu negocio. Probá de nuevo."); }
  };
  const publicarCubierto = async () => {
    const r = await suscripcionApi.guardarNegocio(borrador);
    if (r.cubiertoPorAsistente) { await terminarNegocioNuevo(r); return; }
    await recargarMisNegocios();
    setPlanesModal((m) => ({ ...m, cubierto: false, fichaId: r.bizId })); // la cobertura ya no aplica: se elige mes gratis o plan
  };
  // La ficha quedó activa (mes gratis, compra o días): se cierra el modal y se sigue con el paso de compartir si era nueva
  const fichaActivada = async (info) => {
    const m = planesModal; setPlanesModal(null); setFichasVersion((v) => v + 1);
    const mensaje = info.origen === "gratis" ? "¡Listo! Tu mes gratis empezó." : info.origen === "invitacion" ? `Sumaste ${info.dias} días a tu ficha.` : "¡Pago confirmado! Tu plan ya está activo.";
    setAvisoOk(`${mensaje} Vence el ${new Date(`${info.vence}T00:00:00`).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })}.`);
    if (m.tipo === "negocio") {
      const mios = await recargarMisNegocios();
      if (m.nuevo) { setBorrador(null); setShowAddBusiness(false); const n = (mios || []).find((x) => x.id === m.fichaId); if (n && !n.compartioEn) setPasoNegocio(n); }
    } else if (m.nuevo && m.ficha) {
      if (m.tipo === "oficio") setOficioActivado(m.ficha); else setAlquilerActivado(m.ficha);
    }
  };
  const abrirAgregarMesesDe = (b) => setPlanesModal({ tipo: "negocio", nombre: b.name, fichaId: b.id, vencimiento: b.pendientePago ? null : b.expiresAt });
  const abrirAgregarMeses = () => {
    const b = businesses.find((x) => x.id === ownerBizId);
    if (!b) return;
    setPlanesModal({ tipo: "negocio", nombre: b.name, fichaId: b.id, vencimiento: b.pendientePago ? null : b.expiresAt });
  };
  // Desde "Mis fichas": activar una ficha sin activar o agregarle tiempo
  const activarFicha = ({ tipo, id, nombre, vencimiento }) => setPlanesModal({ tipo, nombre, fichaId: id, vencimiento: vencimiento || null });

  // pestaña activa de la barra inferior (Inicio | Explorar | Herramientas | Ajustes)
  const [activeTab, setActiveTab] = useState("inicio");
  const [chatQuery, setChatQuery] = useState("");
  const [confirmarSalida, setConfirmarSalida] = useState(false);
  // aplica la apariencia elegida y, en modo automático, la sigue cuando el celular cambia de claro a oscuro
  useEffect(() => {
    aplicarTema(getTema());
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    const alCambiar = () => { if (getTema() === "auto") aplicarTema("auto"); };
    mq?.addEventListener?.("change", alCambiar);
    return () => mq?.removeEventListener?.("change", alCambiar);
  }, []);
  const [subAjustes, setSubAjustes] = useState(null); // null | "cuenta" | "notificaciones" | "seguridad" | "apariencia" | "acerca" | "ayuda" | "soporte" | "privacidad"
  const irATab = (tab) => { setNegocioSel(null); setSubNegocio(null); setSubAjustes(null); setActiveTab(tab); window.scrollTo(0, 0); };
  // Va a la pestaña Negocio; con "sel" abre directo el panel de ese perfil
  const irANegocio = (sel = null) => { setNegocioSel(sel); setSubNegocio(null); setSubAjustes(null); setActiveTab("negocio"); window.scrollTo(0, 0); };

  // favoritos (guardados en este dispositivo)
  const [favorites, setFavorites] = useState(() => getFavorites());
  const toggleFavorite = (bizId) => {
    const yaEsFavorito = favorites.includes(bizId);
    registrarFavNegocio(bizId, !yaEsFavorito); // guarda la fecha para filtrar Favoritos por fecha
    setFavorites((prev) => {
      const next = yaEsFavorito ? prev.filter((id) => id !== bizId) : [...prev, bizId];
      saveFavorites(next);
      return next;
    });
    // actualizamos el contador optimistamente en memoria para que el ranking lo refleje al toque,
    // y sincronizamos el número real con el servidor en segundo plano
    setBusinesses((prev) => prev.map((b) => (
      b.id === bizId ? { ...b, vecesFavorito: Math.max(0, (b.vecesFavorito || 0) + (yaEsFavorito ? -1 : 1)) } : b
    )));
    toggleFavoritoOnServer(bizId, yaEsFavorito ? -1 : 1);
    if (!yaEsFavorito && !misIds.has(bizId)) trackEvento(bizId, "guardado"); // estadística privada del dueño
  };

  // chat con el asistente de un negocio
  const [chatBiz, setChatBiz] = useState(null);
  const [showBusquedaAsistente, setShowBusquedaAsistente] = useState(false);
  const [showRanking, setShowRanking] = useState(false);
  const [showMapa, setShowMapa] = useState(false);
  const [showFavoritos, setShowFavoritos] = useState(false);
  // Comunidad (Fase 7): el servidor la enciende con COMUNIDAD_HABILITADA=true y la moderación configurada (Fase 8).
  // true = lista · false = apagada (en Chats se muestra la tarjeta con «Próximamente») · null = todavía no se sabe (sin conexión o servidor dormido)
  const [comunidadHabilitada, setComunidadHabilitada] = useState(null);
  const [comunidadVer, setComunidadVer] = useState(null); // { id }
  const [comunidadForm, setComunidadForm] = useState(null); // { inicial, tipo, titulo }
  const [comunidadPublicada, setComunidadPublicada] = useState(null); // publicación recién creada
  const [comunidadVersion, setComunidadVersion] = useState(0); // sube cuando algo cambia, para refrescar la lista
  useEffect(() => { comunidadApi.estado().then(setComunidadHabilitada); }, []);
  // Si todavía no se sabe o estaba apagada, se vuelve a preguntar al entrar a Chats o a Comunidad (así se nota apenas se enciende en el servidor)
  useEffect(() => {
    if (comunidadHabilitada === true || (activeTab !== "chats" && activeTab !== "comunidad")) return undefined;
    let vigente = true;
    comunidadApi.estado().then((v) => { if (vigente) setComunidadHabilitada(v); });
    return () => { vigente = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);
  const [buscador, setBuscador] = useState(null); // { inicial } cuando está abierto el buscador único (Fase 6)
  const [pasoNegocio, setPasoNegocio] = useState(null); // negocio recién activado: se le muestra el paso de compartir
  // Mis pedidos: lista con el estado de cada pedido (viene de Mi Asistente) y su recarga
  const [showPedidos, setShowPedidos] = useState(false);
  const [reclamosView, setReclamosView] = useState(null); // { pedido } = formulario para ese pedido; {} = lista de mis reclamos; null = cerrado
  const [misPedidos, setMisPedidos] = useState([]);
  const [pedidosCargando, setPedidosCargando] = useState(true);
  const [pedidosError, setPedidosError] = useState(false);
  const recargarRef = useRef(null);
  const recargarPedidos = useCallback(() => recargarRef.current?.(), []);
  const [mapaFiltros, setMapaFiltros] = useState(null); // filtros con los que se abre el mapa (null = mapa cerrado)

  // centro de notificaciones y puntos del cliente
  const [showNotificaciones, setShowNotificaciones] = useState(false);
  const [puntosView, setPuntosView] = useState(null); // null | { codigoPublico?: string }
  const [actividad, setActividad] = useState({ pedidos: [], turnos: [], puntos: [], canjes: [] });
  const [actividadLista, setActividadLista] = useState(false);
  const [avisosNuevos, setAvisosNuevos] = useState([]); // avisos emergentes (como los de Mi Asistente)
  const [campanaSacude, setCampanaSacude] = useState(0);
  const vistasRef = useRef(null);
  const [notifLeidas, setNotifLeidas] = useState(() => getIdSet(NOTIF_LEIDAS_KEY));
  const [notifEliminadas, setNotifEliminadas] = useState(() => getIdSet(NOTIF_ELIMINADAS_KEY));

  // "más cercanos"
  const [userLoc, setUserLoc] = useState(null); // { lat, lng } — solo en memoria, nunca se guarda
  const [locStatus, setLocStatus] = useState("idle"); // idle | loading | denied | error | ok

  const requestLocation = () => {
    if (!navigator.geolocation) { setLocStatus("error"); return; }
    setLocStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocStatus("ok");
      },
      () => setLocStatus("denied"),
      { enableHighAccuracy: false, timeout: 10000 }
    );
  };

  // Restaura la sesión de Google guardada en este dispositivo
  useEffect(() => {
    (async () => {
      try {
        const u = await traerMiSesion();
        if (!u) return;
        setUsuario(u);
      } finally { setSesionRevisada(true); }
    })();
  }, []);

  // Con sesión: el id de cliente queda ligado a la cuenta y los chats que tuvo con los negocios se recuperan
  // (incluidos los de negocios que renovaron Mi Asistente después de vencer). Se hace una vez que los negocios cargaron.
  const chatsSincronizados = useRef(null);
  useEffect(() => {
    if (!usuario?.id || businesses.length === 0 || chatsSincronizados.current === usuario.id) return;
    chatsSincronizados.current = usuario.id;
    (async () => {
      try {
        const r = await vincularSesionCliente(getClienteId());
        if (r.sesionClienteId && r.sesionClienteId !== getClienteId()) adoptarClienteId(r.sesionClienteId);
        const { conversaciones = [] } = await traerMisConversaciones();
        conversaciones.forEach((c) => {
          const biz = businesses.find((b) => b.asistenteCodigoPublico === c.codigoPublico);
          if (!biz || !c.mensajes?.length) return;
          const locales = getConversation(biz.id);
          if (c.mensajes.length > locales.length) {
            saveConversation(biz.id, c.mensajes.map((m) => ({ id: uid(), rol: m.rol, texto: m.contenido, hora: m.fecha })));
          }
        });
        setBusinesses((lista) => [...lista]); // refresca las pantallas que leen los chats guardados
      } catch { /* sin conexión: quedan los chats de este dispositivo */ }
    })();
  }, [usuario?.id, businesses.length]);

  // Cuando hay sesión, trae los negocios de la cuenta (y ahí se verifica si ya pagó Mi Asistente)
  useEffect(() => {
    if (usuario) recargarMisNegocios();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario?.id]);

  // Si alguien llega con un enlace viejo de Mercado Pago (?pago=...), se limpia la dirección: ya no se paga por ahí
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("pago")) window.history.replaceState({}, "", window.location.pathname);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const list = await loadBusinesses();
        const propios = misNegociosRef.current;
        setBusinesses([...propios, ...list.filter((b) => !propios.some((m) => m.id === b.id))]);
      } catch (e) {
        console.error(e);
        setErrorMsg("No se pudieron cargar los negocios. Revisá que el servidor esté encendido y VITE_API_URL apunte a él.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Actividad del cliente (pedidos, turnos, puntos, canjes) para el centro de notificaciones:
  // al abrir la app, al volver a ella y cada 2 minutos mientras está visible.
  useEffect(() => {
    if (!usuario?.id) { setActividad({ pedidos: [], turnos: [], puntos: [], canjes: [] }); return; } // la actividad es de la cuenta: sin sesión no hay nada que pedir
    let cancelado = false;
    const cargar = async () => {
      setPedidosCargando(true);
      // Se piden juntos: la actividad (turnos, puntos, canjes) y los pedidos con su estado. Si una falla, la otra igual se muestra.
      const [a, mis] = await Promise.all([fetchActividad().catch(() => null), traerMisPedidos().catch(() => null)]);
      if (cancelado) return;
      const base = a ? { ...a } : { pedidos: [], turnos: [], puntos: [], canjes: [] };
      if (mis) {
        setMisPedidos(mis); setPedidosError(false);
        // los avisos de pedidos de la campana salen de esta lista (es la fuente más completa)
        base.pedidos = mis.map((p) => ({ id: p.id, estado: p.estado, negocio: p.negocio?.nombre || "Negocio", total: p.total, actualizadoEn: p.actualizado, codigoPublico: p.negocio?.codigoPublico }));
      } else if (!a) setPedidosError(true);
      if (a || mis) { setActividad(base); setActividadLista(true); }
      setPedidosCargando(false);
    };
    recargarRef.current = cargar;
    cargar();
    const timer = setInterval(() => { if (document.visibilityState === "visible") cargar(); }, 120000);
    const alVolver = () => { if (document.visibilityState === "visible") cargar(); };
    document.addEventListener("visibilitychange", alVolver);
    return () => { cancelado = true; clearInterval(timer); document.removeEventListener("visibilitychange", alVolver); };
  }, [usuario?.id]);

  // Al tocar el aviso de "tu pedido está listo" la app se abre en Mis pedidos
  useEffect(() => {
    if (!usuario?.usuario) return;
    const q = new URLSearchParams(window.location.search);
    if (q.get("abrir") === "pedidos") { setShowPedidos(true); window.history.replaceState(null, "", window.location.pathname); }
    if (q.get("abrir") === "reclamos") { setReclamosView({}); window.history.replaceState(null, "", window.location.pathname); }
  }, [usuario?.usuario]);

  const ownerBiz = businesses.find((b) => b.id === ownerBizId);
  const negociosPropios = useMemo(() => misNegocios.map((m) => businesses.find((b) => b.id === m.id) || m), [misNegocios, businesses]);
  const esDueno = negociosPropios.length > 0 || fichasResumen.oficio || fichasResumen.alquileres > 0;
  const bizEditando = negocioEditandoId ? businesses.find((b) => b.id === negocioEditandoId) : ownerBiz; // el que se está editando (desde Herramientas, el primero)
  const notificaciones = useMemo(
    () => buildNotificaciones({ actividad, businesses, favorites, autorId: getAutorResenasId(), ownerBizs: misNegocios.map((m) => businesses.find((b) => b.id === m.id) || m) }).filter((n) => !notifEliminadas.has(n.id)),
    [actividad, businesses, favorites, notifEliminadas, misNegocios]
  );
  const notifSinLeer = notificaciones.filter((n) => !notifLeidas.has(n.id)).length;
  // Cuando llega un aviso nuevo con la app abierta: se muestra un cartel y la campana se sacude. Lo ya existente no avisa.
  useEffect(() => {
    if (!actividadLista || !usuario?.id) return;
    if (vistasRef.current === null) {
      vistasRef.current = getIdSet(NOTIF_VISTAS_KEY);
      const primera = vistasRef.current.size === 0;
      notificaciones.forEach((n) => vistasRef.current.add(n.id));
      if (primera) saveIdSet(NOTIF_VISTAS_KEY, vistasRef.current);
      if (primera) return;
    }
    const nuevos = notificaciones.filter((n) => !vistasRef.current.has(n.id) && !notifLeidas.has(n.id));
    if (!nuevos.length) return;
    notificaciones.forEach((n) => vistasRef.current.add(n.id));
    saveIdSet(NOTIF_VISTAS_KEY, vistasRef.current);
    const ajustes = getAvisosApp();
    if (ajustes.cartel) setAvisosNuevos(nuevos.slice(0, 2));
    if (ajustes.sonido) sonidoAviso();
    setCampanaSacude((v) => v + 1);
  }, [notificaciones, actividadLista]);
  useEffect(() => { if (!avisosNuevos.length) return; const t = setTimeout(() => setAvisosNuevos([]), 6000); return () => clearTimeout(t); }, [avisosNuevos]);
  const marcarNotifLeida = (id) => {
    setNotifLeidas((prev) => { if (prev.has(id)) return prev; const next = new Set(prev); next.add(id); saveIdSet(NOTIF_LEIDAS_KEY, next); return next; });
  };
  const marcarTodasLeidas = () => {
    setNotifLeidas((prev) => { const next = new Set(prev); notificaciones.forEach((n) => next.add(n.id)); saveIdSet(NOTIF_LEIDAS_KEY, next); return next; });
  };
  const eliminarNotif = (id) => {
    setNotifEliminadas((prev) => { const next = new Set(prev); next.add(id); saveIdSet(NOTIF_ELIMINADAS_KEY, next); return next; });
  };

  // Actualiza UN negocio en el estado local y lo guarda en el servidor
  const persistOne = (id, updaterOrObj) => {
    setBusinesses((prev) => {
      const next = prev.map((b) => (b.id === id ? (typeof updaterOrObj === "function" ? updaterOrObj(b) : updaterOrObj) : b));
      const updated = next.find((b) => b.id === id);
      if (updated) {
        updateBusinessOnServer(id, updated).catch((e) => {
          console.error(e);
          setErrorMsg("No se pudo guardar el cambio. Revisá que el servidor y MongoDB estén andando.");
        });
      }
      return next;
    });
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = businesses.filter((b) => {
      if (b.kind === "job") return false;
      if (b.status !== "active" || !enListados(b)) return false;
      const matchCat = activeCat === CAT_OTROS ? !QUICK_CATEGORIES.some((q) => q.id === b.cat) : activeCat ? b.cat === activeCat : true;
      const matchZone = b.zone === zone;
      const haystack = [b.name, b.desc, ...(b.services || []), ...(b.specialties || [])].join(" ").toLowerCase();
      const matchQ = q ? haystack.includes(q) : true;
      const matchOpen = onlyOpen ? isOpenNow(b.weekHours) : true;
      const matchFav = onlyFavorites ? favorites.includes(b.id) : true;
      const matchVisto = onlyVistos ? vistosIds.includes(b.id) : true;
      const matchNuevo = onlyNuevos ? esNegocioNuevo(b) : true;
      const matchEmpleo = onlyEmpleo ? busquedaEmpleoActiva(b) : true;
      const matchDiscount = sortBy === "descuentos" ? activeDiscounts(b).length > 0 : true;
      return matchCat && matchZone && matchQ && matchOpen && matchFav && matchVisto && matchNuevo && matchEmpleo && matchDiscount;
    });
    list = [...list];
    if (onlyVistos) {
      list.sort((a, b) => vistosIds.indexOf(a.id) - vistosIds.indexOf(b.id)); // el último que viste primero
    } else if (onlyNuevos) {
      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); // los más recientes primero
    } else if (sortBy === "vistas") {
      list.sort((a, b) => b.views - a.views);
    } else if (sortBy === "cercanos" && userLoc) {
      const withCoords = list.filter((b) => b.lat && b.lng);
      const withoutCoords = list.filter((b) => !(b.lat && b.lng));
      withCoords.sort((a, b) => haversineKm(userLoc.lat, userLoc.lng, a.lat, a.lng) - haversineKm(userLoc.lat, userLoc.lng, b.lat, b.lng));
      list = [...withCoords, ...withoutCoords];
    } else {
      list.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
    }
    return list;
  }, [businesses, query, activeCat, zone, onlyOpen, onlyFavorites, favorites, onlyVistos, vistosIds, onlyNuevos, onlyEmpleo, sortBy, userLoc]);

  const selected = businesses.find((b) => b.id === selectedId);

  const openDetail = (id) => {
    persistOne(id, (b) => ({ ...b, views: b.views + 1 }));
    if (!misIds.has(id)) trackEvento(id, "visita"); // estadística privada del dueño (no cuenta cuando mira su propio perfil)
    addRecentlyViewed(id);
    setVistosIds(getRecentlyViewed());
    setSelectedId(id);
    window.scrollTo(0, 0);
  };

  const addReview = (id, review) => {
    if (!requerirSesion("Para dejar una reseña necesitás una cuenta de Mi Zona.")) return false;
    // siempre con el usuario de la cuenta (el servidor también lo pone, así nadie puede firmar con otro nombre)
    const nombre = usuario.usuario || usuario.nombre || "Anónimo";
    persistOne(id, (b) => ({ ...b, reviews: [...b.reviews, { ...review, name: nombre, conUsuario: !!usuario.usuario }] }));
    return true;
  };
  const replyToReview = (bizId, reviewId, texto, esDueño) => {
    persistOne(bizId, (b) => ({
      ...b,
      reviews: b.reviews.map((r) => (
        r.id === reviewId ? { ...r, respuesta: { texto, esDueño, fecha: todayISO() } } : r
      )),
    }));
  };

  // acciones del dueño (solo afectan su propio negocio, nunca otros)
  const saveOwnerDiscount = (id, discount) => {
    persistOne(id, (b) => {
      const exists = (b.discounts || []).some((d) => d.id === discount.id);
      const discounts = exists ? b.discounts.map((d) => (d.id === discount.id ? discount : d)) : [...(b.discounts || []), discount];
      return { ...b, discounts };
    });
  };
  const toggleOwnerDiscount = (id, discountId) => {
    persistOne(id, (b) => ({ ...b, discounts: b.discounts.map((d) => (d.id === discountId ? { ...d, active: !d.active } : d)) }));
  };
  const deleteOwnerDiscount = (id, discountId) => {
    persistOne(id, (b) => ({ ...b, discounts: b.discounts.filter((d) => d.id !== discountId) }));
  };

  // Botón "atrás" de Android: cierra la pantalla o ventana de más arriba en vez de salir de la app (de abajo hacia arriba)
  useAtrasDeCapas([
    [activeTab === "comunidad", () => irATab("chats")], // «atrás» desde Comunidad vuelve a Chats
    [!!selectedId, () => setSelectedId(null)],
    [showFavoritos, () => setShowFavoritos(false)],
    [!!buscador, () => setBuscador(null)],
    [!!comunidadVer, () => setComunidadVer(null)],
    [!!comunidadForm, () => setComunidadForm(null)],
    [!!comunidadPublicada, () => setComunidadPublicada(null)],
    [showMapa, () => setShowMapa(false)],
    [showRanking, () => setShowRanking(false)],
    [showAgenda, () => setShowAgenda(false)],
    [!!puntosView, () => setPuntosView(null)],
    [showNotificaciones, () => setShowNotificaciones(false)],
    [showBusquedaAsistente, () => setShowBusquedaAsistente(false)],
    [!!chatBiz, () => setChatBiz(null)],
    [!!negocioSel, () => setNegocioSel(null)],
    [!!subNegocio, () => setSubNegocio(null)],
    [!!subAjustes, () => setSubAjustes(null)],
    [!!oficioVer, () => setOficioVer(null)],
    [!!oficioForm, () => setOficioForm(null)],
    [!!oficioActivado, () => setOficioActivado(null)],
    [!!alquilerVer, () => setAlquilerVer(null)],
    [!!alquilerForm, () => setAlquilerForm(null)],
    [!!alquilerActivado, () => setAlquilerActivado(null)],
    [showEditOwnerBiz, () => { setShowEditOwnerBiz(false); setNegocioEditandoId(null); }],
    [!!perfilVer, () => setPerfilVer(null)],
    [showAddSheet, () => setShowAddSheet(false)],
    [showAddBusiness, () => setShowAddBusiness(false)],
    [!!borrador, () => setBorrador(null)],
    [!!planesModal, () => setPlanesModal(null)],
    [!!addBusinessDone, () => setAddBusinessDone(null)],
    [!!pasoNegocio, () => setPasoNegocio(null)],
    [!!showLogin, () => setShowLogin(null)],
    [confirmarSalida, () => setConfirmarSalida(false)],
    [!!lightboxSrc, () => setLightboxSrc(null)],
    [!!selectorUbic, () => setSelectorUbic(null)],
    [showPedidos, () => setShowPedidos(false)],
    [!!reclamosView, () => setReclamosView(null)],
  ]);

  // Puerta de entrada: sin sesión se ve la bienvenida (Empezar → Registrarme / Iniciar sesión); con sesión abierta se entra directo al inicio.
  if (!sesionRevisada) return <div style={{ position: "fixed", inset: 0, background: "#050b2a" }} aria-hidden="true" />;
  if (!usuario) return <PantallaBienvenida onLogged={(u) => setUsuario(u)} />;
  if (!usuario.usuario) return <PantallaCrearUsuario usuario={usuario} onListo={(u) => setUsuario(u)} onSalir={cerrarSesion} />;
  if (usuario.declaracionPendiente) return <PantallaDeclaracion onListo={(u) => setUsuario(u)} onSalir={cerrarSesion} />;

  if (loading) {
    return <div style={{ backgroundColor: "#F3F5FA", minHeight: "100dvh" }} className="flex items-center justify-center text-sm" ><span style={{color:"#5B6482"}}>Cargando...</span></div>;
  }

  const globalStyle = (
    <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@500;600;700&family=Work+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@500&display=swap');`}</style>
  );

  /* ---- vista chat con el asistente ---- */
  if (chatBiz) {
    return (
      <div style={{ fontFamily: "var(--fuente-texto)" }}>
        {globalStyle}
        <ChatScreen biz={chatBiz} onBack={() => setChatBiz(null)} />
      </div>
    );
  }

  /* ---- vista del asistente de búsqueda general ---- */
  if (showBusquedaAsistente) {
    return (
      <div style={{ fontFamily: "var(--fuente-texto)" }}>
        {globalStyle}
        <BusquedaAsistenteScreen
          userLoc={userLoc}
          onUbicacion={(loc) => { setUserLoc(loc); setLocStatus("ok"); }}
          businesses={businesses}
          onBack={() => setShowBusquedaAsistente(false)}
          onOpenBusiness={(id) => { setShowBusquedaAsistente(false); openDetail(id); }}
          onOpenOficio={(id) => { setShowBusquedaAsistente(false); setOficioVer({ id }); }}
          onOpenAlquiler={(id) => { setShowBusquedaAsistente(false); setAlquilerVer({ id }); }}
        />
      </div>
    );
  }

  /* ---- centro de notificaciones ---- */
  if (showNotificaciones) {
    return (
      <div style={{ fontFamily: "var(--fuente-texto)" }}>
        {globalStyle}
        <NotificacionesScreen
          usuario={usuario}
          notificaciones={notificaciones}
          leidas={notifLeidas}
          onBack={() => setShowNotificaciones(false)}
          onMarkAllRead={marcarTodasLeidas}
          onDelete={eliminarNotif}
          onOpen={(n) => {
            marcarNotifLeida(n.id);
            if (n.destino === "puntos") { setShowNotificaciones(false); setPuntosView({}); return; }
            if (n.destino === "suscripcion") { setShowNotificaciones(false); irATab("negocio"); return; }
            if (n.bizId) { setShowNotificaciones(false); openDetail(n.bizId); }
          }}
        />
      </div>
    );
  }

  /* ---- mis puntos y recompensas ---- */
  if (puntosView) {
    return (
      <div style={{ fontFamily: "var(--fuente-texto)" }}>
        {globalStyle}
        <PuntosScreen
          businesses={businesses}
          initialCodigo={puntosView.codigoPublico}
          onBack={() => setPuntosView(null)}
          onOpenBusiness={(id) => { setPuntosView(null); openDetail(id); }}
        />
      </div>
    );
  }

  /* ---- vista de la agenda del dueño ---- */
  if (showAgenda && ownerBizId) {
    return (
      <div style={{ fontFamily: "var(--fuente-texto)" }}>
        {globalStyle}
        <RecordatoriosToast lista={recordatoriosAgenda} onCerrar={(id) => setRecordatoriosAgenda((l) => l.filter((r) => r.id !== id))} onAbrir={(r) => setRecordatoriosAgenda((l) => l.filter((x) => x.id !== r.id))} />
        <AgendaScreen negocioNombre={ownerBiz?.name} onBack={() => setShowAgenda(false)} />
      </div>
    );
  }

  /* ---- vista del ranking ---- */
  if (showRanking) {
    return (
      <div style={{ backgroundColor: "#F3F5FA", minHeight: "100dvh", fontFamily: "var(--fuente-texto)" }}>
        {globalStyle}
        <RankingScreen
          businesses={businesses}
          zone={zone}
          onBack={() => setShowRanking(false)}
          onOpenBusiness={(id) => { setShowRanking(false); openDetail(id); }}
        />
      </div>
    );
  }

  /* ---- vista del mapa ---- */
  if (showMapa) {
    return (
      <div style={{ fontFamily: "var(--fuente-texto)" }}>
        {globalStyle}
        <MapaScreen
          businesses={businesses}
          zone={zone}
          favorites={favorites}
          onToggleFavorite={toggleFavorite}
          userLoc={userLoc}
          locStatus={locStatus}
          onRequestLocation={requestLocation}
          initialFilters={mapaFiltros}
          onTrack={trackEvento}
          onBack={() => setShowMapa(false)}
          onOpenBusiness={(id) => { setShowMapa(false); openDetail(id); }}
        />
      </div>
    );
  }

  /* ---- reclamos, devoluciones y cambios ---- */
  if (reclamosView) {
    return (
      <div style={{ fontFamily: "var(--fuente-texto)" }}>
        {globalStyle}
        <ReclamosScreen
          pedidoInicial={reclamosView.pedido || null}
          onBack={() => setReclamosView(null)}
          onAbrirNegocio={(codigo) => { const b = businesses.find((x) => x.asistenteCodigoPublico === codigo); if (b) { setReclamosView(null); setShowPedidos(false); openDetail(b.id); } }}
        />
      </div>
    );
  }

  /* ---- vista de favoritos ---- */
  if (showPedidos) {
    return (
      <div style={{ fontFamily: "var(--fuente-texto)" }}>
        {globalStyle}
        <PedidosScreen
          pedidos={misPedidos} cargando={pedidosCargando} error={pedidosError}
          onRecargar={recargarPedidos}
          onBack={() => setShowPedidos(false)}
          onAbrirNegocio={(codigo) => { const b = businesses.find((x) => x.asistenteCodigoPublico === codigo); if (b) { setShowPedidos(false); openDetail(b.id); } }}
          onReclamar={(p) => setReclamosView({ pedido: p })}
          onVerReclamos={() => setReclamosView({})}
        />
      </div>
    );
  }

  /* ---- perfil público de una persona ---- */
  if (perfilVer) {
    return (
      <div style={{ fontFamily: "var(--fuente-texto)" }}>
        {globalStyle}
        <PerfilPublicoScreen usuario={perfilVer} onBack={() => setPerfilVer(null)} onAbrirNegocio={(id) => { setPerfilVer(null); openDetail(id); }} onAbrirOficio={(id) => { setPerfilVer(null); setOficioVer({ id }); }} onAbrirAlquiler={(id) => { setPerfilVer(null); setAlquilerVer({ id }); }} />
      </div>
    );
  }

  /* ---- vista ficha de negocio ---- */
  if (selected) {
    return (
      <div style={{ fontFamily: "var(--fuente-texto)" }}>
        {globalStyle}
        <BusinessDetail
          biz={selected} onBack={() => setSelectedId(null)} onOpenPhoto={setLightboxSrc} onAddReview={addReview}
          onReplyReview={replyToReview} miUsuario={usuario?.usuario} esDueño={misIds.has(selected.id)}
          onOpenChat={abrirChat} isFavorite={favorites.includes(selected.id)} onToggleFavorite={toggleFavorite}
          rank={businessRankPosition(selected, businesses)}
          onTrack={trackEvento}
          onOpenPuntos={(codigoPublico) => setPuntosView({ codigoPublico })}
          onOpenPerfil={setPerfilVer}
        />
        {lightboxSrc && <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
      </div>
    );
  }

  /* ---- vista pública: listado ---- */
  return (
    <div style={{ backgroundColor: "#F3F5FA", minHeight: "100dvh", fontFamily: "var(--fuente-texto)" }}>
      {globalStyle}

      {errorMsg && (
        <div className="px-4 py-2 text-center text-sm font-medium" style={{ background: "#FDF1EF", color: "#9A3B34" }}>
          {errorMsg} <button onClick={() => setErrorMsg(null)} className="underline ml-2">cerrar</button>
        </div>
      )}

      <RecordatoriosToast
        lista={recordatoriosAgenda}
        onCerrar={(id) => setRecordatoriosAgenda((l) => l.filter((r) => r.id !== id))}
        onAbrir={(r) => { setRecordatoriosAgenda((l) => l.filter((x) => x.id !== r.id)); setShowAgenda(true); }}
      />
      {avisoOk && (
        <div className="px-4 py-2 text-center text-sm font-medium" style={{ background: "#E4F3EA", color: "#1E6B44" }}>
          {avisoOk} <button onClick={() => setAvisoOk(null)} className="underline ml-2">cerrar</button>
        </div>
      )}
      {activeTab === "inicio" && (() => {
        // aviso fijo cuando falta pagar, quedan 7 días o menos, o ya venció
        const inf = infoSuscripcion(ownerBiz);
        if (!inf || inf.estado === "activa") return null;
        const texto = inf.estado === "pendiente" ? "Tu negocio todavía no se muestra: activalo con tu mes gratis o un plan."
          : inf.estado === "vencida" ? "Tu suscripción venció y tu negocio ya no se muestra."
          : inf.dias === 0 ? "Tu suscripción vence hoy." : inf.dias === 1 ? "Tu suscripción vence mañana." : `Tu suscripción vence en ${inf.dias} días.`;
        const urgente = inf.estado === "vencida" || (inf.dias !== null && inf.dias <= 3);
        return (
          <div className="px-4 py-2 flex items-center justify-center gap-3 flex-wrap text-sm font-medium" style={{ background: urgente ? "#FDF1EF" : "#FBEBD1", color: urgente ? "#9A3B34" : "#8A5B12" }}>
            <span>{texto}</span>
            <button onClick={abrirAgregarMeses} className="text-xs font-semibold px-3 py-1" style={{ borderRadius: 20, background: urgente ? "#9A3B34" : "#8A5B12", color: "#fff" }}>
              {inf.estado === "pendiente" ? "Activar ahora" : inf.estado === "vencida" ? "Renovar" : "Agregar meses"}
            </button>
          </div>
        );
      })()}

      {/* avisos emergentes: llegó algo nuevo (igual que en Mi Asistente) */}
      {avisosNuevos.length > 0 && (
        <div className="fixed left-0 right-0 z-[60] flex flex-col items-center gap-2 px-3 pointer-events-none" style={{ top: "calc(10px + env(safe-area-inset-top, 0px))" }}>
          {avisosNuevos.map((n) => {
            const t = NOTIF_TIPOS[n.tipo] || NOTIF_TIPOS.pedido; const TI = t.Icon;
            return (
              <button key={n.id} onClick={() => { setAvisosNuevos([]); setShowNotificaciones(true); }} className="pointer-events-auto w-full max-w-sm flex items-center gap-3 px-3.5 py-3 text-left" data-conservar-color
                style={{ borderRadius: 16, background: "var(--azul-oscuro)", color: "#fff", boxShadow: "0 12px 30px rgba(5,20,45,.4)", animation: "zona-subir .35s cubic-bezier(0.22,1,0.36,1) both" }}>
                <span className="flex items-center justify-center shrink-0" style={{ width: 36, height: 36, borderRadius: 12, background: "rgba(255,255,255,.14)" }}><TI size={18} color="#fff" /></span>
                <span className="flex-1 min-w-0 leading-tight"><strong className="block text-sm truncate">{n.titulo}</strong><span className="block text-xs mt-0.5 truncate" style={{ color: "var(--azul-palido)" }}>{n.descripcion}</span></span>
              </button>
            );
          })}
        </div>
      )}

      {/* la cabecera (menú, buscador, zona y categorías) se ve solo en Inicio */}
      {activeTab === "inicio" ? (
        <PublicHeader
          zone={zone} setZone={setZone} query={query} setQuery={setQuery}
          activeCat={activeCat} setActiveCat={setActiveCat}
          onOpenAllCats={() => setShowAllCats(true)}
          modo={modo} onCambiarModo={cambiarModo}
          catFicha={modo === "alquileres" ? catAlquiler : rubroOficio} onCatFicha={modo === "alquileres" ? (id) => { setCatAlquiler(id); setTipoAlquiler(""); } : setRubroOficio}
          tipoFicha={tipoAlquiler} onTipoFicha={setTipoAlquiler}
          onOpenOwner={() => (esDueno ? irATab("negocio") : irATab("herramientas"))}
          onHerramientas={() => irATab(esDueno ? "ajustes" : "herramientas")}
          esDueno={esDueno}
          usuario={usuario} onCerrarSesion={() => setConfirmarSalida(true)}
          onAjustes={() => irATab("ajustes")}
          onAyuda={() => { irATab("ajustes"); setSubAjustes("ayuda"); }}
          onSoporte={() => { irATab("ajustes"); setSubAjustes("soporte"); }}
          notifSinLeer={notifSinLeer} campanaSacude={campanaSacude}
          onOpenNotificaciones={() => setShowNotificaciones(true)}
        />
      ) : (subAjustes || (activeTab === "negocio" && negocioSel)) ? null : (
        <BarraTitulo
          titulo={activeTab === "chats" ? "Chats" : activeTab === "comunidad" ? "Comunidad" : activeTab === "negocio" ? "Negocio" : activeTab === "herramientas" ? "Herramientas" : "Ajustes"}
          sub={activeTab === "chats" ? "Tus conversaciones con negocios" : activeTab === "comunidad" ? "Lo que pasa en tu zona" : activeTab === "negocio" ? "Todo lo que ofrecés, en un solo lugar" : activeTab === "herramientas" ? "Todo lo que necesitás en Mi Zona" : "Configurá tu cuenta y preferencias"}
          notifSinLeer={notifSinLeer}
          onOpenNotificaciones={() => setShowNotificaciones(true)}
          buscador={activeTab === "chats" ? { valor: chatQuery, onChange: setChatQuery, placeholder: "Buscar chats..." } : undefined}
        />
      )}

      {showAllCats && <CategoryModal activeCat={activeCat} onSelect={(id) => { setActiveCat(id); setShowAllCats(false); }} onClose={() => setShowAllCats(false)} />}
      {confirmarSalida && (
        <ConfirmModal
          title="¿Cerrar sesión?"
          message={`Vas a salir de ${usuario?.email || "tu cuenta"}. Podés volver a entrar cuando quieras.`}
          confirmLabel="Cerrar sesión" danger
          onConfirm={() => { setConfirmarSalida(false); cerrarSesion(); }}
          onCancel={() => setConfirmarSalida(false)}
        />
      )}
      {showLogin && <LoginModal onClose={() => setShowLogin(null)} onLogged={alIniciarSesion} />}
      {nombrePendiente && (
        <NombreModal
          sugerido={nombrePendiente.sugerido}
          onGuardado={(u) => { const d = nombrePendiente.despues; setUsuario(u); setNombrePendiente(null); continuarDespues(d); }}
        />
      )}
      {planesModal && (
        <ActivarFichaModal
          key={`${planesModal.tipo}-${planesModal.fichaId || "nuevo"}-${planesModal.cubierto ? "c" : "n"}`}
          tipo={planesModal.tipo} nombre={planesModal.nombre} fichaId={planesModal.fichaId}
          vencimientoActual={planesModal.vencimiento} cubierto={!!planesModal.cubierto} hastaCubierto={planesModal.hasta}
          onCubierto={publicarCubierto} onClose={() => setPlanesModal(null)} onActivada={fichaActivada}
        />
      )}

      {/* Oficios y servicios + Mis fichas: pantallas completas encima de la principal (por debajo del formulario de negocio) */}
      {showFavoritos && (
        <div className="fixed inset-0 z-[72] overflow-y-auto" style={{ background: "#F3F5FA", fontFamily: "var(--fuente-texto)" }}>
          <FavoritosPantalla
            businesses={businesses} favorites={favorites} categoriasNegocio={CATEGORIES.map(({ id, label }) => ({ id, label }))}
            onToggleFavorite={toggleFavorite} onCompartirNegocio={shareBusiness} onVolver={() => setShowFavoritos(false)}
            onAbrirNegocio={(id) => { setShowFavoritos(false); openDetail(id); }}
            onAbrirOficio={(id) => setOficioVer({ id })} onAbrirAlquiler={(id) => setAlquilerVer({ id })}
          />
        </div>
      )}
      {buscador && (
        <div className="fixed inset-0 z-[72] overflow-y-auto" style={{ background: "#F3F5FA", fontFamily: "var(--fuente-texto)" }}>
          <BuscadorScreen
            usuario={usuario} inicial={buscador.inicial || ""} categoriasNegocio={CATEGORIES.map(({ id, label }) => ({ id, label }))}
            negocios={businesses.filter((b) => b.kind !== "job" && b.status === "active" && enListados(b) && b.zone === zone)}
            onVolver={() => setBuscador(null)}
            onAbrirNegocio={(id) => { setBuscador(null); openDetail(id); }}
            onAbrirOficio={(id, rubro) => setOficioVer({ id, rubro })} onAbrirAlquiler={(id) => setAlquilerVer({ id })}
            onPublicarNecesidad={comunidadHabilitada ? (q) => abrirPublicarComunidad("ayuda", q) : undefined}
          />
        </div>
      )}
      {comunidadVer && (
        <div className="fixed inset-0 z-[72] overflow-y-auto" style={{ background: "#F3F5FA", fontFamily: "var(--fuente-texto)" }}>
          <DetalleComunidad key={comunidadVer.id + comunidadVersion} id={comunidadVer.id} onVolver={() => setComunidadVer(null)} onEditar={(p) => setComunidadForm({ inicial: p, tipo: p.tipo })} onCambio={() => { setComunidadVersion((v) => v + 1); setFichasVersion((v) => v + 1); }} />
        </div>
      )}
      {comunidadForm && (
        <div className="fixed inset-0 z-[72] overflow-y-auto" style={{ background: "#F3F5FA", fontFamily: "var(--fuente-texto)" }}>
          <FormularioComunidad inicial={comunidadForm.inicial} tipoInicial={comunidadForm.tipo} tituloInicial={comunidadForm.titulo || ""} usuario={usuario} onCancelar={() => setComunidadForm(null)}
            onGuardado={(p, nueva) => { setComunidadForm(null); setComunidadVersion((v) => v + 1); setFichasVersion((v) => v + 1); if (nueva) setComunidadPublicada(p); }} />
        </div>
      )}
      {comunidadPublicada && (
        <div className="fixed inset-0 z-[72] overflow-y-auto" style={{ background: "#F3F5FA", fontFamily: "var(--fuente-texto)" }}>
          <PasoPublicado publicacion={comunidadPublicada} onVer={() => { setComunidadVer({ id: comunidadPublicada.id }); setComunidadPublicada(null); }} onListo={() => { setComunidadPublicada(null); irATab("comunidad"); }} />
        </div>
      )}
      {oficioVer && (
        <div className="fixed inset-0 z-[72] overflow-y-auto" style={{ background: "#F3F5FA", fontFamily: "var(--fuente-texto)" }}>
          <DetalleOficio key={oficioVer.id} id={oficioVer.id} rubroConsulta={oficioVer.rubro || ""} onVolver={() => setOficioVer(null)} onAbrirPerfil={(u) => { setOficioVer(null); setPerfilVer(u); }} />
        </div>
      )}
      {oficioForm && (
        <div className="fixed inset-0 z-[72] overflow-y-auto" style={{ background: "#F3F5FA", fontFamily: "var(--fuente-texto)" }}>
          <FormularioOficio
            inicial={oficioForm.inicial} usuario={usuario} onCancelar={() => setOficioForm(null)}
            onGuardado={(o, nueva) => { setOficioForm(null); setFichasVersion((v) => v + 1); if (nueva) setPlanesModal({ tipo: "oficio", nombre: o.nombre, fichaId: o.id, nuevo: true, ficha: o }); }}
          />
        </div>
      )}
      {oficioActivado && (
        <div className="fixed inset-0 z-[72] overflow-y-auto" style={{ background: "#F3F5FA", fontFamily: "var(--fuente-texto)" }}>
          <PasoOficioActivado oficio={oficioActivado} onVerFicha={() => setOficioVer({ id: oficioActivado.id })} onListo={() => { setOficioActivado(null); irANegocio(); }} />
        </div>
      )}

      {alquilerVer && (
        <div className="fixed inset-0 z-[72] overflow-y-auto" style={{ background: "#F3F5FA", fontFamily: "var(--fuente-texto)" }}>
          <DetalleAlquiler key={alquilerVer.id} id={alquilerVer.id} usuario={usuario} onVolver={() => setAlquilerVer(null)} onAbrirPerfil={(u) => { setAlquilerVer(null); setPerfilVer(u); }}
            onGestionar={() => { const idAlq = alquilerVer?.id; setAlquilerVer(null); irANegocio(idAlq ? { tipo: "alquiler", id: idAlq } : null); }} />
        </div>
      )}
      {alquilerForm && (
        <div className="fixed inset-0 z-[72] overflow-y-auto" style={{ background: "#F3F5FA", fontFamily: "var(--fuente-texto)" }}>
          <FormularioAlquiler
            inicial={alquilerForm.inicial} usuario={usuario} onCancelar={() => setAlquilerForm(null)}
            onGuardado={(a, nueva) => { setAlquilerForm(null); setFichasVersion((v) => v + 1); if (nueva) setPlanesModal({ tipo: "alquiler", nombre: a.nombre, fichaId: a.id, nuevo: true, ficha: a }); }}
          />
        </div>
      )}
      {alquilerActivado && (
        <div className="fixed inset-0 z-[72] overflow-y-auto" style={{ background: "#F3F5FA", fontFamily: "var(--fuente-texto)" }}>
          <PasoAlquilerActivado alquiler={alquilerActivado} onVerFicha={() => setAlquilerVer({ id: alquilerActivado.id })} onListo={() => { setAlquilerActivado(null); irANegocio(); }} />
        </div>
      )}

      {pasoNegocio && (
        <div className="fixed inset-0 z-[73] overflow-y-auto" style={{ background: "#F3F5FA", fontFamily: "var(--fuente-texto)" }}>
          <PasoNegocioActivado negocio={pasoNegocio} onListo={() => { setPasoNegocio(null); irANegocio(); }} />
        </div>
      )}

      {showEditOwnerBiz && bizEditando && (
        <BusinessForm
          publicMode
          initial={bizEditando}
          onSave={(data) => { persistOne(bizEditando.id, data); setShowEditOwnerBiz(false); setNegocioEditandoId(null); }}
          onCancel={() => { setShowEditOwnerBiz(false); setNegocioEditandoId(null); }}
          abrirMapa={setSelectorUbic}
        />
      )}

      {showAddSheet && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center sm:justify-center" style={{ background: "#0B143766" }} onClick={() => setShowAddSheet(false)}>
          <div className="bg-white w-full sm:max-w-sm p-5" style={{ borderRadius: "18px 18px 0 0", boxShadow: "0 -8px 30px #00000022" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ width: 40, height: 4, borderRadius: 4, background: "#E3E7F1", margin: "0 auto 16px" }} />
            <div className="flex items-center justify-between mb-4">
              <span style={{ fontFamily: "var(--fuente-titulo)", fontWeight: 600, fontSize: 17, color: "#0B1437" }}>¿Qué querés hacer?</span>
              <button onClick={() => setShowAddSheet(false)} aria-label="Cerrar" style={{ minWidth: 44, minHeight: 44, display: "inline-flex", alignItems: "center", justifyContent: "center" }}><X size={18} color="#5B6482" aria-hidden="true" /></button>
            </div>
            <button
              onClick={() => { setShowAddSheet(false); abrirAgregarNegocio(); }}
              className="w-full flex items-center gap-3 p-3.5 text-left"
              style={{ borderRadius: 12, border: "1px solid #E3E7F1", boxShadow: "0 2px 8px #0000000d" }}
            >
              <span className="flex items-center justify-center shrink-0" style={{ width: 42, height: 42, borderRadius: 12, background: "var(--azul-suave)" }}>
                <Building2 size={19} color="var(--azul)" />
              </span>
              <span>
                <span className="block text-sm font-semibold" style={{ color: "#0B1437" }}>Agregar mi negocio</span>
                <span className="block text-xs" style={{ color: "#5B6482" }}>Sumá tu negocio a Mi Zona y empezá a recibir clientes.</span>
              </span>
            </button>
            <button
              onClick={() => { setShowAddSheet(false); abrirOfrecerOficio(); }}
              className="w-full flex items-center gap-3 p-3.5 text-left mt-3"
              style={{ borderRadius: 12, border: "1px solid #E3E7F1", boxShadow: "0 2px 8px #0000000d" }}
            >
              <span className="flex items-center justify-center shrink-0" style={{ width: 42, height: 42, borderRadius: 12, background: "#FFE8C2" }}>
                <Wrench size={19} color="#8A5B12" />
              </span>
              <span>
                <span className="block text-sm font-semibold" style={{ color: "#0B1437" }}>Ofrecer mis servicios</span>
                <span className="block text-xs" style={{ color: "#5B6482" }}>Electricista, plomero, jardinero... armá tu ficha de oficios.</span>
              </span>
            </button>
            <button
              onClick={() => { setShowAddSheet(false); abrirOfrecerAlquiler(); }}
              className="w-full flex items-center gap-3 p-3.5 text-left mt-3"
              style={{ borderRadius: 12, border: "1px solid #E3E7F1", boxShadow: "0 2px 8px #0000000d" }}
            >
              <span className="flex items-center justify-center shrink-0" style={{ width: 42, height: 42, borderRadius: 12, background: "#E3E8FD" }}>
                <Home size={19} color="#2B3E9E" />
              </span>
              <span>
                <span className="block text-sm font-semibold" style={{ color: "#0B1437" }}>Ofrecer en alquiler</span>
                <span className="block text-xs" style={{ color: "#5B6482" }}>Casas, salones, sillas, herramientas... armá tu ficha con sus artículos.</span>
              </span>
            </button>
            {comunidadHabilitada && (
              <button
                onClick={() => { setShowAddSheet(false); abrirPublicarComunidad(null); }}
                className="w-full flex items-center gap-3 p-3.5 text-left mt-3"
                style={{ borderRadius: 12, border: "1px solid #E3E7F1", boxShadow: "0 2px 8px #0000000d" }}
              >
                <span className="flex items-center justify-center shrink-0" style={{ width: 42, height: 42, borderRadius: 12, background: "#DDF3EA" }}>
                  <Users size={19} color="#1E6B44" />
                </span>
                <span>
                  <span className="block text-sm font-semibold" style={{ color: "#0B1437" }}>Publicar en Comunidad</span>
                  <span className="block text-xs" style={{ color: "#5B6482" }}>Un aviso, algo perdido, un regalo, un evento... Es gratis.</span>
                </span>
              </button>
            )}
          </div>
        </div>
      )}

      {showAddBusiness && (
        <BusinessForm
          publicMode
          initial={emptyBusiness()}
          onSave={submitPublicBusiness}
          onCancel={() => { setShowAddBusiness(false); setBorrador(null); }}
          abrirMapa={setSelectorUbic}
        />
      )}

      {selectorUbic && (
        <SelectorUbicacion
          direccion={selectorUbic.direccion} zona={selectorUbic.zona} lat={selectorUbic.lat} lng={selectorUbic.lng}
          onCancelar={() => setSelectorUbic(null)}
          onConfirmar={(r) => { selectorUbic.alConfirmar(r); setSelectorUbic(null); }}
        />
      )}

      {addBusinessDone && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" style={{ background: "#0B1437cc" }} onClick={() => setAddBusinessDone(null)}>
          <div className="bg-white w-full max-w-sm p-6 text-center" style={{ borderRadius: 12 }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-center mx-auto mb-3" style={{ width: 48, height: 48, borderRadius: "50%", background: "#E4F3EA" }}>
              <Check size={24} color="#1E6B44" />
            </div>
            <h2 style={{ fontFamily: "var(--fuente-titulo)", fontWeight: 600, fontSize: 18, color: "#0B1437" }} className="mb-2">¡Tu negocio ya está publicado!</h2>
            <p className="text-sm mb-5" style={{ color: "#2B3768" }}>
              Como ya pagaste Mi Asistente con esta cuenta de Google, no pagás Mi Zona{addBusinessDone.hasta ? `: tu negocio queda activo hasta el ${fmtDate(addBusinessDone.hasta)}` : ""}. Lo administrás desde la pestaña Negocio.
            </p>
                        <button onClick={() => { const n = addBusinessDone.negocio; setAddBusinessDone(null); if (n) setPasoNegocio(n); }} className="w-full text-sm font-semibold py-3" style={{ backgroundColor: "var(--azul)", color: "#fff", borderRadius: 10 }}>
              Entendido
            </button>
          </div>
        </div>
      )}

      {usuario && suspension && !suspensionDescartada && (
        suspensionVista === "avisos" ? (
          <div className="fixed inset-0 z-[91] overflow-y-auto" style={{ background: "#F3F5FA" }}>
            <AvisosEquipoScreen onBack={() => setSuspensionVista(null)} />
          </div>
        ) : (
          <PantallaSuspension suspension={suspension}
            onVerAvisos={() => setSuspensionVista("avisos")}
            onPrivacidad={() => { setSuspensionDescartada(true); irATab("ajustes"); setSubAjustes("privacidad"); }}
            onCerrarSesion={() => { setSuspensionDescartada(true); setConfirmarSalida(true); }} />
        )
      )}
      {usuario && !suspension && <AvisoDelEquipo usuario={usuario} onVerAvisos={() => { irATab("ajustes"); setSubAjustes("avisos"); }} />}

      <main className="max-w-6xl mx-auto px-4 py-6" style={{ paddingBottom: "calc(160px + env(safe-area-inset-bottom, 0px))" }}>
        {activeTab === "ajustes" ? (
          <AjustesScreen
            sub={subAjustes} setSub={setSubAjustes}
            usuario={usuario}
            negocios={businesses} esDueno={esDueno} onOpenPedidos={() => setShowPedidos(true)} onOpenPuntos={() => setPuntosView({})} onOpenRanking={() => setShowRanking(true)} onAbrirNegocio={openDetail} onAbrirFavoritos={() => setShowFavoritos(true)} onAbrirMisFichas={() => irANegocio()}
            onLogin={(modo) => abrirLogin(null, null, modo || "login")}
            onLogged={alIniciarSesion}
            onUsuarioActualizado={setUsuario}
            onVerPerfil={setPerfilVer}
            onCerrarSesion={() => setConfirmarSalida(true)}
            onBorrarDatosLocales={() => {
              borrarDatosLocales(); // también se borró el token: la sesión de este dispositivo queda cerrada
              setUsuario(null);
              misNegociosRef.current = [];
              setMisNegocios([]);
              setShowEditOwnerBiz(false);
            }}
            onBorrarVistos={() => { try { localStorage.removeItem("miZonaVistosRecientemente"); } catch { /* sin almacenamiento */ } borrarVistosFichas(); setVistosIds([]); setOnlyVistos(false); }}
            onCuentaEliminada={async () => {
              // la cuenta ya se borró en el servidor: se limpia este dispositivo y se vuelve al inicio
              try { await desactivarPush(); } catch { /* no había push activo */ }
              borrarDatosLocales();
              setUsuario(null);
              misNegociosRef.current = [];
              setMisNegocios([]);
              setShowEditOwnerBiz(false);
              setSubAjustes(null);
              try { setBusinesses(await loadBusinesses()); } catch { /* se queda la lista que ya estaba */ }
            }}
          />
        ) : activeTab === "chats" ? (
          <ChatsScreen
            businesses={businesses}
            onOpenChat={abrirChat}
            onIrInicio={() => irATab("inicio")}
            comunidadHabilitada={comunidadHabilitada}
            onAbrirComunidad={abrirComunidad}
            query={chatQuery}
          />
        ) : activeTab === "comunidad" ? (
          comunidadHabilitada !== false ? (
            <>
              <BotonVolver texto="Volver a Chats" onClick={() => irATab("chats")} />
              <ComunidadScreen
                modoTab usuario={usuario} refrescarKey={comunidadVersion} onVolver={() => irATab("chats")} onAbrir={(id) => setComunidadVer({ id })}
                onPublicar={(t) => abrirPublicarComunidad(t)} onEditar={(p) => setComunidadForm({ inicial: p, tipo: p.tipo })}
              />
            </>
          ) : (
            <>
              <BotonVolver texto="Volver a Chats" onClick={() => irATab("chats")} />
              <EstadoVacio icono={Users} titulo="Comunidad llega muy pronto" mensaje="Va a ser el lugar donde los vecinos de tu zona publiquen fichas: avisos, perdidos, regalos, eventos y más." />
            </>
          )
        ) : activeTab === "negocio" ? (
          <NegocioScreen
            key={fichasVersion}
            negocios={negociosPropios} sel={negocioSel} setSel={(x) => { setNegocioSel(x); setSubNegocio(null); window.scrollTo(0, 0); }}
            catInfo={catInfo} onResumen={setFichasResumen} onAgregar={() => setShowAddSheet(true)}
            onAgenda={ownerBizId ? () => { setShowAgenda(true); window.scrollTo(0, 0); } : undefined}
            onPedidos={() => setShowPedidos(true)} onFavoritos={() => setShowFavoritos(true)} onPuntos={() => setPuntosView({})} onRanking={() => setShowRanking(true)}
            onEliminarNegocio={eliminarNegocioPropio}
            onVerOficio={(id) => setOficioVer({ id })} onEditarOficio={(o) => setOficioForm({ inicial: o })}
            onVerAlquiler={(id) => setAlquilerVer({ id })} onEditarAlquiler={(a) => setAlquilerForm({ inicial: a })}
            onActivar={activarFicha}
            renderNegocio={(n, ctx) => (
              <PanelNegocio
                biz={n} ctx={ctx} sub={subNegocio} setSub={setSubNegocio}
                onEditar={() => { setNegocioEditandoId(n.id); setShowEditOwnerBiz(true); }}
                onVerPerfil={() => openDetail(n.id)}
                onAgregarMeses={() => abrirAgregarMesesDe(n)}
                onGuardarEmpleo={(datos) => persistOne(n.id, { ...n, busquedaEmpleo: datos })}
                onSubirHistoria={(url) => {
                  const hace48h = Date.now() - 48 * 60 * 60 * 1000;
                  const historiasVigentes = (n.historias || []).filter((h) => new Date(h.subidaEn).getTime() > hace48h);
                  persistOne(n.id, { ...n, historias: [...historiasVigentes, { id: uid(), url, subidaEn: new Date().toISOString() }] });
                }}
                onSaveDiscount={(d) => saveOwnerDiscount(n.id, d)}
                onToggleDiscount={(did) => toggleOwnerDiscount(n.id, did)}
                onDeleteDiscount={(did) => deleteOwnerDiscount(n.id, did)}
              />
            )}
          />
        ) : activeTab === "herramientas" ? (
          <HerramientasScreen
            onOpenRanking={() => setShowRanking(true)}
            onOpenPuntos={() => setPuntosView({})}
            onOpenFavoritos={() => setShowFavoritos(true)}
            onOpenPedidos={() => setShowPedidos(true)}
          />
        ) : modo !== "negocios" ? (
          <ListaInicio
            modo={modo} zone={zone} query={query} cat={modo === "alquileres" ? catAlquiler : rubroOficio} tipo={tipoAlquiler} onTipo={setTipoAlquiler}
            onAbrirAlquiler={(id) => setAlquilerVer({ id })} onAbrirOficio={(id) => setOficioVer({ id })}
          />
        ) : (
        <>
        <div className="flex justify-end mb-3">
          <button
            onClick={() => {
              // el mapa se abre con los mismos filtros que ya elegiste acá
              setMapaFiltros({ cat: activeCat, abiertos: onlyOpen, favoritos: onlyFavorites, nuevos: onlyNuevos, promos: sortBy === "descuentos" });
              setShowMapa(true);
            }}
            className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 shrink-0"
            style={{ borderRadius: 20, background: "radial-gradient(420px 220px at 105% -20%, rgba(var(--azul-brillo-rgb),.55), transparent 60%), radial-gradient(260px 160px at -10% 120%, rgba(var(--azul-claro-rgb),.22), transparent 60%), var(--azul-oscuro)", color: "#fff", boxShadow: "0 6px 14px rgba(11,20,55,.28)" }}
          >
            <MapIcon size={13} /> Ver en el mapa
          </button>
        </div>
        <div>
          <div className="flex items-center justify-between gap-3 mb-2.5">
            <p style={{ fontFamily: "var(--fuente-titulo)", fontWeight: 600, fontSize: 15, color: "#0B1437" }}>
              {filtered.length} {filtered.length === 1 ? "negocio" : "negocios"} <span style={{ fontWeight: 500, color: "#5B6482" }}>en {zone}</span>
            </p>
          </div>
          <BarraFiltros
            orden={{ opciones: ORDEN_OPCIONES, valor: sortBy, onChange: setSortBy }}
            pildoras={[
              ...(onlyFavorites ? [{ id: "favoritos", texto: "Solo favoritos", activo: true, peligro: true, cerrar: true, onClick: () => setOnlyFavorites(false), icono: <Heart size={14} fill="#9A3B34" /> }] : []),
              { id: "abiertos", activo: onlyOpen, onClick: () => setOnlyOpen((v) => !v), texto: "Abiertos", verde: true, icono: <span className="rounded-full" style={{ width: 8, height: 8, backgroundColor: onlyOpen ? "#2C9A5F" : "#B9BCC5" }} /> },
              { id: "vistos", activo: onlyVistos, onClick: () => setOnlyVistos((v) => !v), texto: "Vistos", icono: <Clock size={14} /> },
              { id: "nuevos", activo: onlyNuevos, onClick: () => setOnlyNuevos((v) => !v), texto: "Nuevos", verde: true, icono: <Sparkles size={14} /> },
              { id: "empleo", activo: onlyEmpleo, onClick: () => setOnlyEmpleo((v) => !v), texto: "Busca personal", icono: <Briefcase size={14} /> },
            ]}
          />
        </div>

        {sortBy === "cercanos" && locStatus === "idle" && (
          <div className="flex items-center justify-between gap-3 mb-4 px-4 py-3" style={{ background: "var(--azul-suave)", borderRadius: 10 }}>
            <p className="text-sm" style={{ color: "#0B1437" }}>Activá tu ubicación para ver qué negocios tenés más cerca.</p>
            <button
              onClick={requestLocation}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 shrink-0"
              style={{ borderRadius: 8, backgroundColor: "#0B1437", color: "#fff" }}
            >
              <LocateFixed size={14} /> Activar ubicación
            </button>
          </div>
        )}
        {sortBy === "cercanos" && locStatus === "loading" && (
          <p className="text-xs mb-4" style={{ color: "#2B3768" }}>Ubicándote para ordenar por cercanía...</p>
        )}
        {sortBy === "cercanos" && locStatus === "denied" && (
          <div className="flex items-center justify-between gap-3 mb-4 px-4 py-3 flex-wrap" style={{ background: "#FDF1EF", borderRadius: 10 }}>
            <p className="text-sm" style={{ color: "#9A3B34" }}>
              Rechazaste el permiso de ubicación. Para usar "Más cercanos" habilitalo desde el ícono de candado/ubicación en la barra del navegador, y tocá reintentar.
            </p>
            <button onClick={requestLocation} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 shrink-0" style={{ borderRadius: 8, backgroundColor: "#9A3B34", color: "#fff" }}>
              <LocateFixed size={14} /> Reintentar
            </button>
          </div>
        )}
        {sortBy === "cercanos" && locStatus === "error" && (
          <p className="text-xs mb-4 px-3 py-2" style={{ background: "#FDF1EF", color: "#9A3B34", borderRadius: 8 }}>
            Tu navegador no permite obtener la ubicación. Te mostramos el orden habitual.
          </p>
        )}

        {filtered.length === 0 ? (
          <div className="text-center py-16" style={{ color: "#5B6482" }}>
            <p className="mb-1" style={{ fontFamily: "var(--fuente-titulo)", fontSize: 19, color: "#0B1437" }}>
              {businesses.length === 0 ? "Todavía no hay negocios cargados" : onlyVistos && vistosIds.length === 0 ? "Todavía no viste ningún negocio" : `No hay resultados en ${zone}`}
            </p>
            <p className="text-sm">
              {businesses.length === 0 ? `Sé el primero: sumá tu negocio desde la pestaña ${esDueno ? "Negocio" : "Herramientas"}.` : "Probá con otra categoría, otra búsqueda, o cambiá de zona."}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((biz) => (
              <BusinessCard
                key={biz.id} biz={biz} onOpen={openDetail} onOpenPhoto={setLightboxSrc}
                distanceKm={sortBy === "cercanos" && userLoc && biz.lat && biz.lng ? haversineKm(userLoc.lat, userLoc.lng, biz.lat, biz.lng) : undefined}
                rank={businessRankPosition(biz, businesses)}
                isFavorite={favorites.includes(biz.id)} onToggleFavorite={toggleFavorite}
                onTrack={trackEvento}
              />
            ))}
          </div>
        )}
        </>
        )}
      </main>

      {activeTab === "inicio" && (
      <button
        onClick={() => setShowBusquedaAsistente(true)}
        className="fixed z-40 flex items-center justify-center"
        style={{
          right: 16, bottom: "calc(98px + env(safe-area-inset-bottom, 0px))", width: 54, height: 54, borderRadius: "50%",
          background: "linear-gradient(135deg, var(--azul), var(--azul-claro))",
          boxShadow: "0 8px 20px rgba(var(--azul-rgb),0.45)",
        }}
        aria-label="Buscar con el asistente"
      >
        <Search size={22} color="#fff" />
      </button>
      )}

      <BottomNav
        active={activeTab}
        mostrarNegocio={esDueno}
        onInicio={() => { irATab("inicio"); setActiveCat(null); setSortBy("destacados"); setOnlyFavorites(false); }}
        onChats={() => irATab("chats")}
        onAdd={() => setShowAddSheet(true)}
        onNegocio={() => irATab("negocio")}
        onHerramientas={() => irATab("herramientas")}
        onAjustes={() => irATab("ajustes")}
        chatsSinLeer={countUnreadChats()}
      />

      {lightboxSrc && <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
    </div>
  );
}

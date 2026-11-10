// Pantallas de Herramientas y de Ajustes.
// (Salió de App.jsx sin cambiar su comportamiento.)
import { useEffect, useState } from "react";
import { Bell, BookOpen, ChevronDown, Coins, Heart, Info, Lock, LogOut, MessageCircle, Package, Send, ShieldAlert, ShieldCheck, Trophy, User, UserX } from "lucide-react";
import { useApariencia } from "../apariencia.js";
import { AparienciaScreen } from "../apariencia.jsx";
import { AcercaScreen, AyudaScreen, SoporteScreen } from "../ayuda.jsx";
import { MiCuentaScreen, NotificacionesPushScreen, SeguridadScreen } from "../cuenta.jsx";
import { AvisosEquipoScreen, BloqueadosScreen, ReglasScreen } from "../denuncias.jsx";
import { PrivacidadScreen } from "../privacidad.jsx";
import { getAllConversationIds, getFavorites, getRecentlyViewed, getSearchHistory } from "./almacen.js";
import { IconoSolLuna } from "./piezas.jsx";

// Herramientas (pestaña para quien todavía no tiene un negocio, oficio o alquiler): lo de cliente.
// Sumar algo propio se hace con el botón «+» de la barra de abajo. Cuando la cuenta ya tiene alguno, la pestaña pasa a ser «Negocio»
// y estas mismas herramientas aparecen dentro de «Negocio» (no en Ajustes).
export function HerramientasScreen({ onOpenRanking, onOpenFavoritos, onOpenPedidos, onOpenPuntos }) {
  const Tool = ({ Icon, bg, title, desc, onClick }) => (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3.5 p-3.5 text-left bg-white mb-2.5 transition-shadow hover:shadow-lg"
      style={{ borderRadius: 18, border: "1px solid #E3E7F1", boxShadow: "0 4px 16px rgba(11,20,55,0.06)", minHeight: 72 }}
    >
      <span className="flex items-center justify-center shrink-0" style={{ width: 44, height: 44, borderRadius: 14, background: bg, boxShadow: `inset 0 1px 0 rgba(255,255,255,.3), 0 6px 14px ${bg}55` }}>
        <Icon size={20} color="#fff" />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-semibold" style={{ color: "#0B1437", fontFamily: "var(--fuente-titulo)" }}>{title}</span>
        <span className="block text-xs mt-0.5" style={{ color: "#5B6482" }}>{desc}</span>
      </span>
      <ChevronDown size={15} color="#B9BCC5" style={{ transform: "rotate(-90deg)" }} />
    </button>
  );
  const Titulo = ({ children, sub }) => (
    <div className="mb-3 mt-6 first:mt-0">
      <p style={{ fontFamily: "var(--fuente-titulo)", fontWeight: 600, fontSize: 15, color: "#0B1437" }}>{children}</p>
      {sub && <p className="text-xs" style={{ color: "#5B6482" }}>{sub}</p>}
    </div>
  );
  return (
    <div>
      <Titulo>Para vos</Titulo>
      <Tool Icon={Package} bg="#2350F5" title="Mis pedidos" desc="Seguí el estado de lo que pediste." onClick={onOpenPedidos} />
      <Tool Icon={Heart} bg="#E5484D" title="Favoritos" desc="Lo que guardaste." onClick={onOpenFavoritos} />
      <Tool Icon={Coins} bg="#F59E0B" title="Mis puntos" desc="Tus puntos por negocio, recompensas y canjes." onClick={onOpenPuntos} />
      <Tool Icon={Trophy} bg="#8B5CF6" title="Ranking" desc="Los negocios más destacados de tu zona." onClick={onOpenRanking} />
    </div>
  );
}

export function AjustesScreen({ sub, setSub, usuario, negocios, esDueno, onOpenPedidos, onOpenPuntos, onOpenRanking, onAbrirNegocio, onAbrirFavoritos, onAbrirMisFichas, onLogin, onLogged, onUsuarioActualizado, onCerrarSesion, onBorrarDatosLocales, onBorrarVistos, onCuentaEliminada, onVerPerfil }) {
  const tema = useApariencia().tema;
  // al cerrar sesión se vuelve a la lista de Ajustes (en vez de quedar en "Mi cuenta")
  useEffect(() => { if (!usuario && sub === "cuenta") setSub(null); }, [usuario?.id]);
  // Ayuda y Soporte se mandan entre sí (por ejemplo, "No me sirvió" → escribir a Soporte con el tema ya elegido)
  const [soporteCtx, setSoporteCtx] = useState({ tema: null, directo: false, desde: null });
  const irSoporte = (tema, desde, directo) => { setSoporteCtx({ tema: tema || null, directo: !!directo, desde: desde || null }); setSub("soporte"); };

  const TONOS = {
    azul: { bg: "linear-gradient(180deg,#EEF4FF,#DCE8FD)", fg: "var(--azul)", aro: "#D3E1FA" },
    violeta: { bg: "linear-gradient(180deg,#F5EFFE,#E8DDFB)", fg: "#7A4FD6", aro: "#E0D2F8" },
    verde: { bg: "linear-gradient(180deg,#E9F8F0,#D4F0E1)", fg: "#1E8A55", aro: "#C3E8D3" },
    naranja: { bg: "linear-gradient(180deg,#FFF5E3,#FFE8C2)", fg: "#E08A12", aro: "#FADFAE" },
    rojo: { bg: "linear-gradient(180deg,#FEEFED,#FADBD7)", fg: "#D9423A", aro: "#F5C6C1" },
    agua: { bg: "linear-gradient(180deg,#E4F7F6,#CCEEEC)", fg: "#13897F", aro: "#BDE6E3" },
  };
  const Row = ({ Icon, title, desc, onClick, danger = false, badge, disabled = false, tono = "azul" }) => {
    const t = TONOS[danger ? "rojo" : tono];
    return (
    <button
      onClick={onClick} disabled={disabled}
      className="w-full flex items-center gap-3.5 px-4 py-3.5 text-left bg-white hover:bg-slate-50"
      style={{ borderBottom: "1px solid #EEF0F6", opacity: disabled ? 0.55 : 1 }}
    >
      <span className="flex items-center justify-center shrink-0" style={{ width: 46, height: 46, borderRadius: 15, background: t.bg, boxShadow: `inset 0 0 0 1px ${t.aro}` }}>
        <Icon size={21} color={t.fg} />
      </span>
      <span className="flex-1 min-w-0">
        <span className="flex items-center gap-2">
          <span className="text-sm font-medium" style={{ color: danger ? "#9A3B34" : "#0B1437" }}>{title}</span>
          {badge && <span className="text-[10px] font-semibold px-1.5 py-0.5" style={{ background: "#F5F1E6", color: "#8A5B12", borderRadius: 6 }}>{badge}</span>}
        </span>
        {desc && <span className="block text-[13px] mt-0.5" style={{ color: "#5B6482", lineHeight: 1.4 }}>{desc}</span>}
      </span>
      <ChevronDown size={16} color="#B9C0D6" style={{ transform: "rotate(-90deg)" }} />
    </button>
    );
  };
  const SeccionAjustes = ({ Icon, children }) => (
    <div className="flex items-center gap-2.5 mb-2.5 px-0.5">
      <Icon size={19} color="#0B1437" />
      <span style={{ fontFamily: "var(--fuente-titulo)", fontWeight: 700, fontSize: 16, color: "#0B1437" }}>{children}</span>
      <span className="flex-1" style={{ height: 1, background: "#E3E7F1" }} />
    </div>
  );

  if (sub === "cuenta") {
    return (
      <MiCuentaScreen
        usuario={usuario} local={{ favoritos: getFavorites().length }} negocios={negocios} onAbrirNegocio={onAbrirNegocio} onAbrirFavoritos={onAbrirFavoritos} onAbrirMisFichas={onAbrirMisFichas} onBack={() => setSub(null)} onLogged={onLogged}
        onUsuarioActualizado={onUsuarioActualizado}
        onCerrarSesion={onCerrarSesion}
        onCuentaEliminada={onCuentaEliminada}
        onVerPerfil={onVerPerfil}
      />
    );
  }
  if (sub === "notificaciones") {
    return <NotificacionesPushScreen usuario={usuario} onBack={() => setSub(null)} onLogin={onLogin} />;
  }

  if (sub === "seguridad") {
    return <SeguridadScreen usuario={usuario} onBack={() => setSub(null)} onLogin={() => onLogin("login")} />;
  }

  if (sub === "apariencia") {
    return <AparienciaScreen onBack={() => setSub(null)} />;
  }

  if (sub === "privacidad") {
    return (
      <PrivacidadScreen
        usuario={usuario}
        onBack={() => setSub(null)}
        onLogin={() => onLogin("login")}
        onIrCuenta={() => setSub("cuenta")}
        onIrSeguridad={() => setSub("seguridad")}
        local={{ favoritos: getFavorites().length, chats: getAllConversationIds().length, vistos: getRecentlyViewed().length, busquedas: getSearchHistory().length }}
        onBorrarVistos={onBorrarVistos}
        onBorrarDatosLocales={onBorrarDatosLocales}
      />
    );
  }

  // Estas tres usan la misma cabecera de pantalla completa que Favoritos, Ranking, etc.: se dibujan encima de todo (no dentro del margen de la pestaña).
  // (función común y no un componente: si no, cada cambio en App las reiniciaría)
  const pantallaCompleta = (hijo) => (
    <div className="fixed inset-0 z-[72] overflow-y-auto" style={{ background: "#F3F5FA", fontFamily: "var(--fuente-texto)" }}>{hijo}</div>
  );
  if (sub === "avisos") return pantallaCompleta(<AvisosEquipoScreen onBack={() => setSub(null)} onVerReglas={() => setSub("reglas")} />);
  if (sub === "bloqueados") return pantallaCompleta(<BloqueadosScreen onBack={() => setSub(null)} />);
  if (sub === "reglas") return pantallaCompleta(<ReglasScreen onBack={() => setSub(null)} />);

  if (sub === "acerca") {
    return <AcercaScreen onBack={() => setSub(null)} onIrSoporte={() => irSoporte(null, "acerca", false)} />;
  }
  if (sub === "ayuda") {
    return <AyudaScreen onBack={() => setSub(null)} onContactar={(tema) => irSoporte(tema, "ayuda", true)} />;
  }
  if (sub === "soporte") {
    const desde = soporteCtx.desde;
    return (
      <SoporteScreen
        usuario={usuario} temaInicial={soporteCtx.tema} directo={soporteCtx.directo}
        textoVolver={desde === "acerca" ? "Volver a Acerca de Mi Zona" : desde === "ayuda" ? "Volver al Centro de ayuda" : "Volver a Ajustes"}
        onBack={() => { setSoporteCtx({ tema: null, directo: false, desde: null }); setSub(desde || null); }}
        onLogin={() => onLogin("login")}
        onIrAyuda={() => setSub("ayuda")}
      />
    );
  }

  return (
    <div>
      <SeccionAjustes Icon={User}>Cuenta y personalización</SeccionAjustes>
      <div className="overflow-hidden mb-6" style={{ borderRadius: 22, border: "1px solid #E3E7F1", boxShadow: "0 1px 2px rgba(11,20,55,.04)" }}>
        <Row Icon={User} tono="azul" title="Mi cuenta" desc={usuario ? (usuario.usuario ? `@${usuario.usuario}` : usuario.email) : "Iniciá sesión con Google para acceder"} onClick={() => setSub("cuenta")} />
        <Row Icon={Bell} tono="violeta" title="Notificaciones" desc="Qué avisos recibís, sonido y dispositivos" onClick={() => setSub("notificaciones")} />
        <Row Icon={ShieldCheck} tono="verde" title="Seguridad" desc="Contraseña, dispositivos y actividad de tu cuenta" onClick={() => setSub("seguridad")} />
        <Row Icon={IconoSolLuna} tono="naranja" title="Apariencia" desc={`Modo ${tema === "oscuro" ? "oscuro" : tema === "claro" ? "claro" : "automático"}`} onClick={() => setSub("apariencia")} />
        <Row Icon={Lock} tono="violeta" title="Privacidad" desc="Tus datos, controles de uso, descarga y eliminación" onClick={() => setSub("privacidad")} />
        {usuario && <Row Icon={ShieldAlert} tono="naranja" title="Avisos del equipo" desc="Advertencias, contenidos ocultos y cómo apelar" onClick={() => setSub("avisos")} />}
        {usuario && <Row Icon={UserX} tono="violeta" title="Usuarios bloqueados" desc="Personas que bloqueaste" onClick={() => setSub("bloqueados")} />}
        {usuario && <Row Icon={LogOut} title="Cerrar sesión" desc={`Salir de ${usuario.email}`} danger onClick={onCerrarSesion} />}
      </div>

      <SeccionAjustes Icon={Info}>Soporte y más</SeccionAjustes>
      <div className="overflow-hidden mb-4" style={{ borderRadius: 22, border: "1px solid #E3E7F1", boxShadow: "0 1px 2px rgba(11,20,55,.04)" }}>
        <Row Icon={BookOpen} tono="azul" title="Acerca de Mi Zona" desc="Versión, términos y privacidad" onClick={() => setSub("acerca")} />
        <Row Icon={MessageCircle} tono="agua" title="Centro de ayuda" desc="Respuestas a las dudas más comunes" onClick={() => setSub("ayuda")} />
        <Row Icon={BookOpen} tono="verde" title="Reglas de convivencia" desc="Cómo cuidamos Mi Zona entre todos" onClick={() => setSub("reglas")} />
        <Row Icon={Send} tono="violeta" title="Soporte" desc="Escribinos o mirá tus consultas" onClick={() => setSub("soporte")} />
      </div>
    </div>
  );
}

// Panel del dueño para un negocio.
// (Salió de App.jsx sin cambiar su comportamiento.)
import { useRef, useState } from "react";
import { Briefcase, ChevronRight, Download, Eye, Heart, Megaphone, MessageCircle, PartyPopper, Share2, Sparkles, Star, Store, Tag, Trash2 } from "lucide-react";
import { BotonVolver, TarjetaSuscripcion, infoSuscripcion } from "../cuenta.jsx";
import { TarjetaIdentidad } from "../negocio.jsx";
import { QrLocal } from "../qr.jsx";
import { uploadImage } from "../subirFoto.js";
import { countUnseenReviews } from "./almacen.js";
import { MI_ASISTENTE_ADMIN_URL, MI_ASISTENTE_URL } from "./constantes.js";
import { EmpleoFormModal, PromosSheet } from "./empleoPromos.jsx";
import { activeDiscounts, avgRating, busquedaEmpleoActiva, historiasActivas } from "./negocios.js";
import { SubPantalla } from "./piezas.jsx";
import { catInfo, fmtNum, shareBusiness, tinte } from "./utilidades.js";

// Panel de UN negocio propio (dentro de la pestaña «Negocio»): identidad, suscripción, números y todo para gestionarlo.
export function PanelNegocio({ biz, ctx, sub, setSub, onEditar, onVerPerfil, onAgregarMeses, onGuardarEmpleo, onSubirHistoria, onSaveDiscount, onToggleDiscount, onDeleteDiscount }) {
  const [subiendoHistoria, setSubiendoHistoria] = useState(false);
  const historiaInputRef = useRef(null);
  const handleSubirHistoria = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setSubiendoHistoria(true);
    try {
      const url = await uploadImage(file);
      onSubirHistoria(url);
    } catch {
      alert("No se pudo subir la imagen. Probá de nuevo.");
    } finally {
      setSubiendoHistoria(false);
    }
  };

  const Mosaico = ({ Icon, color, title, desc, onClick, badge }) => (
    <button
      onClick={onClick}
      className="relative text-left bg-white transition-all active:scale-[.98] flex flex-col"
      style={{ borderRadius: 20, border: "1px solid #edf0f8", boxShadow: "0 3px 12px rgba(15,22,55,.055)", padding: 16, minHeight: 132 }}
    >
      <span className="flex items-center justify-center mb-3" style={{ width: 44, height: 44, borderRadius: 14, background: tinte(color, 10) }}>
        <Icon size={21} color={color} />
      </span>
      {badge > 0 && (
        <span className="absolute flex items-center justify-center text-[10px] font-bold" style={{ top: 12, right: 12, minWidth: 20, height: 20, borderRadius: 10, background: "#E5484D", color: "#fff", padding: "0 5px" }}>
          {badge > 9 ? "9+" : badge}
        </span>
      )}
      <span className="block text-[15px] font-bold leading-tight" style={{ color: "#0B1437", fontFamily: "var(--fuente-titulo)" }}>{title}</span>
      <span className="block text-xs mt-1.5 leading-snug" style={{ color: "#5B6482", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{desc}</span>
    </button>
  );
  const Titulo = ({ children, sub: s }) => (
    <div className="mb-3 mt-7">
      <p style={{ fontFamily: "var(--fuente-titulo)", fontWeight: 800, fontSize: 17, color: "#0B1437", letterSpacing: "-0.01em" }}>{children}</p>
      {s && <p className="text-xs mt-0.5" style={{ color: "#5B6482" }}>{s}</p>}
    </div>
  );
  const Estadistica = ({ Icon, color, valor, etiqueta }) => (
    <div className="bg-white" style={{ borderRadius: 18, border: "1px solid #edf0f8", boxShadow: "0 3px 12px rgba(15,22,55,.055)", padding: 14 }}>
      <span className="flex items-center justify-center mb-2" style={{ width: 30, height: 30, borderRadius: 10, background: tinte(color, 10) }}><Icon size={15} color={color} /></span>
      <span className="block leading-none" style={{ fontFamily: "var(--fuente-titulo)", fontWeight: 700, fontSize: 20, color: "#0B1437" }}>{valor}</span>
      <span className="block text-[11px] mt-1" style={{ color: "#5B6482" }}>{etiqueta}</span>
    </div>
  );

  const c = catInfo(biz.cat);
  const inf = infoSuscripcion(biz);
  const estadoTexto = !inf ? "Activo" : inf.estado === "pendiente" ? "Falta pagar" : inf.estado === "vencida" ? "Vencida" : inf.estado === "por_vencer" ? "Por vencer" : "Activo";
  const estadoColor = !inf || inf.estado === "activa" ? { bg: "#E4F3EA", fg: "#1E6B44" } : inf.estado === "por_vencer" || inf.estado === "pendiente" ? { bg: "#FBEBD1", fg: "#8A5B12" } : { bg: "#FDF1EF", fg: "#9A3B34" };
  const rating = avgRating(biz.reviews);
  const promosVigentes = activeDiscounts(biz).length;
  const resenasSinVer = countUnseenReviews(biz);
  const tieneAsistente = !!biz.asistenteCodigoPublico && !!biz.asistenteActivo;
  const volverSub = () => setSub(null);

  if (sub === "promos") {
    return (
      <SubPantalla titulo="Mis promociones" desc="Aparecen en tu perfil y destacan tu negocio en la lista." onBack={volverSub} volverA="Mi negocio">
        <PromosSheet business={biz} onSave={onSaveDiscount} onToggle={onToggleDiscount} onDelete={onDeleteDiscount} />
      </SubPantalla>
    );
  }
  if (sub === "empleo") {
    return (
      <SubPantalla titulo="Búsqueda de personal" onBack={volverSub} volverA="Mi negocio">
        <EmpleoFormModal
          business={biz}
          onSave={(datos) => { onGuardarEmpleo(datos); setSub(null); }}
          onDelete={() => { onGuardarEmpleo(null); setSub(null); }}
        />
      </SubPantalla>
    );
  }
  if (sub === "qr") {
    return (
      <SubPantalla titulo="Compartir mi negocio" onBack={volverSub} volverA="Mi negocio">
        <div className="bg-white p-6 text-center" style={{ borderRadius: 24, border: "1px solid #E3E7F1" }}>
          <QrLocal
            texto={`${window.location.origin}${window.location.pathname}?negocio=${biz.id}`} tam={200} alt="Código QR de tu negocio"
            className="mx-auto mb-4" style={{ borderRadius: 14, border: "1px solid #E3E7F1" }}
          />
          <p className="text-xs mb-3" style={{ color: "#5B6482" }}>Los clientes que escaneen este código van a llegar directo al perfil de tu negocio en Mi Zona.</p>
          <button onClick={() => shareBusiness(biz)} className="w-full text-sm font-semibold py-3" style={{ background: "linear-gradient(135deg,var(--azul),var(--azul-medio))", color: "#fff", borderRadius: 14 }}>
            Compartir mi negocio
          </button>
        </div>
      </SubPantalla>
    );
  }

  return (
    <div>
      <BotonVolver texto="Volver a Negocio" onClick={ctx.volver} />
      <TarjetaIdentidad
        logo={biz.logo} icono={c?.icon || Store} color={c?.color || "var(--azul)"} titulo={biz.name} sub={`Negocio · ${c?.label || ""} · ${biz.zone}`}
        chip={<span className="inline-block text-[10px] font-bold px-2 py-0.5" style={{ borderRadius: 10, background: estadoColor.bg, color: estadoColor.fg }}>{estadoTexto}</span>}
        onVer={onVerPerfil}
      />

      <TarjetaSuscripcion negocio={biz} onAgregar={onAgregarMeses} />

      {/* números del negocio */}
      <div className="grid grid-cols-2 gap-3 mb-1">
        <Estadistica Icon={Eye} color="var(--azul)" valor={fmtNum(biz.views || 0)} etiqueta="Visitas a tu perfil" />
        <Estadistica Icon={Heart} color="#E5484D" valor={fmtNum(biz.vecesFavorito || 0)} etiqueta="Veces guardado en favoritos" />
        <Estadistica Icon={Star} color="#F5A623" valor={rating ? `${rating}` : "—"} etiqueta={`${biz.reviews?.length || 0} ${(biz.reviews?.length || 0) === 1 ? "reseña" : "reseñas"}`} />
        <Estadistica Icon={Tag} color="#B8703F" valor={promosVigentes} etiqueta={promosVigentes === 1 ? "promoción vigente" : "promociones vigentes"} />
      </div>

      <Titulo sub="Todo para controlar los datos de tu negocio">Gestionar mi negocio</Titulo>
      <div className="grid grid-cols-2 gap-3" style={{ gridAutoRows: "1fr" }}>
        <Mosaico Icon={Store} color="#1E8A55" title="Editar mis datos" desc="Nombre, fotos, horarios, dirección y contacto." onClick={onEditar} />
        <Mosaico Icon={Megaphone} color="#13897F" title="Promociones" desc={promosVigentes ? `${promosVigentes} vigente(s) ahora` : "Creá descuentos para atraer clientes."} onClick={() => setSub("promos")} />
        <Mosaico Icon={MessageCircle} color="#7A4FD6" title="Reseñas" desc="Leé y respondé lo que dicen tus clientes." onClick={onVerPerfil} badge={resenasSinVer} />
        <Mosaico Icon={PartyPopper} color="#2C9A5F" title="Subir historia" desc={subiendoHistoria ? "Subiendo..." : `${historiasActivas(biz).length} activa(s) ahora`} onClick={() => !subiendoHistoria && historiaInputRef.current?.click()} />
        <Mosaico Icon={Briefcase} color="#C97B4A" title="Buscar personal" desc={busquedaEmpleoActiva(biz) ? `Publicada: ${biz.busquedaEmpleo.puesto}` : "Publicá si necesitás sumar gente."} onClick={() => setSub("empleo")} />
        <Mosaico Icon={Share2} color="#7A4F9E" title="Compartir mi negocio" desc="Código QR, redes y WhatsApp." onClick={() => setSub("qr")} />
      </div>

      {/* Mi Asistente: una fila ancha propia (no es una baldosa más) */}
      <button type="button" onClick={() => window.open(tieneAsistente ? MI_ASISTENTE_ADMIN_URL : MI_ASISTENTE_URL, "_blank")} className="w-full flex items-center gap-3.5 text-left bg-white mt-3 active:scale-[.99] transition-all" style={{ borderRadius: 20, border: "1px solid #edf0f8", boxShadow: "0 3px 12px rgba(15,22,55,.055)", padding: 16, minHeight: 84 }}>
        <span className="flex items-center justify-center shrink-0" style={{ width: 48, height: 48, borderRadius: 15, background: "linear-gradient(135deg,#2b5bff,#1638c9)" }}>{tieneAsistente ? <Sparkles size={22} color="#fff" /> : <Download size={22} color="#fff" />}</span>
        <span className="flex-1 min-w-0">
          <span className="block text-[15px] font-bold leading-tight" style={{ color: "#0B1437", fontFamily: "var(--fuente-titulo)" }}>{tieneAsistente ? "Mi Asistente" : "Conseguir Mi Asistente"}</span>
          <span className="block text-xs mt-1" style={{ color: "#5B6482", lineHeight: 1.35 }}>{tieneAsistente ? "Clientes, pedidos, puntos y tu asistente virtual." : "Un asistente con IA que atiende a tus clientes."}</span>
        </span>
        <ChevronRight size={18} color="#B9C0D6" aria-hidden="true" />
      </button>

      {/* Eliminar: aparte y discreto, lejos de las acciones de todos los días */}
      <button type="button" onClick={ctx.eliminar} className="w-full flex items-center justify-center gap-2 text-sm font-semibold mt-8" style={{ minHeight: 48, borderRadius: 16, border: "1px solid #F5C6C1", background: "#FFF8F7", color: "#9A3B34" }}><Trash2 size={16} aria-hidden="true" /> Eliminar negocio</button>
      <p className="text-[11px] text-center mt-2" style={{ color: "#8D95B0" }}>Se borra para siempre.</p>
      <input ref={historiaInputRef} type="file" accept="image/*" className="hidden" onChange={handleSubirHistoria} />
    </div>
  );
}

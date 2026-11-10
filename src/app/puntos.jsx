// Puntos y recompensas del cliente.
// (Salió de App.jsx sin cambiar su comportamiento.)
import { useEffect, useRef, useState } from "react";
import { Check, Coins, Gift, Ticket, X } from "lucide-react";
import { BotonAtras } from "../cuenta.jsx";
import { QrLocal } from "../qr.jsx";
import { ConfirmModal } from "./piezas.jsx";
import { canjearRecompensaApi, fetchMisPuntos, fetchPuntosNegocio } from "./servidor.js";
import { catInfo, fmtFechaAR, fmtNum, fmtPesos, randomHex } from "./utilidades.js";

/* ---------- puntos y recompensas (cliente) ---------- */
// Cada negocio tiene su propio programa: los puntos de un negocio solo sirven en ese negocio.

function RecompensaCard({ r, onCanjear, canjeando }) {
  const progreso = Math.min(100, Math.round(((r.puntos - r.faltan) / r.puntos) * 100));
  const bloqueoTexto = r.bloqueo === "agotada" ? "Agotada" : r.bloqueo === "limite" ? "Ya canjeaste el máximo permitido" : null;
  return (
    <div className="bg-white p-4" style={{ borderRadius: 14, border: "1px solid #E3E7F1", boxShadow: "0 3px 12px rgba(11,20,55,0.06)", opacity: bloqueoTexto ? 0.75 : 1 }}>
      <div className="flex items-start gap-3">
        {r.imagen ? (
          <img src={r.imagen} alt="" loading="lazy" decoding="async" className="object-cover shrink-0" style={{ width: 56, height: 56, borderRadius: 12 }} />
        ) : (
          <span className="flex items-center justify-center shrink-0" style={{ width: 56, height: 56, borderRadius: 12, background: "#F3ECFC" }}>
            <Gift size={24} color="#7A4F9E" />
          </span>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold" style={{ color: "#0B1437" }}>{r.nombre}</p>
            <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 shrink-0" style={{ borderRadius: 20, background: "#FDF3DC", color: "#8A5B12" }}>
              <Coins size={11} /> {fmtNum(r.puntos)}
            </span>
          </div>
          {r.descripcion && <p className="text-xs mt-0.5" style={{ color: "#2B3768" }}>{r.descripcion}</p>}
        </div>
      </div>

      {(r.compraMinima > 0 || r.fechaVencimiento || r.cantidadDisponible !== null || r.limitePorCliente || r.condiciones) && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {r.compraMinima > 0 && <span className="text-[11px] px-2 py-0.5" style={{ borderRadius: 20, background: "#EEF0F6", color: "#2B3768" }}>Compra mínima {fmtPesos(r.compraMinima)}</span>}
          {r.fechaVencimiento && <span className="text-[11px] px-2 py-0.5" style={{ borderRadius: 20, background: "#EEF0F6", color: "#2B3768" }}>Canjeable hasta el {fmtFechaAR(r.fechaVencimiento)}</span>}
          {r.cantidadDisponible !== null && r.cantidadDisponible > 0 && <span className="text-[11px] px-2 py-0.5" style={{ borderRadius: 20, background: "#EEF0F6", color: "#2B3768" }}>Quedan {fmtNum(r.cantidadDisponible)}</span>}
          {r.limitePorCliente && <span className="text-[11px] px-2 py-0.5" style={{ borderRadius: 20, background: "#EEF0F6", color: "#2B3768" }}>Máx. {r.limitePorCliente} por persona</span>}
        </div>
      )}
      {r.condiciones && <p className="text-[11px] mt-2" style={{ color: "#5B6482" }}>Condiciones: {r.condiciones}</p>}

      <div className="mt-3.5">
        {bloqueoTexto ? (
          <p className="text-xs font-semibold" style={{ color: "#9A3B34" }}>{bloqueoTexto}</p>
        ) : r.puedeCanjear ? (
          <button
            onClick={() => onCanjear(r)} disabled={canjeando}
            className="w-full flex items-center justify-center gap-2 text-sm font-semibold py-2.5"
            style={{ backgroundColor: "var(--azul)", color: "#fff", borderRadius: 10, opacity: canjeando ? 0.6 : 1 }}
          >
            <Ticket size={16} /> Canjear por {fmtNum(r.puntos)} puntos
          </button>
        ) : (
          <>
            <div style={{ height: 7, borderRadius: 4, background: "#EEF0F6", overflow: "hidden" }}>
              <div style={{ width: `${progreso}%`, height: "100%", background: "linear-gradient(90deg, var(--azul), var(--azul-claro))", borderRadius: 4 }} />
            </div>
            <p className="text-xs mt-1.5" style={{ color: "#2B3768" }}>
              Te {r.faltan === 1 ? "falta" : "faltan"} <b>{fmtNum(r.faltan)} {r.faltan === 1 ? "punto" : "puntos"}</b>.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// Cupón de un canje: código único + QR para mostrarle al negocio
function CanjeModal({ canje, onClose }) {
  const usado = canje.estado === "utilizado";
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" style={{ background: "#0B1437cc" }} onClick={onClose}>
      <div className="bg-white w-full max-w-sm p-6 text-center" style={{ borderRadius: 16 }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <span style={{ fontFamily: "var(--fuente-titulo)", fontWeight: 600, fontSize: 16, color: "#0B1437" }}>Tu canje</span>
          <button onClick={onClose} aria-label="Cerrar" style={{ minWidth: 44, minHeight: 44, display: "inline-flex", alignItems: "center", justifyContent: "center" }}><X size={18} color="#5B6482" aria-hidden="true" /></button>
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 mb-3" style={{ borderRadius: 20, background: usado ? "#EEEDE7" : "#E4F3EA", color: usado ? "#5B6482" : "#1E6B44" }}>
          {usado ? <Check size={12} /> : <Ticket size={12} />} {usado ? "Ya utilizado" : "Listo para usar"}
        </span>
        <p className="text-base font-semibold" style={{ color: "#0B1437" }}>{canje.recompensa}</p>
        {canje.negocio && <p className="text-xs mb-3" style={{ color: "#5B6482" }}>{canje.negocio}</p>}
        {!usado && (
          <QrLocal
            texto={canje.codigo} tam={170} alt="Código QR del canje" className="mx-auto mb-3"
            style={{ borderRadius: 10, border: "1px solid #E3E7F1" }}
          />
        )}
        <p className="text-xl font-mono font-bold mb-1" style={{ color: usado ? "#64748B" : "#0B1437", letterSpacing: 1, textDecoration: usado ? "line-through" : "none" }}>{canje.codigo}</p>
        {usado ? (
          <p className="text-xs" style={{ color: "#5B6482" }}>Utilizado el {fmtFechaAR(canje.utilizadoEn)}. Este código ya no sirve.</p>
        ) : (
          <p className="text-xs" style={{ color: "#5B6482" }}>Mostrale este código al negocio para retirar tu recompensa. Se puede usar una sola vez.</p>
        )}
        {(canje.condiciones || canje.compraMinima > 0) && (
          <p className="text-[11px] mt-3 p-2.5 text-left" style={{ borderRadius: 8, background: "#F3F5FA", color: "#2B3768" }}>
            {canje.compraMinima > 0 && <>Compra mínima: {fmtPesos(canje.compraMinima)}. </>}
            {canje.condiciones && <>Condiciones: {canje.condiciones}</>}
          </p>
        )}
      </div>
    </div>
  );
}

export function PuntosScreen({ businesses, initialCodigo, onBack, onOpenBusiness }) {
  const [data, setData] = useState(null); // { negocios, canjes }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("puntos"); // puntos | canjes
  const [codigo, setCodigo] = useState(initialCodigo || null); // negocio cuyo detalle de recompensas se está viendo
  const [detalle, setDetalle] = useState(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [aCanjear, setACanjear] = useState(null); // recompensa pendiente de confirmar
  const [canjeando, setCanjeando] = useState(false);
  const [errorCanje, setErrorCanje] = useState(null);
  const [cupon, setCupon] = useState(null);
  const claveCanje = useRef(null);

  const bizDe = (cp) => businesses.find((b) => b.asistenteCodigoPublico === cp);

  const cargarLista = async () => {
    try {
      setError(null);
      setData(await fetchMisPuntos());
    } catch {
      setError("No pudimos cargar tus puntos en este momento. Probá de nuevo en un rato.");
    } finally {
      setLoading(false);
    }
  };
  const cargarDetalle = async (cp) => {
    setLoadingDetalle(true);
    try {
      setError(null);
      setDetalle(await fetchPuntosNegocio(cp));
    } catch {
      setError("No pudimos cargar las recompensas de este negocio. Probá de nuevo en un rato.");
    } finally {
      setLoadingDetalle(false);
    }
  };

  useEffect(() => { cargarLista(); }, []);
  useEffect(() => { if (codigo) cargarDetalle(codigo); else setDetalle(null); }, [codigo]);

  const confirmarCanje = async () => {
    if (!aCanjear || canjeando) return;
    setCanjeando(true);
    setErrorCanje(null);
    if (!claveCanje.current) claveCanje.current = randomHex(12); // misma clave si se reintenta: nunca descuenta dos veces
    try {
      const { canje } = await canjearRecompensaApi(codigo, aCanjear.id, claveCanje.current);
      claveCanje.current = null;
      setACanjear(null);
      setCupon(canje);
      await Promise.all([cargarDetalle(codigo), cargarLista()]);
    } catch (e) {
      setErrorCanje(e.message);
      setACanjear(null);
      cargarDetalle(codigo); // el estado pudo haber cambiado (se agotó, cambió el saldo...)
    } finally {
      setCanjeando(false);
    }
  };

  const Logo = ({ nombre, logoUrl, cp, size = 46 }) => {
    const biz = bizDe(cp);
    const src = biz?.logo || logoUrl;
    return src ? (
      <img src={src} alt="" loading="lazy" decoding="async" className="object-cover shrink-0" style={{ width: size, height: size, borderRadius: "50%" }} />
    ) : (
      <span className="flex items-center justify-center shrink-0 font-bold" style={{ width: size, height: size, borderRadius: "50%", background: catInfo(biz?.cat)?.color || "var(--azul)", color: "#fff" }}>
        {(nombre || "?")[0].toUpperCase()}
      </span>
    );
  };

  const cabecera = (titulo, subtitulo, atras) => (
    <div className="sticky top-0 z-30" style={{ backgroundColor: "var(--azul-oscuro)" }}>
      <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
        <BotonAtras onClick={atras} />
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: "#fff", fontFamily: "var(--fuente-titulo)" }}>{titulo}</p>
          {subtitulo && <p className="text-[11px]" style={{ color: "var(--azul-palido)" }}>{subtitulo}</p>}
        </div>
      </div>
    </div>
  );

  /* --- detalle de un negocio: todas sus recompensas --- */
  if (codigo) {
    const biz = bizDe(codigo);
    return (
      <div style={{ backgroundColor: "#F3F5FA", minHeight: "100dvh" }}>
        {cabecera("Recompensas", detalle?.nombreNegocio || biz?.name || "", () => (initialCodigo ? onBack() : setCodigo(null)))}
        <div className="max-w-3xl mx-auto px-4 py-5" style={{ paddingBottom: 60 }}>
          {loadingDetalle && !detalle ? (
            <p className="text-sm text-center py-16" style={{ color: "#5B6482" }}>Cargando...</p>
          ) : error && !detalle ? (
            <p className="text-sm text-center py-16" style={{ color: "#9A3B34" }}>{error}</p>
          ) : detalle && !detalle.activo ? (
            <div className="text-center py-16 px-6">
              <p className="text-sm font-semibold mb-1" style={{ color: "#0B1437" }}>Este negocio no tiene programa de puntos</p>
              <p className="text-xs" style={{ color: "#5B6482" }}>Cuando lo active vas a poder ver acá sus recompensas.</p>
            </div>
          ) : detalle && (
            <>
              <div className="p-4 mb-4 flex items-center gap-3" style={{ borderRadius: 14, background: "radial-gradient(420px 220px at 105% -20%, rgba(var(--azul-brillo-rgb),.55), transparent 60%), radial-gradient(260px 160px at -10% 120%, rgba(var(--azul-claro-rgb),.22), transparent 60%), var(--azul-oscuro)" }}>
                <Logo nombre={detalle.nombreNegocio} logoUrl={detalle.logoUrl} cp={codigo} size={50} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs" style={{ color: "var(--azul-palido)" }}>Tus puntos en {detalle.nombreNegocio}</p>
                  <p className="flex items-center gap-1.5" style={{ color: "#fff", fontFamily: "var(--fuente-titulo)", fontWeight: 700, fontSize: 24 }}>
                    <Coins size={20} color="#F5C85A" /> {fmtNum(detalle.saldo)}
                  </p>
                </div>
              </div>
              <p className="text-xs mb-4 px-1" style={{ color: "#2B3768" }}>
                Ganás <b>1 punto</b> por cada <b>{fmtPesos(detalle.pesosPorPunto)}</b> que gastás. Los puntos se suman cuando tu pedido se entrega y solo sirven en este negocio.
              </p>
              {errorCanje && (
                <p className="text-xs mb-3 px-3 py-2.5" style={{ borderRadius: 10, background: "#FDF1EF", color: "#9A3B34" }}>{errorCanje}</p>
              )}
              {detalle.recompensas.length === 0 ? (
                <p className="text-sm text-center py-10" style={{ color: "#5B6482" }}>Este negocio todavía no cargó recompensas.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {detalle.recompensas.map((r) => (
                    <RecompensaCard key={r.id} r={r} canjeando={canjeando} onCanjear={(rec) => { setErrorCanje(null); claveCanje.current = null; setACanjear(rec); }} />
                  ))}
                </div>
              )}
              {biz && (
                <button onClick={() => onOpenBusiness(biz.id)} className="w-full text-sm font-semibold py-3 mt-5" style={{ borderRadius: 10, backgroundColor: "var(--azul-suave)", color: "#0B1437" }}>
                  Ver perfil del negocio
                </button>
              )}
            </>
          )}
        </div>
        {aCanjear && (
          <ConfirmModal
            title="¿Canjear esta recompensa?"
            message={`Vas a usar ${fmtNum(aCanjear.puntos)} puntos para canjear "${aCanjear.nombre}". Se genera un código único para mostrarle al negocio.`}
            confirmLabel={canjeando ? "Canjeando..." : "Confirmar canje"}
            onConfirm={confirmarCanje} onCancel={() => !canjeando && setACanjear(null)}
          />
        )}
        {cupon && <CanjeModal canje={cupon} onClose={() => setCupon(null)} />}
      </div>
    );
  }

  /* --- lista: mis puntos por negocio + mis canjes --- */
  const negocios = data?.negocios || [];
  const canjes = data?.canjes || [];
  const pendientes = canjes.filter((c) => c.estado === "pendiente").length;

  return (
    <div style={{ backgroundColor: "#F3F5FA", minHeight: "100dvh" }}>
      {cabecera("Mis puntos", "Cada negocio tiene sus propios puntos", onBack)}
      <div className="max-w-3xl mx-auto px-4 py-4" style={{ paddingBottom: 60 }}>
        <div className="flex items-center gap-6 mb-4" style={{ borderBottom: "1px solid #E3E7F1" }}>
          {[{ id: "puntos", label: "Mis puntos" }, { id: "canjes", label: `Mis canjes${pendientes ? ` (${pendientes})` : ""}` }].map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className="px-1 pb-3 text-sm font-medium relative" style={{ color: tab === t.id ? "var(--azul)" : "#5B6482" }}>
              {t.label}
              {tab === t.id && <span className="absolute left-0 right-0" style={{ bottom: 0, height: 2, background: "var(--azul)", borderRadius: 2 }} />}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-sm text-center py-16" style={{ color: "#5B6482" }}>Cargando...</p>
        ) : error ? (
          <p className="text-sm text-center py-16" style={{ color: "#9A3B34" }}>{error}</p>
        ) : tab === "puntos" ? (
          negocios.length === 0 ? (
            <div className="text-center py-14 px-6">
              <span className="flex items-center justify-center mx-auto mb-3" style={{ width: 56, height: 56, borderRadius: "50%", background: "#FDF3DC" }}>
                <Coins size={24} color="#B7791F" />
              </span>
              <p className="text-sm font-semibold mb-1" style={{ color: "#0B1437" }}>Todavía no tenés puntos</p>
              <p className="text-xs" style={{ color: "#5B6482" }}>Los negocios con programa de puntos te suman puntos por tus compras. Cuando tengas, los vas a ver acá, separados por negocio.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {negocios.map((n) => (
                <div key={n.codigoPublico} className="bg-white p-4" style={{ borderRadius: 14, border: "1px solid #E3E7F1", boxShadow: "0 3px 14px rgba(11,20,55,0.07)" }}>
                  <div className="flex items-center gap-3">
                    <Logo nombre={n.nombreNegocio} logoUrl={n.logoUrl} cp={n.codigoPublico} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: "#0B1437" }}>{n.nombreNegocio}</p>
                      <p className="flex items-center gap-1 text-sm font-bold" style={{ color: "#8A5B12" }}><Coins size={13} /> {fmtNum(n.saldo)} puntos</p>
                    </div>
                  </div>
                  {n.proxima ? (
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs mb-1.5" style={{ color: "#2B3768" }}>
                        <span className="truncate pr-2">{n.proxima.nombre} · {fmtNum(n.proxima.puntos)} puntos</span>
                      </div>
                      <div style={{ height: 7, borderRadius: 4, background: "#EEF0F6", overflow: "hidden" }}>
                        <div style={{ width: `${Math.min(100, Math.round((n.saldo / n.proxima.puntos) * 100))}%`, height: "100%", background: "linear-gradient(90deg, var(--azul), var(--azul-claro))" }} />
                      </div>
                      <p className="text-xs mt-1.5" style={{ color: "#2B3768" }}>Te {n.proxima.faltan === 1 ? "falta" : "faltan"} <b>{fmtNum(n.proxima.faltan)} puntos</b>.</p>
                    </div>
                  ) : n.recompensas.some((r) => r.puedeCanjear) ? (
                    <p className="text-xs mt-3 font-medium" style={{ color: "#1E6B44" }}>¡Ya podés canjear una recompensa!</p>
                  ) : null}
                  <button
                    onClick={() => { setErrorCanje(null); setCodigo(n.codigoPublico); }}
                    className="w-full text-sm font-semibold py-2.5 mt-3.5"
                    style={{ borderRadius: 10, backgroundColor: "var(--azul-suave)", color: "#0B1437" }}
                  >
                    Ver recompensas
                  </button>
                </div>
              ))}
            </div>
          )
        ) : canjes.length === 0 ? (
          <div className="text-center py-14 px-6">
            <span className="flex items-center justify-center mx-auto mb-3" style={{ width: 56, height: 56, borderRadius: "50%", background: "#F3ECFC" }}>
              <Ticket size={24} color="#7A4F9E" />
            </span>
            <p className="text-sm font-semibold mb-1" style={{ color: "#0B1437" }}>Todavía no canjeaste nada</p>
            <p className="text-xs" style={{ color: "#5B6482" }}>Tus cupones aparecen acá, con su código y su estado.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {canjes.map((c) => {
              const usado = c.estado === "utilizado";
              return (
                <button key={c.id} onClick={() => setCupon(c)} className="w-full flex items-center gap-3 p-3.5 text-left bg-white" style={{ borderRadius: 14, border: "1px solid #E3E7F1", boxShadow: "0 3px 12px rgba(11,20,55,0.06)", opacity: usado ? 0.7 : 1 }}>
                  <span className="flex items-center justify-center shrink-0" style={{ width: 44, height: 44, borderRadius: 12, background: usado ? "#EEEDE7" : "#F3ECFC" }}>
                    {usado ? <Check size={19} color="#5B6482" /> : <Ticket size={19} color="#7A4F9E" />}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold truncate" style={{ color: "#0B1437" }}>{c.recompensa}</span>
                    <span className="block text-xs truncate" style={{ color: "#5B6482" }}>{c.negocio} · {fmtFechaAR(c.creadoEn)}</span>
                    <span className="block text-xs font-mono mt-0.5" style={{ color: usado ? "#64748B" : "#0B1437", textDecoration: usado ? "line-through" : "none" }}>{c.codigo}</span>
                  </span>
                  <span className="text-[11px] font-semibold px-2 py-1 shrink-0" style={{ borderRadius: 20, background: usado ? "#EEEDE7" : "#E4F3EA", color: usado ? "#5B6482" : "#1E6B44" }}>
                    {usado ? "Utilizado" : "Pendiente de uso"}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
      {cupon && <CanjeModal canje={cupon} onClose={() => setCupon(null)} />}
    </div>
  );
}

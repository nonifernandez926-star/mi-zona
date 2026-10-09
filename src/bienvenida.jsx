// Primera pantalla de Mi Zona: bienvenida animada (como la de Mi Asistente), elegir Registrarme / Iniciar sesión,
// y crear usuario y contraseña. Se muestra mientras no haya sesión; con sesión abierta la app entra directo al inicio.
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, UtensilsCrossed, HeartPulse, Wrench, Home, ShoppingBag, Scissors, Eye, EyeOff, Check } from "lucide-react";
import "./bienvenida.css";
import { cargarGoogle, pedirCuentaGoogle, loginConGoogle, entrarConUsuario, revisarCorreo, completarCuenta, usuarioDisponible } from "./api.js";
import { validarUsuario, validarContrasena, requisitosContrasena, normalizarUsuario } from "./credenciales.js";

const RUBROS = [
  { Icon: UtensilsCrossed, color: "#ffb36b", a: 0 }, { Icon: HeartPulse, color: "#ff8aa5", a: 60 }, { Icon: Wrench, color: "#b9a4ff", a: 120 },
  { Icon: Home, color: "#6fe3b0", a: 180 }, { Icon: ShoppingBag, color: "var(--azul-palido)", a: 240 }, { Icon: Scissors, color: "var(--azul-claro-vivo)", a: 300 },
];

function Marca() {
  return (
    <div className="bv-marca">
      <svg viewBox="0 0 40 40" aria-hidden="true"><defs><linearGradient id="bvMg" x1="0" y1="0" x2="1" y2="1"><stop stopColor="var(--azul-g1)" /><stop offset="1" stopColor="var(--azul-claro-vivo)" /></linearGradient></defs>
        <rect width="40" height="40" rx="12" fill="url(#bvMg)" /><path d="M20 9c-5.2 0-9 3.9-9 8.6 0 6.2 9 14.4 9 14.4s9-8.2 9-14.4C29 12.9 25.2 9 20 9z" fill="#fff" /><circle cx="20" cy="17.6" r="3.4" fill="var(--azul)" /></svg>
      Mi Zona
    </div>
  );
}

function Escena() {
  return (
    <div className="bv-escena" aria-hidden="true">
      <div className="bv-halo" /><div className="bv-orbita" />
      <div className="bv-anillo">
        {RUBROS.map(({ Icon, color, a }) => (
          <div className="bv-item" key={a} style={{ "--a": `${a}deg` }}><div className="bv-burbuja"><Icon size={21} color={color} strokeWidth={2.2} /></div></div>
        ))}
      </div>
      <svg className="bv-pin" viewBox="0 0 150 168" role="img" aria-label="Ubicación">
        <defs>
          <linearGradient id="bvPin" x1="0" y1="0" x2="1" y2="1"><stop stopColor="var(--azul-palido)" /><stop offset=".5" stopColor="#2f66ff" /><stop offset="1" stopColor="#1536c8" /></linearGradient>
          <radialGradient id="bvNucleo"><stop stopColor="#e8fbff" /><stop offset=".45" stopColor="#4fd8ff" /><stop offset="1" stopColor="var(--azul)" stopOpacity="0" /></radialGradient>
          <filter id="bvBrillo" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="3" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>
        <ellipse cx="75" cy="162" rx="30" ry="5" fill="#000" opacity=".35" />
        <ellipse className="bv-onda" cx="75" cy="162" rx="40" ry="8" fill="none" stroke="var(--azul-claro-vivo)" strokeWidth="1.6" />
        <ellipse className="bv-onda b" cx="75" cy="162" rx="40" ry="8" fill="none" stroke="var(--azul-claro-vivo)" strokeWidth="1.6" />
        <path d="M75 6C42 6 16 31 16 63c0 40 47 90 56 100a4 4 0 0 0 6 0c9-10 56-60 56-100C134 31 108 6 75 6z" fill="url(#bvPin)" />
        <path d="M75 6C42 6 16 31 16 63c0 40 47 90 56 100a4 4 0 0 0 6 0c9-10 56-60 56-100C134 31 108 6 75 6z" fill="none" stroke="#fff" strokeOpacity=".55" strokeWidth="1.5" />
        <circle cx="75" cy="62" r="27" fill="#fff" />
        <circle cx="75" cy="62" r="27" fill="none" stroke="#9fb6ee" strokeOpacity=".6" />
        <circle className="bv-nucleo" cx="75" cy="62" r="17" fill="url(#bvNucleo)" filter="url(#bvBrillo)" />
        <circle cx="75" cy="62" r="7" fill="var(--azul)" />
        <path d="M34 42q22-26 54-22" stroke="#fff" strokeOpacity=".5" strokeWidth="7" strokeLinecap="round" fill="none" />
      </svg>
    </div>
  );
}

const GoogleG = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.5 24.6c0-1.6-.1-3.1-.4-4.6H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.4-4.1 7-10.1 7-17.5z" />
    <path fill="#FBBC05" d="M10.5 28.7c-.5-1.4-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.9l7.9-6.2z" />
    <path fill="#34A853" d="M24 48c6.5 0 12-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.9 2.3-8.3 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.2C6.5 42.6 14.6 48 24 48z" />
  </svg>
);

// ---------- paso final: primero el usuario, después la contraseña ----------
function FormCrear({ pedirNombre, pedirClave = true, nombreInicial = "", onListo }) {
  const [nombre, setNombre] = useState(nombreInicial);
  const [paso, setPaso] = useState("usuario"); // usuario | clave
  const [usuario, setUsuario] = useState("");
  const [clave, setClave] = useState("");
  const [ver, setVer] = useState(false);
  const [disp, setDisp] = useState({ estado: "idle", msg: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Revisa en vivo (con una pausa corta) si el usuario es válido y está libre
  useEffect(() => {
    const u = normalizarUsuario(usuario);
    if (!u) { setDisp({ estado: "idle", msg: "" }); return undefined; }
    const err = validarUsuario(u);
    if (err) { setDisp({ estado: "invalido", msg: err }); return undefined; }
    setDisp({ estado: "revisando", msg: "Revisando si está libre..." });
    let vivo = true;
    const t = setTimeout(async () => {
      try {
        const r = await usuarioDisponible(u);
        if (vivo) setDisp(r.disponible ? { estado: "libre", msg: "¡Está disponible!" } : { estado: "ocupado", msg: "Ese usuario ya está ocupado. Usá otro." });
      } catch {
        if (vivo) setDisp({ estado: "error", msg: "No pudimos revisar si está libre; lo comprobamos al crear la cuenta." });
      }
    }, 450);
    return () => { vivo = false; clearTimeout(t); };
  }, [usuario]);

  const reglas = requisitosContrasena(clave);
  const errClave = clave ? validarContrasena(clave, usuario) : "";
  const usuarioOk = disp.estado === "libre" || disp.estado === "error";
  const nombreOk = !pedirNombre || nombre.trim().length >= 2;
  const claseUsuario = disp.estado === "libre" ? "bien" : disp.estado === "invalido" || disp.estado === "ocupado" ? "mal" : "";

  const guardar = async () => {
    setBusy(true); setError("");
    try {
      onListo(await completarCuenta(normalizarUsuario(usuario), pedirClave ? clave : "", pedirNombre ? nombre.trim() : undefined));
    } catch (err) {
      if (err.datos?.codigo === "usuario_existente") { setDisp({ estado: "ocupado", msg: err.message }); setPaso("usuario"); }
      else setError(err.message);
      setBusy(false);
    }
  };
  const alUsuario = (e) => { e.preventDefault(); if (!usuarioOk || !nombreOk || busy) return; if (pedirClave) { setError(""); setPaso("clave"); } else guardar(); };
  const alClave = (e) => { e.preventDefault(); if (!clave || errClave || busy) return; guardar(); };

  if (paso === "clave") {
    return (
      <form className="bv-form" onSubmit={alClave} noValidate>
        <div className="bv-fijo"><span>@{normalizarUsuario(usuario)}</span><button type="button" className="bv-link" onClick={() => { setPaso("usuario"); setError(""); }}>Cambiar</button></div>
        <div className="bv-campo"><label htmlFor="bv-clave">Tu contraseña</label>
          <div className="caja"><input id="bv-clave" className={`con-ver ${clave && errClave ? "mal" : clave ? "bien" : ""}`} type={ver ? "text" : "password"} value={clave} onChange={(e) => setClave(e.target.value)} maxLength={100}
            autoComplete="new-password" placeholder="Creá tu contraseña" autoFocus />
            <button type="button" className="ver" onClick={() => setVer(!ver)} aria-label={ver ? "Ocultar contraseña" : "Mostrar contraseña"}>{ver ? <EyeOff size={19} /> : <Eye size={19} />}</button></div>
          <p className="bv-nota" style={{ marginTop: 6 }}>Es solo para entrar a Mi Zona con tu usuario; no es la contraseña de tu cuenta de Google. Puede ser solo números, solo letras o una mezcla.</p>
          <ul className="bv-reglas">{reglas.map((r) => <li key={r.texto} className={r.ok ? "ok" : ""}><i><Check size={11} strokeWidth={3.4} /></i>{r.texto}</li>)}</ul>
          {clave && errClave && /usuario|espacios/.test(errClave) && <p className="bv-nota mal">{errClave}</p>}
        </div>
        {error && <p className="bv-error" role="alert">{error}</p>}
        <button className="bv-enviar" type="submit" disabled={!clave || !!errClave || busy}>{busy ? "Creando..." : "Crear mi cuenta"}</button>
        <p className="bv-nota" style={{ justifyContent: "center", textAlign: "center" }}>Después podés cambiar tu usuario y tu contraseña desde Ajustes.</p>
      </form>
    );
  }
  return (
    <form className="bv-form" onSubmit={alUsuario} noValidate>
      {pedirNombre && (
        <div className="bv-campo"><label htmlFor="bv-nombre">Tu nombre</label>
          <div className="caja"><input id="bv-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={60} autoComplete="name" placeholder="Cómo te llamás" /></div></div>
      )}
      <div className="bv-campo"><label htmlFor="bv-usuario">Tu usuario</label>
        <div className="caja"><input id="bv-usuario" className={claseUsuario} value={usuario} onChange={(e) => setUsuario(e.target.value.replace(/\s/g, ""))} maxLength={20}
          autoComplete="username" autoCapitalize="none" spellCheck={false} placeholder="ej: maria.lopez" autoFocus /></div>
        {disp.msg ? <p className={`bv-nota ${disp.estado === "libre" ? "bien" : disp.estado === "ocupado" || disp.estado === "invalido" ? "mal" : ""}`}>{disp.estado === "libre" && <Check size={14} />}{disp.msg}</p>
          : <p className="bv-nota">De 5 a 20 caracteres. Empieza con una letra; podés usar números, punto o guion bajo.</p>}
      </div>
      {error && <p className="bv-error" role="alert">{error}</p>}
      <button className="bv-enviar" type="submit" disabled={!usuarioOk || !nombreOk || busy}>{busy ? "Guardando..." : pedirClave ? "Continuar" : "Guardar usuario"}</button>
      {!pedirClave && <p className="bv-nota" style={{ justifyContent: "center", textAlign: "center" }}>Seguís entrando con tu contraseña de siempre. Podés cambiar tu usuario desde Ajustes.</p>}
    </form>
  );
}

// Para cuentas que ya entraron con Google pero todavía no eligieron usuario y contraseña (o se quedaron a medias).
export function PantallaCrearUsuario({ usuario, onListo, onSalir }) {
  return (
    <div className="bv"><div className="bv-fondo" aria-hidden="true"><i /><i /><i /></div>
      <div className="bv-pantalla">
        <div className="bv-barra"><Marca />{onSalir && <button className="bv-link" style={{ marginLeft: "auto", color: "var(--azul-palido)", fontSize: ".85rem" }} onClick={onSalir}>Salir</button>}</div>
        <div className="bv-hoja">
          <h2>Último paso: creá tu usuario</h2>
          <p className="bv-sub">{usuario?.conClave ? "Elegí un usuario para entrar más fácil. Tu contraseña de siempre no cambia." : "Con tu usuario y contraseña vas a poder entrar a Mi Zona cuando quieras, además de Google."}</p>
          <FormCrear pedirNombre={false} pedirClave={!usuario?.conClave} onListo={onListo} />
        </div>
      </div></div>
  );
}

export function PantallaBienvenida({ onLogged }) {
  const [vista, setVista] = useState("inicio"); // inicio | acceso | crear
  const [datosGoogle, setDatosGoogle] = useState(null);
  const pila = useRef([]);
  const ir = (v) => { pila.current.push(vista); window.history.pushState({ bv: v }, ""); setVista(v); };
  const volver = () => window.history.back();
  useEffect(() => {
    const alVolver = () => setVista(pila.current.pop() || "inicio");
    window.addEventListener("popstate", alVolver);
    return () => window.removeEventListener("popstate", alVolver);
  }, []);
  useEffect(() => { if (vista !== "inicio") cargarGoogle().catch(() => {}); }, [vista]);

  // correo/usuario y contraseña, en dos pasos
  const [paso, setPaso] = useState("usuario"); // usuario | clave | google
  const [ident, setIdent] = useState("");
  const [clave, setClave] = useState("");
  const [ver, setVer] = useState(false);
  const [error, setError] = useState("");
  const [errorGoogle, setErrorGoogle] = useState("");
  const [busy, setBusy] = useState(false);

  // Tiene que llamarse directo desde un toque (si no, el navegador bloquea la ventana de Google)
  // "hint": un correo escrito a mano (Google lo abre y pide su contraseña en su página). "enSilencio": si el navegador bloquea la ventana, queda el botón para tocar.
  const conGoogle = async (modo, hint, enSilencio) => {
    if (busy) return;
    setErrorGoogle("");
    let token;
    try { token = await pedirCuentaGoogle(hint); } catch (e) { if (!e.cancelado && !(enSilencio && e.bloqueada)) setErrorGoogle(e.message); return; }
    setBusy(true);
    try {
      const r = await loginConGoogle(token, modo, hint);
      if (modo === "registro" && !r.usuario?.usuario) { setDatosGoogle(r); setBusy(false); ir("crear"); return; }
      onLogged(r.usuario);
    } catch (e) { setErrorGoogle(e.message); setBusy(false); }
  };
  // Con un usuario se pide la contraseña acá. Con un correo es lo mismo que "Acceder con Google", pero escribiendo el correo en vez de elegir la cuenta.
  const continuar = async (e) => {
    e.preventDefault();
    const v = ident.trim();
    if (!v || busy) return;
    setError(""); setErrorGoogle("");
    if (!v.includes("@")) { setPaso("clave"); return; }
    setBusy(true);
    try {
      const r = await revisarCorreo(v);
      setBusy(false);
      if (r.paso === "crear") { setError("No encontramos una cuenta con ese correo. Tocá “Registrarme” para crearla."); return; }
      if (r.paso === "clave") { setPaso("clave"); return; }
      setPaso("google"); // paso aparte: Google pide ahí la contraseña del correo; no se entra solo
    } catch (err) { setError(err.message); setBusy(false); }
  };
  const entrar = async (e) => {
    e.preventDefault();
    if (busy || !clave) return;
    setBusy(true); setError("");
    try { onLogged((await entrarConUsuario(ident.trim(), clave)).usuario); } catch (err) { setError(err.message); setBusy(false); }
  };

  if (vista === "inicio") {
    return (
      <div className="bv"><div className="bv-fondo" aria-hidden="true"><i /><i /><i /></div>
        <div className="bv-pantalla"><main className="bv-vista">
          <Marca />
          <section className="bv-hero">
            <Escena />
            <h1>Descubrí lo mejor de tu zona</h1>
            <p>Negocios, productos y servicios cerca tuyo, con reseñas reales de gente de tu zona.</p>
          </section>
          <div className="bv-pasos">
            <div className="bv-paso"><b>1</b><span>Elegís tu zona y ves los negocios que tenés cerca.</span></div>
            <div className="bv-paso"><b>2</b><span>Mirás reseñas, horarios y cómo llegar.</span></div>
            <div className="bv-paso"><b>3</b><span>Chateás con el asistente del negocio y guardás tus favoritos.</span></div>
          </div>
          <button type="button" className="bv-cta" onClick={() => ir("acceso")}><span>Empezar</span><ArrowRight size={20} strokeWidth={2.4} /></button>
        </main></div></div>
    );
  }

  return (
    <div className="bv"><div className="bv-fondo" aria-hidden="true"><i /><i /><i /></div>
      <div className="bv-pantalla">
        <div className="bv-barra"><button className="bv-volver" onClick={volver} aria-label="Volver"><ArrowLeft size={20} strokeWidth={2.2} /></button><Marca /></div>
        <div className="bv-hoja" key={vista}>
          {vista === "acceso" && (<>
            <h2>Entrá a tu cuenta</h2>
            <p className="bv-sub">Entrá a Mi Zona o creá tu cuenta.</p>
            <button className="bv-google" onClick={() => conGoogle("login")} disabled={busy}><GoogleG />{busy ? "Entrando..." : "Acceder con Google"}</button>
            {errorGoogle && <p className="bv-err-g" role="alert">{errorGoogle}</p>}
            <div className="bv-o">o con tu usuario</div>
            {paso === "usuario" ? (
              <form className="bv-form" onSubmit={continuar} noValidate>
                <div className="bv-campo"><div className="caja"><input value={ident} onChange={(e) => setIdent(e.target.value)} autoComplete="username" autoCapitalize="none" spellCheck={false} placeholder="Usuario o correo electrónico" aria-label="Usuario o correo electrónico" /></div></div>
                {error && <p className="bv-error" role="alert">{error}</p>}
                <button className="bv-enviar" type="submit" disabled={!ident.trim() || busy}>{busy ? "Un momento..." : "Continuar"}</button>
              </form>
            ) : paso === "google" ? (
              <div className="bv-form">
                <div className="bv-fijo"><span>{ident}</span><button type="button" className="bv-link" onClick={() => { setPaso("usuario"); setErrorGoogle(""); }}>Cambiar</button></div>
                <button className="bv-google" onClick={() => conGoogle("login", ident.trim().toLowerCase())} disabled={busy}><GoogleG />{busy ? "Entrando..." : "Continuar con contraseña del correo"}</button>
                <p className="bv-nota" style={{ justifyContent: "center", textAlign: "center" }}>Tocá el botón y Google te va a pedir la contraseña de ese correo en su propia página. Mi Zona nunca la ve.</p>
              </div>
            ) : (
              <form className="bv-form" onSubmit={entrar} noValidate>
                <div className="bv-fijo"><span>{ident}</span><button type="button" className="bv-link" onClick={() => { setPaso("usuario"); setClave(""); setError(""); }}>Cambiar</button></div>
                <div className="bv-campo"><div className="caja bv-clave">
                  <input type={ver ? "text" : "password"} value={clave} onChange={(e) => setClave(e.target.value)} maxLength={100} autoComplete="current-password" placeholder="Contraseña" aria-label="Contraseña" autoFocus />
                  <button type="button" className="ver" onClick={() => setVer(!ver)} aria-label={ver ? "Ocultar contraseña" : "Mostrar contraseña"}>{ver ? <EyeOff size={19} /> : <Eye size={19} />}</button>
                </div></div>
                {error && <p className="bv-error" role="alert">{error}</p>}
                <button className="bv-enviar" type="submit" disabled={busy || !clave}>{busy ? "Un momento..." : "Iniciar sesión"}</button>
              </form>
            )}
            <p className="bv-pie">¿No tenés cuenta? <button className="bv-link" onClick={() => conGoogle("registro")} disabled={busy}>Registrarme</button></p>
          </>)}
          {vista === "crear" && (<>
            <h2>Creá tu usuario</h2>
            <p className="bv-sub">Casi listo{datosGoogle?.usuario?.email ? `: tu cuenta de Google es ${datosGoogle.usuario.email}` : ""}. Elegí cómo vas a entrar a Mi Zona.</p>
            <FormCrear pedirNombre={false} pedirClave={!datosGoogle?.usuario?.conClave} onListo={onLogged} />
          </>)}
        </div>
      </div></div>
  );
}

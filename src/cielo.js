// Dibujo del cielo de la portada con canvas: sol, luna con relieve real (mares y cráteres iluminados según su fase),
// estrellas, Vía Láctea, nubes con luz y sombra, y montañas con bruma atmosférica y luz de borde.
// Todo se genera con código (sin fotos ni descargas): no pesa y funciona sin internet.

/* ---------- utilidades ---------- */
const lim = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const suave = (t) => t * t * (3 - 2 * t);
const paso = (a, b, v) => suave(lim((v - a) / (b - a)));
const mezclaN = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const aRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const css = (c, a = 1) => `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${a})`;

function mulberry32(a) {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const hash = (x, y, s) => { let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(s | 0, 1274126177); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
function ruido(x, y, s) {
  const xi = Math.floor(x), yi = Math.floor(y), fx = suave(x - xi), fy = suave(y - yi);
  const a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}
function fbm(x, y, s, oct = 5) {
  let v = 0, a = 0.5, f = 1, n = 0;
  for (let i = 0; i < oct; i++) { v += a * ruido(x * f, y * f, s + i * 17); n += a; a *= 0.5; f *= 2.03; }
  return v / n;
}

/* ---------- luna: textura con relieve ---------- */
const cacheLuna = new Map();
// fase: 0 nueva · 0,5 llena. Hemisferio sur: la luna se ve girada 180° (la creciente se ilumina a la izquierda).
function lunaTextura(fase, T = 176) {
  const clave = Math.round(fase * 80);
  if (cacheLuna.has(clave)) return cacheLuna.get(clave);
  const c = document.createElement("canvas"); c.width = c.height = T;
  const g = c.getContext("2d"); const img = g.createImageData(T, T); const R = T / 2;
  const rnd = mulberry32(11);
  const crateres = Array.from({ length: 110 }, () => { const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * 0.93; return { x: Math.cos(a) * d, y: Math.sin(a) * d, r: 0.014 + Math.pow(rnd(), 2.4) * 0.14 }; });
  const phi = 2 * Math.PI * (clave / 80);
  const L = [-Math.sin(phi), 0, -Math.cos(phi)];
  for (let y = 0; y < T; y++) {
    for (let x = 0; x < T; x++) {
      const nx = (x + 0.5 - R) / R, ny = (y + 0.5 - R) / R, r2 = nx * nx + ny * ny;
      if (r2 > 1.03) continue;
      const borde = lim((1 - Math.sqrt(r2)) * R / 1.4 + 0.5);
      const z = Math.sqrt(Math.max(0, 1 - r2));
      const tx = -nx, ty = -ny; // textura girada 180°
      let alb = 0.8 + (fbm(tx * 7 + 20, ty * 7 + 5, 3, 4) - 0.5) * 0.24;
      alb -= paso(0.5, 0.63, fbm(tx * 1.7 + 3, ty * 1.7 + 9, 8, 4)) * 0.36; // mares oscuros
      alb += (fbm(tx * 22 + 4, ty * 22 + 1, 5, 3) - 0.5) * 0.08;
      for (let i = 0; i < crateres.length; i++) {
        const cr = crateres[i], dx = tx - cr.x, dy = ty - cr.y, d = Math.sqrt(dx * dx + dy * dy) / cr.r;
        if (d < 1.3) {
          if (d < 1) alb -= (1 - d * d) * (cr.r > 0.06 ? 0.11 : 0.07);
          alb += Math.exp(-((d - 1) * (d - 1)) / 0.02) * (cr.r > 0.06 ? 0.15 : 0.1);
        }
      }
      const ndl = nx * L[0] + ny * L[1] + z * L[2];
      const lit = paso(-0.03, 0.2, ndl);
      const luz = lit * (0.66 + 0.34 * Math.pow(Math.max(ndl, 0), 0.4)) * (0.88 + 0.12 * z) + 0.045 * (1 - lit); // + luz cenicienta del lado oscuro
      const b = lim(alb * luz, 0, 1.05) * 255;
      const i4 = (y * T + x) * 4;
      const frio = (1 - lit) * 14;
      img.data[i4] = Math.min(255, b * 1.0 + 1); img.data[i4 + 1] = Math.min(255, b * 0.975); img.data[i4 + 2] = Math.min(255, b * 0.9 + frio);
      img.data[i4 + 3] = Math.round(255 * borde);
    }
  }
  g.putImageData(img, 0, 0);
  if (cacheLuna.size > 12) cacheLuna.clear();
  cacheLuna.set(clave, c);
  return c;
}

/* ---------- estrellas y Vía Láctea ---------- */
let estrellas = null;
function listaEstrellas() {
  if (estrellas) return estrellas;
  const r = mulberry32(5);
  estrellas = Array.from({ length: 280 }, () => {
    const m = Math.pow(r(), 3.2); // pocas muy brillantes
    const t = r();
    return { x: r(), y: Math.pow(r(), 0.8) * 0.8, m, c: t < 0.2 ? [255, 214, 170] : t < 0.7 ? [255, 255, 250] : [196, 218, 255] };
  });
  return estrellas;
}
let lactea = null;
function lacteaCanvas(W, H) {
  const w = Math.max(40, Math.round(W / 4)), h = Math.max(40, Math.round(H / 4));
  if (lactea && lactea.width === w && lactea.height === h) return lactea;
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const g = c.getContext("2d"); const img = g.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const u = x / w, v = y / h;
      const linea = 0.18 + 0.52 * u; // banda diagonal
      const d = (v - linea) / 0.2;
      const banda = Math.exp(-d * d);
      const n = fbm(u * 9, v * 9, 31, 5);
      const nucleo = Math.exp(-(((u - 0.62) / 0.3) ** 2));
      const oscuro = paso(0.55, 0.7, fbm(u * 14 + 5, v * 14, 44, 4));
      const a = lim(banda * (0.25 + 0.95 * n) * (0.5 + 0.7 * nucleo) * (1 - oscuro * 0.65)) * 0.5;
      const i4 = (y * w + x) * 4;
      img.data[i4] = 214 + 30 * nucleo; img.data[i4 + 1] = 222; img.data[i4 + 2] = 255 - 30 * nucleo; img.data[i4 + 3] = Math.round(a * 255);
    }
  }
  g.putImageData(img, 0, 0);
  lactea = c;
  return c;
}

/* ---------- cielo: degradado, estrellas, sol y luna ---------- */
// P: { col:[3 hex], noche, dia, cob, tor, sol:{x,y,elev,vis}, luna:{x,y,fase,elev,vis}, W, H }
export function pintarCielo(ctx, W, H, P) {
  const col = P.col.map(aRgb);
  ctx.clearRect(0, 0, W, H);
  const gr = ctx.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, css(col[0])); gr.addColorStop(0.5, css(col[1])); gr.addColorStop(0.86, css(col[2])); gr.addColorStop(1, css(col[2]));
  ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);

  const cob = P.cob, velo = 1 - lim(cob * 0.9);
  const s = P.sol, l = P.luna;
  const bajo = 1 - lim(s.elev * 2.4); // 1 = pegado al horizonte (atardecer / amanecer)

  // resplandor del horizonte al amanecer y atardecer
  if (s.vis > 0 && P.dia > 0) {
    const a = lim(bajo) * (0.7 - cob * 0.35) * lim(P.dia * 1.4);
    ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.translate(s.x, P.horizonte); ctx.scale(1, 0.42);
    const hg = ctx.createRadialGradient(0, 0, 0, 0, 0, W * 0.95);
    hg.addColorStop(0, `rgba(255,150,70,${0.62 * a})`); hg.addColorStop(0.35, `rgba(240,110,90,${0.28 * a})`); hg.addColorStop(1, "rgba(120,60,140,0)");
    ctx.fillStyle = hg; ctx.fillRect(-W * 1.2, -W, W * 2.4, W * 2); ctx.restore();
  }

  // estrellas + Vía Láctea
  const opN = P.noche * lim(velo * 1.1) * (1 - 0.8 * P.tor);
  if (opN > 0.02) {
    ctx.save(); ctx.globalAlpha = opN * 0.9; ctx.imageSmoothingEnabled = true;
    ctx.drawImage(lacteaCanvas(W, H), 0, 0, W, H); ctx.restore();
    const lunaLlena = l.vis > 0 ? lim(0.5 - 0.5 * Math.cos(2 * Math.PI * l.fase)) : 0;
    for (const e of listaEstrellas()) {
      const x = e.x * W, y = e.y * H;
      if (y > P.horizonte - 4) continue;
      const apagada = 1 - lunaLlena * 0.55 * Math.exp(-(((x - l.x) ** 2 + (y - l.y) ** 2) / (W * 0.45) ** 2)); // la luna apaga las estrellas cercanas
      const a = opN * (0.28 + 0.72 * e.m) * apagada;
      const r = 0.45 + e.m * 1.5;
      ctx.fillStyle = css(e.c, a); ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill();
      if (e.m > 0.55) {
        const gl = ctx.createRadialGradient(x, y, 0, x, y, r * 6);
        gl.addColorStop(0, css(e.c, a * 0.35)); gl.addColorStop(1, css(e.c, 0));
        ctx.fillStyle = gl; ctx.fillRect(x - r * 6, y - r * 6, r * 12, r * 12);
      }
    }
  }

  // luna
  if (l.vis > 0) {
    const R = P.radioLuna * (1 + 0.18 * (1 - lim(l.elev * 2.2)));
    const ilum = lim(0.5 - 0.5 * Math.cos(2 * Math.PI * l.fase));
    const vis = lim(P.noche * 2.2 + (1 - velo) * 0.0) * (1 - cob * 0.5 - P.tor * 0.3) + (P.dia > 0.5 ? 0.0 : 0);
    const visDia = P.dia > 0.5 ? 0.38 : 0; // de día se ve tenue, como en la vida real
    const op = lim(Math.max(vis, visDia * (1 - cob * 0.6)));
    if (op > 0.01) {
      ctx.save(); ctx.globalAlpha = op;
      ctx.globalCompositeOperation = "lighter";
      const hg = ctx.createRadialGradient(l.x, l.y, R * 0.8, l.x, l.y, R * 7);
      hg.addColorStop(0, `rgba(190,208,255,${0.42 * (0.25 + ilum)})`); hg.addColorStop(0.3, `rgba(140,165,235,${0.16 * (0.25 + ilum)})`); hg.addColorStop(1, "rgba(120,150,230,0)");
      ctx.fillStyle = hg; ctx.fillRect(l.x - R * 7, l.y - R * 7, R * 14, R * 14);
      ctx.globalCompositeOperation = "source-over";
      ctx.drawImage(lunaTextura(l.fase), l.x - R, l.y - R, R * 2, R * 2);
      const calido = lim(1 - l.elev * 2.4);
      if (calido > 0.02) { // cerca del horizonte la luna se ve anaranjada
        ctx.save(); ctx.beginPath(); ctx.arc(l.x, l.y, R, 0, 6.2832); ctx.clip(); ctx.globalCompositeOperation = "multiply";
        ctx.fillStyle = css(mezclaN([255, 255, 255], [255, 170, 110], calido * 0.85)); ctx.fillRect(l.x - R, l.y - R, R * 2, R * 2); ctx.restore();
      }
      ctx.restore();
    }
  }

  // sol
  if (s.vis > 0) {
    const R = P.radioSol * (1 + 0.3 * bajo);
    const op = lim(P.dia * 3) * (1 - cob * 0.42 - P.tor * 0.3);
    if (op > 0.01) {
      const blanco = [255, 253, 244], calido = mezclaN([255, 236, 170], [255, 120, 50], lim(bajo * 1.05));
      ctx.save(); ctx.globalAlpha = op; ctx.globalCompositeOperation = "lighter";
      // rayos de luz (sutiles)
      if (cob < 0.8) {
        const r = mulberry32(3);
        for (let i = 0; i < 16; i++) {
          const ang = r() * Math.PI * 2, ancho = 0.012 + r() * 0.03, largo = W * (0.55 + r() * 0.6), a = (0.05 + r() * 0.08) * (1 - cob);
          ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(ang);
          const rg = ctx.createLinearGradient(0, 0, largo, 0);
          rg.addColorStop(0, css(calido, a)); rg.addColorStop(1, css(calido, 0));
          ctx.fillStyle = rg; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(largo, -largo * ancho); ctx.lineTo(largo, largo * ancho); ctx.closePath(); ctx.fill(); ctx.restore();
        }
      }
      // corona y brillo
      const cg = ctx.createRadialGradient(s.x, s.y, R * 0.6, s.x, s.y, R * 11);
      cg.addColorStop(0, css(calido, 0.6)); cg.addColorStop(0.12, css(calido, 0.32)); cg.addColorStop(0.4, css(calido, 0.1)); cg.addColorStop(1, css(calido, 0));
      ctx.fillStyle = cg; ctx.fillRect(s.x - R * 11, s.y - R * 11, R * 22, R * 22);
      const bg = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, R * 2.6);
      bg.addColorStop(0, "rgba(255,255,255,.95)"); bg.addColorStop(0.35, css(blanco, 0.55)); bg.addColorStop(1, css(calido, 0));
      ctx.fillStyle = bg; ctx.fillRect(s.x - R * 2.6, s.y - R * 2.6, R * 5.2, R * 5.2);
      ctx.globalCompositeOperation = "source-over";
      // disco
      const dg = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, R);
      dg.addColorStop(0, "#ffffff"); dg.addColorStop(0.78, css(mezclaN(blanco, calido, 0.25))); dg.addColorStop(1, css(mezclaN(blanco, calido, 0.75), 0.9));
      ctx.fillStyle = dg; ctx.beginPath(); ctx.arc(s.x, s.y, R, 0, 6.2832); ctx.fill();
      ctx.restore();
    }
  }
}

/* ---------- nubes (con luz y sombra) ---------- */
// P: { claro, sombra (hex), cob, luz:{dx,dy}, sol:{x,y}, bajo, noche }
export function nubesCanvas(canvas, P) {
  const w = canvas.width, h = canvas.height, g = canvas.getContext("2d");
  const img = g.createImageData(w, h);
  const claro = aRgb(P.claro), sombra = aRgb(P.sombra), naranja = [255, 150, 85], malva = [150, 80, 120];
  const umbral = 0.66 - P.cob * 0.36;
  const alfaMax = 0.5 + 0.4 * P.cob;
  const lx = P.luz.dx * 0.07, ly = P.luz.dy * 0.07;
  for (let j = 0; j < h; j++) {
    const v = j * 0.078, desvanece = 1 - paso(0.68, 1, j / h);
    for (let i = 0; i < w; i++) {
      const u = i * 0.034;
      const d = fbm(u, v, 7, 5);
      const a = paso(umbral, umbral + 0.17, d) * desvanece;
      if (a <= 0.004) continue;
      const l = fbm(u + lx, v + ly, 7, 5);
      const luz = lim(0.55 + (d - l) * 6);
      const borde = a * (1 - a) * 4 * lim((P.luz.dy < 0 ? 0 : 0.4) + 0.5);
      let c = mezclaN(sombra, claro, lim(luz + borde * 0.35));
      const px = i * (P.escala || 3) + (P.origenX || 0), py = j * (P.escala || 3);
      const dist = Math.hypot(px - P.sol.x, py - P.sol.y) / P.ancho;
      const k = Math.exp(-dist * dist * 3.2) * P.bajo;
      if (k > 0.01) c = mezclaN(mezclaN(c, malva, k * 0.35 * (1 - luz)), naranja, k * 0.75 * luz);
      const o = (j * w + i) * 4;
      img.data[o] = c[0]; img.data[o + 1] = c[1]; img.data[o + 2] = c[2];
      img.data[o + 3] = Math.round(255 * lim(a * alfaMax));
    }
  }
  g.putImageData(img, 0, 0);
}

/* ---------- montañas ---------- */
export function pintarMontes(ctx, W, H, P) {
  ctx.clearRect(0, 0, W, H);
  const horiz = aRgb(P.col[2]);
  const capas = [
    { base: 0.795, amp: 0.085, semilla: 21, picos: [[0.84, 0.17, 0.15], [0.3, 0.05, 0.2]], tono: P.montes.lejos, bruma: 0.5, grietas: 0 },
    { base: 0.86, amp: 0.075, semilla: 33, picos: [[0.7, 0.1, 0.14], [0.12, 0.04, 0.18]], tono: P.montes.medio, bruma: 0.3, grietas: 40 },
    { base: 0.92, amp: 0.06, semilla: 45, picos: [[0.93, 0.07, 0.12], [0.4, 0.03, 0.2]], tono: P.montes.cerca, bruma: 0.14, grietas: 70 },
    { base: 0.975, amp: 0.035, semilla: 57, picos: [[0.55, 0.02, 0.25]], tono: P.montes.frente, bruma: 0, grietas: 30 },
  ];
  const paso = Math.max(2, Math.round(W / 220));
  const n = Math.ceil(W / paso) + 1;
  capas.forEach((c, idx) => {
    const ys = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = i * paso, u = x / W;
      const f = fbm(u * 3.4 + c.semilla, 0.5, c.semilla, 5);
      const cresta = 1 - Math.abs(2 * fbm(u * 6 + c.semilla * 1.7, 2.3, c.semilla + 1, 4) - 1);
      let y = c.base * H - c.amp * H * (0.5 * f + 0.7 * cresta);
      for (const [px, alto, ancho] of c.picos) { const d = (u - px) / ancho; y -= alto * H * Math.exp(-d * d) * (0.75 + 0.5 * cresta); }
      ys[i] = y;
    }
    const tono = aRgb(c.tono);
    const arriba = mezclaN(tono, horiz, c.bruma);
    const topY = Math.min(...ys);
    const fill = ctx.createLinearGradient(0, topY, 0, H);
    fill.addColorStop(0, css(arriba)); fill.addColorStop(0.55, css(mezclaN(arriba, tono, 0.7))); fill.addColorStop(1, css(mezclaN(tono, [0, 0, 0], 0.25)));
    ctx.beginPath(); ctx.moveTo(0, H);
    for (let i = 0; i < n; i++) ctx.lineTo(i * paso, ys[i]);
    ctx.lineTo(W, H); ctx.closePath(); ctx.fillStyle = fill; ctx.fill();

    // grietas y quebradas (textura de roca)
    if (c.grietas) {
      const r = mulberry32(c.semilla);
      ctx.save(); ctx.clip();
      for (let k = 0; k < c.grietas; k++) {
        const i = Math.floor(r() * (n - 2)), x = i * paso, y = ys[i], largo = (0.03 + r() * 0.07) * H, desv = (r() - 0.5) * 0.5 * largo, ancho = paso * (0.6 + r() * 1.6);
        const luz = r() < 0.4;
        ctx.fillStyle = luz ? "rgba(255,255,255,0.025)" : "rgba(0,0,10,0.055)";
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + ancho, y + 1); ctx.lineTo(x + desv + ancho * 2, y + largo); ctx.lineTo(x + desv - ancho, y + largo); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }

    // luz de borde: el sol (o la luna) ilumina el filo de las montañas
    if (idx < 3) {
      const aSol = P.dia * lim(0.3 + 0.7 * P.bajo) * (1 - P.cob * 0.7) * (P.sol.vis > 0 ? 1 : 0);
      const aLuna = P.noche * 0.25 * (1 - P.cob * 0.7) * (P.luna.vis > 0 ? 1 : 0);
      for (const [cx, a, color] of [[P.sol.x, aSol, [255, 190, 120]], [P.luna.x, aLuna, [190, 210, 255]]]) {
        if (a < 0.02) continue;
        const lg = ctx.createLinearGradient(cx - W * 0.45, 0, cx + W * 0.45, 0);
        lg.addColorStop(0, css(color, 0)); lg.addColorStop(0.5, css(color, 0.6 * a * (idx === 0 ? 0.7 : 1))); lg.addColorStop(1, css(color, 0));
        ctx.beginPath(); for (let i = 0; i < n; i++) (i ? ctx.lineTo(i * paso, ys[i]) : ctx.moveTo(0, ys[0]));
        ctx.strokeStyle = lg; ctx.lineWidth = 1.5 + (2 - idx) * 0.3; ctx.stroke();
      }
    }
    // bruma entre capas
    if (idx < 3) {
      const bru = ctx.createLinearGradient(0, topY, 0, H * (c.base + 0.1));
      bru.addColorStop(0, css(horiz, 0)); bru.addColorStop(1, css(horiz, 0.22 - idx * 0.06));
      ctx.fillStyle = bru; ctx.fillRect(0, topY, W, H - topY);
    }
  });
}

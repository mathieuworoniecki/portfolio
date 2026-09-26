/* L'accès réservé, côté serveur (Vercel Routing Middleware).
   Tant que le bon code n'a pas été entré, le serveur ne sert AUCUN fichier du site : ni la page, ni les scripts,
   ni les objets 3D. Il renvoie seulement l'écran d'accès ci-dessous (même fond que le site, le nom écrit à la main).
   Le bon code pose un cookie signé (HttpOnly) valable 30 jours, et un petit cookie lisible (pf_ok) qui dit
   à la page de ne pas remontrer son propre écran d'accès.
   Le code n'est pas écrit en clair : on compare son empreinte SHA-256. Pour changer le jeton, définir
   ACCESS_SECRET dans les variables d'environnement du projet Vercel. */
import { next } from '@vercel/functions';

export const config = { matcher: '/((?!_vercel).*)' };

// le code provisoire du développement (à changer : même empreinte dans js/gate.js et index.html)
const CODE_HASH = '0e6a8e0b849ed9b064c5a25e1ee5592f427e3eb9d250e42069ce46147d00e8d4';
// les autres codes acceptés (même accès, même jeton)
const CODE_HASHES = [CODE_HASH];
const COOKIE = 'pf_access', MAX_AGE = 60 * 60 * 24 * 30;

async function sha(s) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
}
const token = () => sha(CODE_HASH + ':' + (process.env.ACCESS_SECRET || 'portfolio-mathieu'));
const cookie = (req, name) => { const m = (req.headers.get('cookie') || '').match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)')); return m ? decodeURIComponent(m[1]) : null; };
const PRIVATE = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' };

export default async function middleware(request) {
  const url = new URL(request.url);
  // la saisie du code
  if (url.pathname === '/__acces') {
    let code = '';
    if (request.method === 'POST') { try { code = String((await request.formData()).get('code') || ''); } catch (e) {} }
    const viaJs = request.headers.get('x-pf-gate') === '1';   // l'écran d'accès vérifie sans recharger, pour animer la sortie
    if (CODE_HASHES.includes(await sha(code.trim().toLowerCase()))) {
      const h = new Headers(viaJs ? { 'Content-Type': 'application/json', ...PRIVATE } : { Location: '/', ...PRIVATE });
      h.append('Set-Cookie', `${COOKIE}=${await token()}; Path=/; Max-Age=${MAX_AGE}; HttpOnly; Secure; SameSite=Lax`);
      h.append('Set-Cookie', `pf_ok=1; Path=/; Max-Age=${MAX_AGE}; Secure; SameSite=Lax`);
      return viaJs ? new Response('{"ok":true}', { status: 200, headers: h }) : new Response(null, { status: 303, headers: h });
    }
    return viaJs ? new Response('{"ok":false}', { status: 401, headers: { 'Content-Type': 'application/json', ...PRIVATE } }) : new Response(null, { status: 303, headers: { Location: '/?e=1', ...PRIVATE } });
  }
  // les fichiers de l'écran d'accès (des traits de pièces, la grille, la craie) : publics
  if (url.pathname.startsWith('/acces/')) return next();
  // déjà entré : le site, normalement
  if (cookie(request, COOKIE) === await token()) return next();
  // sinon : l'écran d'accès pour les pages, rien pour les fichiers
  const isPage = url.pathname === '/' || url.pathname.endsWith('.html') || !/\.[a-z0-9]+$/i.test(url.pathname);
  if (!isPage) return new Response('Accès réservé', { status: 401, headers: PRIVATE });
  const bad = url.searchParams.has('e');
  return new Response(GATE.replace('__BAD__', bad ? 'bad' : '').replace('__MSG__', bad ? 'Ce n\u2019est pas le bon code.' : ''), { status: 401, headers: { 'Content-Type': 'text/html; charset=utf-8', ...PRIVATE } });
}

const GATE = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<title>Mathieu — Accès réservé</title>
<link rel="icon" href="/acces/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/acces/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Caveat:wght@600&family=Architects+Daughter&family=IBM+Plex+Mono:wght@500&display=swap">
<script>try{var c=localStorage.getItem('pf-theme-css');if(c)c.split(/;(?![^(]*\\))/).forEach(function(p){var i=p.indexOf(':');if(i>0&&p.slice(0,i)!=='color-scheme')document.documentElement.style.setProperty(p.slice(0,i),p.slice(i+1))})}catch(e){}</script>
<style>
:root{--ink:34,36,40;--bp:#DADBD8;--bp-deep:#C4C6C2;--bp-hi:#E8E9E6}
*{box-sizing:border-box}
html,body{margin:0;height:100%;color:rgb(var(--ink));font-family:"IBM Plex Mono",ui-monospace,monospace}
body{background-color:var(--bp);background-image:radial-gradient(ellipse at 50% 40%,var(--bp-hi) 0%,var(--bp) 45%,var(--bp-deep) 100%);display:flex;overflow:hidden;flex-direction:column;align-items:center;justify-content:center;gap:1.4rem;padding:0 22px;text-align:center}
canvas{position:fixed;inset:0;width:100%;height:100%;pointer-events:none}
#grid{z-index:0}#debris,#obj{z-index:1}
.gate-name,.kick,form{position:relative;z-index:2;transition:opacity .7s ease,transform .8s cubic-bezier(.6,0,.2,1)}
.leaving .gate-name,.leaving .kick,.leaving form{opacity:0;transform:scale(.96)}
.tick path{fill:none;stroke:rgb(var(--ink));stroke-width:4;stroke-linecap:round;stroke-dasharray:1;stroke-dashoffset:1;opacity:0}
.good .tick path{opacity:1;animation:draw .5s ease forwards}
.good input{opacity:.6!important}
body::after{content:"";position:fixed;inset:12px;border:1px solid rgba(var(--ink),.55);pointer-events:none}
@keyframes draw{to{stroke-dashoffset:0}}
.gate-name{margin:0;font:400 clamp(2.6rem,7vw,4.4rem)/1 "Architects Daughter","Caveat",cursive;letter-spacing:.02em;opacity:0;animation:in 1.2s ease .2s forwards}
.kick{margin:0;font:600 clamp(1.6rem,3vw,2.2rem)/1 "Caveat","Segoe Print",cursive;opacity:0;animation:in .8s ease 1.6s forwards}
@keyframes in{to{opacity:.95}}
form{display:flex;flex-direction:column;align-items:center;gap:.9rem}
.field{position:relative;width:min(320px,80vw);height:76px}
.gate-box{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
.gate-box path{fill:none;stroke:rgb(var(--ink));stroke-width:2.2;stroke-linecap:round;stroke-dasharray:1;stroke-dashoffset:1;animation:draw 1.4s cubic-bezier(.6,0,.2,1) 2s forwards}
input{all:unset;box-sizing:border-box;position:absolute;inset:0;width:100%;text-align:center;font:600 2rem/76px "Caveat","Segoe Print",cursive;letter-spacing:.3em;color:rgb(var(--ink));caret-color:rgb(var(--ink));opacity:0;animation:in .6s ease 2.6s forwards}
input::selection{background:rgba(var(--ink),.22);color:rgb(var(--ink))}
input::placeholder{color:rgba(var(--ink),.35);letter-spacing:.1em}
button{all:unset;cursor:pointer;padding:.6rem 1.2rem;font:500 .72rem/1 "IBM Plex Mono",monospace;letter-spacing:.2em;text-transform:uppercase;border-bottom:1.5px solid rgba(var(--ink),.7);opacity:0;animation:in .6s ease 3s forwards;transition:letter-spacing .3s}
button:hover,button:focus-visible{letter-spacing:.28em}
.msg{margin:0;min-height:1.4em;font:600 1.3rem/1 "Caveat","Segoe Print",cursive}
.bad .field{animation:shake .5s cubic-bezier(.36,.07,.19,.97) 3.2s}
.bad.shake .field{animation:shake .5s cubic-bezier(.36,.07,.19,.97)}
@keyframes shake{10%,90%{transform:translateX(-2px)}20%,80%{transform:translateX(4px)}30%,50%,70%{transform:translateX(-8px)}40%,60%{transform:translateX(8px)}}
@media (prefers-reduced-motion:reduce){*{animation-duration:.01s!important;animation-delay:0s!important}}
</style>
</head>
<body class="__BAD__">
<canvas id="grid" aria-hidden="true"></canvas><canvas id="debris" aria-hidden="true"></canvas><canvas id="obj" aria-hidden="true"></canvas>
<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs><filter id="chalk-rough"><feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves="2" seed="3"/><feDisplacementMap in="SourceGraphic" scale="2.2"/></filter></defs></svg>
<p class="gate-name">Mathieu</p>
<p class="kick">Accès réservé</p>
<form method="post" action="/__acces" autocomplete="off">
  <div class="field"><svg class="tick" viewBox="0 0 320 76" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%;overflow:visible" aria-hidden="true"><path pathLength="1" d="M292 34 L302 46 L322 16"/></svg><svg class="gate-box" viewBox="0 0 320 76" preserveAspectRatio="none" aria-hidden="true"><g filter="url(#chalk-rough)"><path pathLength="1" d="M8 66 C 80 63, 170 69, 312 64"/></g></svg><input name="code" type="password" autocapitalize="off" spellcheck="false" placeholder="code" aria-label="Code d'accès" autofocus></div>
  <button type="submit">Entrer</button>
  <p class="msg" aria-live="polite">__MSG__</p>
</form>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script><script src="/acces/chalk.js"></script><script src="/acces/grid.js"></script><script src="/acces/objects3d.js"></script><script src="/acces/gate.js"></script>
</body>
</html>`;

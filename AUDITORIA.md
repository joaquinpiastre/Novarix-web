# Auditoría del sitio Novarix (novarix.agency)

Fecha del relevamiento: 2026-09-17
Alcance: sitio público (Next.js 14, export estático, `app/`, `components/`, `lib/`). El panel interno (`panel/`) se menciona solo donde es relevante (formulario de contacto).

Metodología: lectura completa del código fuente, build de producción (`npm run build`) inspeccionando el HTML generado en `out/`, `npm audit`, y verificación en vivo de `novarix.agency` y de los links externos del footer (LinkedIn, GitHub, Ceramicasa).

Ningún archivo fue modificado. Todo lo listado abajo está confirmado leyendo el código o el build, salvo que diga explícitamente "a confirmar con vos".

---

## 🔴 CRÍTICO

### Formulario de contacto no envía nada a ningún lado
- [ ] `components/ContactForm.tsx:80-87` — el submit hace `await new Promise(r => setTimeout(r, 1400))` y después muestra "¡Mensaje enviado!". No hay fetch, no hay API, no hay email, no hay webhook. **Todo lead que llena el formulario se pierde**, y el visitante cree que fue recibido.
- [ ] El sitio es un export estático (`output: "export"` en `next.config.js`) servido por FTP en Hostinger, así que no puede tener API routes propias. Hay que resolverlo con un servicio externo (Formspree, Resend/SendGrid vía función serverless, un webhook a algo tipo Make/Zapier, o pegarlo a la base del `panel/` que ya existe en Railway).
- [ ] No hay ningún dato de contacto (email, WhatsApp) pre-cargado como fallback en el propio formulario si el envío llegara a fallar.

### LinkedIn del footer apunta a una empresa que no es Novarix
- [ ] `components/Footer.tsx:14` — `https://linkedin.com/company/novarix` **no es la página de Novarix**: resuelve a "Meridien Equities", una iniciativa estudiantil de Singapur sin relación con la agencia. Hoy cualquiera que haga clic en "LinkedIn" desde el sitio termina en la página de otra empresa.

### Instagram y Facebook del footer son placeholders (no son perfiles reales)
- [ ] `components/Footer.tsx:15-16` — los links "Instagram" y "Facebook" apuntan los dos a `https://novarix.agency/` (el propio home), no a perfiles de redes sociales. Si no existen esas cuentas, sacar los links; si existen, cargar las URLs reales.

### Next.js 14.2.3 con vulnerabilidad crítica de RCE
- [ ] `npm audit`: **14 vulnerabilidades (1 crítica, 11 altas, 1 moderada, 1 baja)**.
  - Next.js: *Unauthenticated Remote Code Execution on Windows-hosted servers* ([GHSA-p293-qw3h-jr36](https://github.com/advisories/GHSA-p293-qw3h-jr36)).
  - Next.js: *Unauthenticated RCE en la API de optimización de imágenes con AVIF* ([GHSA-2xp9-vwfh-vxw4](https://github.com/advisories/GHSA-2xp9-vwfh-vxw4)).
  - PostCSS: XSS y path traversal (varias CVEs, severidad alta).
  - **Fix disponible sin cambios breaking**: `npm audit fix` sube Next a `14.2.35` (mismo major, patch de seguridad). Recomiendo aplicarlo cuanto antes.

---

## 🟡 IMPORTANTE

### Contenido
- [x] **Año del footer hardcodeado** — resuelto: ahora usa `new Date().getFullYear()`, se actualiza solo en cada build/deploy.
- [ ] **"Consultoría IT" como servicio propio**: aparece destacado en Home (`app/page.tsx`) y tiene su propio bloque en Servicios (`app/servicios/page.tsx`), pero no está en tu lista de servicios actuales (dev a medida, automatizaciones IA, CRM, marketing digital). A confirmar: ¿lo seguís ofreciendo como línea separada o hay que sacarlo/fusionarlo?
- [ ] **Automatizaciones de IA incompletas en el copy**: todo el sitio habla solo de "responde tu WhatsApp" (Home y Servicios). No se menciona Instagram ni Facebook en ningún lado, a pesar de que vos los mencionás como parte de la oferta real de bots.
- [ ] **GitHub del footer vacío**: `https://github.com/novarix` existe pero no tiene repos públicos. Si no se usa activamente, mejor sacarlo del footer (un perfil vacío no suma).
- [x] **NYR Funeraria eliminada de la web** — ya no es cliente activo. Se sacó su testimonio de la Home (`app/page.tsx`) y su caso de estudio de `/trabajo` (`app/trabajo/page.tsx`).
- [ ] **Caso "Más organizaciones y proyectos"** en `/trabajo` (`app/trabajo/page.tsx:65-75`) es genérico, sin cliente ni resultado concreto — se lee como relleno al lado de los otros 4 casos reales.
- [ ] **Cero soporte visual en todo el sitio**: no hay ni una sola imagen de contenido (ni screenshots de los productos entregados, ni logos de clientes, ni fotos del equipo/local). `public/` está vacío salvo un `.gitkeep`. Para un portfolio esto pesa mucho — hoy todo son textos e íconos SVG decorativos.
- [ ] **Testimonios con nombre y apellido/institución** (Ceramicasa, Hospital Español del Sur, NYR Funeraria, Tirua): confirmar que cada uno autorizó explícitamente que su cita se publique así en la web.
- [ ] **Assets huérfanos en la raíz del repo**: `logo.png` y `Novarix 1080X1920.png` no se usan en ningún lado del código (el logo del sitio es texto con gradiente, `components/BrandLogo.tsx`, no una imagen). O se usan (ej. como logo real / imagen OG) o se limpian del repo.

### SEO y metadatos
- [ ] **Bug de título en la home**: en el build (`out/index.html`) el `<title>` de la home sale como **"Inicio"** a secas, mientras que el resto de páginas sí arma bien el template (`"Servicios | Novarix Digital Agency"`, `"Contacto | Novarix Digital Agency"`, etc., verificado en el HTML generado). Es inconsistente y le resta marca al resultado en buscadores para la página más importante del sitio.
- [ ] **Sin imagen Open Graph / Twitter en ninguna página**: no hay `og:image` ni `twitter:image` en ninguno de los 5 `<head>` generados. Al compartir cualquier link de novarix.agency en WhatsApp, LinkedIn, Instagram o Facebook, no se va a ver ninguna imagen de preview.
- [ ] **No existe `sitemap.xml`** en ningún lado (ni `app/sitemap.ts`, ni en `public/`, ni en el build final).
- [ ] **No existe `robots.txt`**.
- [ ] **No hay `rel="canonical"`** en ninguna de las 5 páginas (confirmado inspeccionando el HTML generado).
- [ ] **Sin Schema.org / JSON-LD** (LocalBusiness u Organization) a pesar de tener dirección física real (`Alsina 2095, San Rafael, Mendoza`). Se está perdiendo la chance de rich snippets y de reforzar el SEO local.
- [ ] **Contadores animados muestran "0" en el HTML estático**: "+3 años", "+15 proyectos", "100%" y "+6 rubros" se renderizan como `+0 años`, `0%`, etc. en el HTML que ve un crawler o un usuario sin JavaScript (confirmado en `out/index.html`). Solo se "llenan" con los valores reales cuando corre el JS de Framer Motion en el navegador.

### Técnico
- [ ] **`postcss` desatualizado** con varias vulnerabilidades altas (XSS, path traversal) — se resuelve junto con el fix de Next.
- [ ] **Gran parte del contenido depende del JS para ser visible**: casi todas las secciones están envueltas en `ScrollReveal` (Framer Motion), que en el SSR arranca con `style="opacity:0; transform:..."` inline. Si el JS tarda en cargar, falla, o el usuario tiene una conexión lenta, esas secciones quedan invisibles hasta que el observer dispara la animación. Es un riesgo real de "flash de contenido invisible" y pega en Core Web Vitals.
- [ ] **Sin analytics ni pixel de conversión**: no encontré Google Analytics, GTM ni Meta Pixel en ningún layout/página. Si están corriendo o van a correr campañas de Ads, hoy no hay forma de medir qué trae leads y qué no.
- [ ] Dependencias desactualizadas (no urgentes, para roadmap): Next 14→16, React 18→19, Tailwind 3→4, ESLint 8→10 (estos últimos son upgrades mayores con posibles breaking changes).

### UX / Diseño
- [ ] **Sin página de agradecimiento / confirmación real** post-envío de formulario más allá del estado de éxito in-page (ligado al punto crítico del formulario).
- [ ] **Sin "skip to content"** para navegación por teclado; el header es `fixed`, así que un usuario de teclado tiene que tabular por toda la navbar en cada página antes de llegar al contenido.
- [ ] Botón de menú mobile (`components/Navbar.tsx:76-101`) tiene `aria-expanded` y `aria-label` pero le falta `aria-controls` apuntando al `<ul>` que despliega.

---

## 🟢 NICE TO HAVE

- [ ] `README.md` del repo tiene el encoding roto (se lee como texto corrupto) — limpiarlo o reescribirlo.
- [ ] Warning de build: *"Browserslist: browsers data (caniuse-lite) is 6 months old"* → correr `npx update-browserslist-db@latest`.
- [ ] `next.config.js` tiene `images.unoptimized: true` (necesario por el export estático). Hoy no importa porque no hay imágenes de contenido, pero el día que suban fotos/screenshots van a tener que optimizarlas a mano antes de subirlas (compresión, WebP/AVIF, tamaños) porque Next no lo va a hacer automáticamente en este modo.
- [ ] No hay página 404 personalizada (`app/not-found.tsx`) — usa la genérica de Next.
- [ ] No hay `manifest.json` / `apple-touch-icon` para PWA / instalación en home screen (solo `icon.svg`).
- [ ] Si en algún momento suman blog o contenido editorial para SEO, hoy no existe ninguna sección de recursos/blog.

---

## ✅ Cosas que están bien (revisado y sin problemas)

- Jerarquía de headings correcta: un solo `<h1>` por página, `h2`/`h3` bien anidados, en las 5 páginas.
- Contraste de color texto secundario (`#a78bca`) sobre fondo (`#0a0118`) ≈ 7:1 — cumple AA cómodamente.
- Estados de foco bien implementados con `:focus-visible` (no se pierde el outline para teclado).
- Todas las secciones "hero" usan `overflow-hidden`, así que los blobs decorativos no generan scroll horizontal en mobile (revisado en las 5 páginas).
- Los SVGs decorativos están correctamente marcados con `aria-hidden`.
- No se encontró texto placeholder/Lorem Ipsum ni comentarios `TODO`/`FIXME` olvidados en el código del sitio público.
- El link de Ceramicasa (`ceramicasasanrafael.com`) en `/trabajo` funciona y corresponde al negocio real.
- `npm run build` compila sin errores de TypeScript ni warnings de ESLint.
- Fuentes (`Inter`, `Outfit`) autohospedadas vía `next/font/google` — evita requests bloqueantes a Google Fonts.
- CTAs bien distribuidos: Hero, sección de WhatsApp, cierre de Home, Servicios, Trabajo y Navbar siempre llevan a `/contacto`.
- Tamaño de botón del menú mobile (44×44px) cumple con el tamaño mínimo de tap target recomendado.

---

## Próximos pasos sugeridos

Cuando revises esta lista, decime con cuáles querés que arranque y en qué orden. Mi sugerencia de secuencia sería:

1. Arreglar el formulario de contacto (crítico, es plata perdida en leads).
2. Sacar/corregir los links de redes sociales del footer.
3. `npm audit fix` para las vulnerabilidades de Next/PostCSS.
4. Fix del título de la home + agregar `og:image`, `sitemap.xml`, `robots.txt` y canonical.
5. El resto según prioridad de negocio.

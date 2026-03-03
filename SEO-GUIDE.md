# Guía SEO para LeafStrength

**Autor**: Manu Montaraz  
**Contacto**: contacto@manumontaraz.es  
**Licencia**: AGPL-3.0

## Resumen de Optimizaciones Implementadas

### 1. Meta Tags Básicos ✓
- Title optimizado
- Description completa
- Keywords relevantes
- Author: Manu Montaraz
- Canonical URL

### 2. Open Graph / Social Media ✓
- og:type, og:url, og:title, og:description, og:image
- Twitter Cards (twitter:card, twitter:title, etc.)
- og:locale para español
- og:site_name: "LeafStrength by Manu Montaraz"

### 3. Favicons y PWA ✓
- ✅ Favicon SVG (`icon.svg`) - Icono vectorial principal
- Apple touch icon PNG (requerido por iOS)
- Fallbacks PNG 192x192 y 512x512 (compatibilidad)
- Web App Manifest con datos del autor
- Theme colors
- Service Worker

**Nota:** Usamos SVG como icono principal (escalable y optimizado) con PNGs solo como fallback.

### 4. Archivos de Configuración ✓
- robots.txt
- sitemap.xml
- .htaccess (Apache)
- humans.txt (Manu Montaraz)
- security.txt (contacto@manumontaraz.es)

### 5. Datos Estructurados ✓
- Schema.org WebApplication
- Author: Person (Manu Montaraz)
- License: AGPL-3.0
- FeatureList completa

### 6. Rendimiento ✓
- Preconnect a CDN
- DNS prefetch
- Compresión gzip (en .htaccess)
- Cache de recursos estáticos

## Información del Autor

- **Nombre**: Manu Montaraz
- **Email**: contacto@manumontaraz.es
- **Web**: https://manumontaraz.es
- **Licencia**: AGPL-3.0 (Software Libre)

## Pasos Adicionales Recomendados

### 1. Imágenes de Previsualización
**Mínimo necesario (7 archivos):**

**Iconos (5 archivos):**
- ✅ `icon.svg` - Icono principal en formato vectorial (ya creado)
- `icon-192.png` (192x192) - Fallback PNG para navegadores antiguos
- `icon-512.png` (512x512) - Fallback PNG para instalación PWA
- `apple-touch-icon.png` (180x180) - Requerido por iOS
- `favicon.ico` - Fallback para navegadores muy antiguos
- `mstile-150x150.png` (150x150) - Para IE/Edge en Windows

**Para compartir (1 archivo):**
- `og-image.png` (1200x630px) - Imagen al compartir en redes sociales

**Capturas PWA opcionales (2 archivos):**
- `screenshot-wide.png` (1280x720px) - Para stores/desktop
- `screenshot-narrow.png` (750x1334px) - Para stores/móvil

**Nota:** El SVG (`icon.svg`) se usa como icono y favicon principal. Los demás archivos son fallbacks para máxima compatibilidad (IE/Edge, iOS, navegadores antiguos).

### 2. Google Search Console
1. Ve a https://search.google.com/search-console
2. Añade tu propiedad: `https://leafstrength.app`
3. Verifica mediante:
   - Archivo HTML (renombra `googleXXXXXXXXXXXXXXXX.html` con tu código)
   - Tag meta (copia el código de verificación)
   - DNS TXT

### 3. Google Analytics (opcional)
```html
<!-- Añadir antes de </head> -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

### 4. Rich Results Test
Probar los datos estructurados en:
https://search.google.com/test/rich-results

### 5. Mobile-Friendly Test
Verificar que es responsive:
https://search.google.com/test/mobile-friendly

### 6. PageSpeed Insights
Optimizar velocidad:
https://pagespeed.web.dev/

### 7. Backlinks (SEO Off-page)
- Crear perfil en GitHub con link al proyecto
- Compartir en redes sociales fitness
- Foros de culturismo y fitness
- Directorios de aplicaciones PWA

### 8. Contenido Regular
Considerar añadir:
- Blog con consejos de entrenamiento
- Página de FAQ
- Guía de uso
- Changelog

## URLs Importantes para Indexar

Asegúrate de que estas URLs funcionen:
- https://leafstrength.app/
- https://leafstrength.app/sitemap.xml
- https://leafstrength.app/robots.txt
- https://leafstrength.app/site.webmanifest
- https://leafstrength.app/humans.txt

## Verificación Final

Usa estas herramientas para verificar todo:

1. **Meta Tags**: https://metatags.io/
2. **Open Graph**: https://www.opengraph.xyz/
3. **Twitter Cards**: https://cards-dev.twitter.com/validator
4. **PWA**: https://web.dev/measure/
5. **Estructura**: https://validator.schema.org/

## Actualización del Sitemap

Cuando hagas cambios importantes:
1. Actualiza `<lastmod>` en sitemap.xml
2. Notifica a Google Search Console
3. Solicita reindexación

## Notas Importantes

- La app funciona completamente en cliente (no requiere servidor)
- Los datos se guardan en LocalStorage (no base de datos externa)
- Es una PWA: se puede instalar en móviles y usar offline
- El dominio debe tener SSL (HTTPS) para PWA
- **Licencia**: AGPL-3.0 - Software libre y de código abierto

---

**Desarrollado por Manu Montaraz** 🌿  
contacto@manumontaraz.es
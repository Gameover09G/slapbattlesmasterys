/**
 * Cloudflare Worker — Proxy para la API de Roblox
 * 
 * INSTRUCCIONES DE INSTALACIÓN (gratis, 5 minutos):
 * 
 * 1. Ve a https://dash.cloudflare.com y crea una cuenta gratuita
 * 2. En el menú lateral ve a "Workers & Pages" → "Create"
 * 3. Elige "Create Worker", dale un nombre (p.ej. "slap-proxy")
 * 4. Haz clic en "Edit code" y pega TODO este archivo
 * 5. Haz clic en "Deploy"
 * 6. Copia la URL que te da (algo como https://slap-proxy.TU_USUARIO.workers.dev)
 * 7. Abre slapbattlesmasterys.html, busca esta línea cerca del final:
 *      const PROXY_BASE_URL = 'https://slap-proxy.YOUR_SUBDOMAIN.workers.dev';
 *    y cámbiala por tu URL real. Guarda y sube a GitHub Pages.
 * 
 * Plan gratuito: 100.000 peticiones/día — más que suficiente.
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept',
};

export default {
  async fetch(request) {
    /* Preflight CORS */
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const path = url.pathname; // e.g. /users/v1/usernames/users
                               //      /badges/v1/users/123/badges/awarded-dates

    /* Determinar subdominio de Roblox a partir del primer segmento del path */
    const parts = path.split('/').filter(Boolean); // ['users','v1','usernames','users']
    if (parts.length < 2) {
      return json({ error: 'Ruta inválida. Formato esperado: /SUBDOMINIO/ruta...' }, 400);
    }

    const subdomain  = parts[0];                       // 'users' | 'badges'
    const robloxPath = '/' + parts.slice(1).join('/'); // '/v1/usernames/users'
    const robloxUrl  = `https://${subdomain}.roblox.com${robloxPath}${url.search}`;

    /* Solo permitimos los subdominios necesarios */
    const ALLOWED = ['users', 'badges'];
    if (!ALLOWED.includes(subdomain)) {
      return json({ error: `Subdominio no permitido: ${subdomain}` }, 403);
    }

    try {
      const init = {
        method: request.method,
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      };
      if (request.method === 'POST') {
        init.body = await request.text();
      }

      const robloxRes = await fetch(robloxUrl, init);
      const body      = await robloxRes.text();

      return new Response(body, {
        status: robloxRes.status,
        headers: {
          ...CORS_HEADERS,
          'Content-Type': 'application/json',
        },
      });
    } catch (err) {
      return json({ error: 'Error interno del proxy: ' + err.message }, 500);
    }
  }
};

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

#!/usr/bin/env node
// Demo del Sprint 1 contra staging: muestra los criterios de aceptación del backend que no tienen pantalla todavía.
// Uso: node scripts/demo-sprint1.mjs [url-api]   (por defecto, staging en Render)
// Solo usa los usuarios sintéticos del seed. Deja bloqueada 15 minutos la cuenta profesor2 (paso 6).
const API = (process.argv[2] ?? 'https://calisfacu-api-staging.onrender.com').replace(/\/$/, '');
const CLAVE = process.env.SEED_PASSWORD ?? 'Calis2026!';

async function llamar(metodo, ruta, { token, cuerpo } = {}) {
  const r = await fetch(`${API}/api${ruta}`, {
    method: metodo,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  const texto = await r.text();
  let datos;
  try {
    datos = JSON.parse(texto);
  } catch {
    datos = texto;
  }
  return { estado: r.status, datos };
}

async function ingresar(email, contrasena = CLAVE) {
  const r = await llamar('POST', '/auth/login', { cuerpo: { email, contrasena } });
  if (r.estado !== 201 && r.estado !== 200)
    throw new Error(`No se pudo ingresar como ${email}: ${r.estado}`);
  return r.datos.token;
}

function paso(titulo, criterio) {
  console.log(`\n=== ${titulo}  [${criterio}]`);
}

function mostrar(r, esperado) {
  const ok = r.estado === esperado ? 'OK' : `DISTINTO (se esperaba ${esperado})`;
  const mensaje =
    typeof r.datos === 'object' && r.datos?.message ? ` · ${JSON.stringify(r.datos.message)}` : '';
  console.log(`HTTP ${r.estado} ${ok}${mensaje}`);
}

paso('0. Versión desplegada', 'smoke test');
const salud = await llamar('GET', '/salud');
console.log(salud.datos);

const profesor = await ingresar('profesor@calisfacu.test');
const secretaria = await ingresar('secretaria@calisfacu.test');
const admin = await ingresar('admin@calisfacu.test');

paso('1. La secretaria intenta registrar notas', 'US-17 CA 2: 403 sin modificar datos');
mostrar(
  await llamar('POST', '/notas/planilla', {
    token: secretaria,
    cuerpo: { actividadId: 1, notas: [{ estudianteId: 1, valor: 90 }] },
  }),
  403,
);

paso('2. Dimensiones de la gestión 2026', 'US-18 CA 6: RM 001/2026');
const dims = await llamar('GET', '/gestiones/1/dimensiones', { token: profesor });
console.table(dims.datos.map(({ codigo, puntajeMaximo }) => ({ codigo, puntajeMaximo })));

paso('3. El administrador configura dimensiones que suman 95', 'US-18 CA 6: deben sumar 100');
const cambio = dims.datos.map(({ codigo, nombre, puntajeMaximo, orden }) => ({
  codigo,
  nombre,
  puntajeMaximo: codigo === 'SER' ? 5 : puntajeMaximo,
  orden,
}));
mostrar(
  await llamar('PUT', '/gestiones/1/dimensiones', {
    token: admin,
    cuerpo: { dimensiones: cambio },
  }),
  400,
);

paso('4. El administrador cambia puntajes de una gestión que ya tiene notas', 'US-18 CA 7: 422');
const equilibrado = cambio.map((d) =>
  d.codigo === 'AUTOEVALUACION' ? { ...d, puntajeMaximo: 10 } : d,
);
mostrar(
  await llamar('PUT', '/gestiones/1/dimensiones', {
    token: admin,
    cuerpo: { dimensiones: equilibrado },
  }),
  422,
);

paso('5. Nota trimestral calculada (materia 1, trimestre 1)', 'US-02 CA 1–3 y 6');
const notas = await llamar('GET', '/calculo/materias/1/trimestres/1', { token: profesor });
console.table(
  notas.datos.slice(0, 8).map((n) => ({
    estudiante: n.estudiante,
    nota: n.nota ?? 'pendiente',
    aprobado: n.aprobado ?? '—',
    pendientes: n.pendientes.join(', '),
  })),
);

paso('6. Cinco contraseñas incorrectas y después la correcta', 'US-17 CA 3: bloqueo de 15 minutos');
for (let i = 1; i <= 5; i++) {
  const r = await llamar('POST', '/auth/login', {
    cuerpo: { email: 'profesor2@calisfacu.test', contrasena: 'incorrecta' },
  });
  console.log(`intento ${i}: HTTP ${r.estado}`);
}
const bloqueado = await llamar('POST', '/auth/login', {
  cuerpo: { email: 'profesor2@calisfacu.test', contrasena: CLAVE },
});
console.log('con la contraseña correcta:');
mostrar(bloqueado, 401);

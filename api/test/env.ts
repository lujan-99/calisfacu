// Variables para las pruebas. DATABASE_URL la define Jenkins (base desechable por build) o el desarrollador.
process.env.JWT_SECRET ??= 'secreto-solo-para-pruebas';
process.env.DATABASE_URL ??= 'postgresql://calis:calis@localhost:55432/calis_test';
process.env.NODE_ENV ??= 'test';
process.env.REDIS_URL ??= 'redis://localhost:6379';
// CAL-003: las suites inician sesión muchas veces desde 127.0.0.1; seguridad.e2e-spec.ts prueba el límite.
process.env.LIMITE_LOGIN_POR_MINUTO ??= '0';

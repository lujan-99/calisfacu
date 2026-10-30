// Variables para las pruebas. DATABASE_URL la define Jenkins (base desechable por build) o el desarrollador.
process.env.JWT_SECRET ??= 'secreto-solo-para-pruebas';
process.env.DATABASE_URL ??= 'postgresql://calis:calis@localhost:55432/calis_test';
process.env.NODE_ENV ??= 'test';
process.env.REDIS_URL ??= 'redis://localhost:6379';

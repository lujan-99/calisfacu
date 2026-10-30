import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';

/** Configuración común de la aplicación: la usan main.ts y las pruebas e2e. */
export function configurarApp(app: INestApplication): INestApplication {
  const produccion = process.env.NODE_ENV === 'production';
  // Revisión OWASP del Sprint 3 (H1, A05): cabeceras de seguridad y sin x-powered-by. La API solo responde JSON, PDF e
  // imágenes, así que su CSP no permite cargar nada; fuera de producción se omite para que funcione Swagger.
  app.use(
    helmet({
      contentSecurityPolicy: produccion
        ? { useDefaults: false, directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } }
        : false,
      frameguard: { action: 'deny' },
      // La web (otro subdominio de onrender.com, otro sitio) muestra el logo con <img>: same-origin lo bloquearía.
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  app.enableCors({ origin: (process.env.CORS_ORIGINS ?? 'http://localhost:5173').split(',') });
  if (!produccion) {
    const doc = new DocumentBuilder()
      .setTitle('CalisFacu API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, doc));
  }
  return app;
}

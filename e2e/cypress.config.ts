import { defineConfig } from 'cypress';

// Escenarios E2E críticos (métrica M02). Se ejecutan contra staging en la etapa E2E del Jenkinsfile:
//   npx cypress run --project e2e --config baseUrl=$STAGING_WEB_URL
// Usuarios del seed sintético (api/prisma/seed.ts): contraseña en CYPRESS_SEED_PASSWORD.
export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:5173',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    supportFile: 'cypress/support/e2e.ts',
    video: true,
    defaultCommandTimeout: 15000,
    env: {
      profesorEmail: 'profesor@calisfacu.test',
      secretariaEmail: 'secretaria@calisfacu.test',
      padreEmail: 'padre@calisfacu.test',
    },
  },
});

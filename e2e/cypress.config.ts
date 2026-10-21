import { defineConfig } from 'cypress';
import ExcelJS from 'exceljs';

// Escenarios E2E críticos (métrica M02). Se ejecutan contra staging en la etapa E2E del Jenkinsfile:
//   npx cypress run --project e2e --config baseUrl=$STAGING_WEB_URL
// Usuarios del seed sintético (api/src/database/seed.ts): contraseña en CYPRESS_SEED_PASSWORD.
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
      adminEmail: 'admin@calisfacu.test',
      padreEmail: 'padre@calisfacu.test',
    },
    setupNodeEvents(on) {
      on('task', {
        /**
         * US-05: completa la plantilla .xlsx que entrega la API (en base64). Pone 85 al primer estudiante, 120 al
         * segundo (fuera de escala) y agrega un RUDE que no existe. Así sirve con los RUDE de cualquier base.
         */
        async llenarPlantilla(base64: string) {
          const libro = new ExcelJS.Workbook();
          await libro.xlsx.load(Buffer.from(base64, 'base64') as unknown as ExcelJS.Buffer);
          const hoja = libro.getWorksheet('Notas')!;
          hoja.getCell('C2').value = 85;
          hoja.getCell('C3').value = 120;
          hoja.addRow(['NOEXISTE999', 'Estudiante inexistente', 90]);
          return Buffer.from(await libro.xlsx.writeBuffer()).toString('base64');
        },
      });
    },
  },
});

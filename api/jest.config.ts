// Pruebas de la API (SQAP, Sección 7).
//  - unit: *.spec.ts junto al código; no necesitan base de datos (pre-push y `npm test`).
//  - e2e:  test/*.e2e-spec.ts contra PostgreSQL real (DATABASE_URL).
// `npm run test:cov` ejecuta ambos proyectos y exige la cobertura de M06 sobre el resultado combinado.
import type { Config } from 'jest';

const comun = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  moduleFileExtensions: ['ts', 'js', 'json'],
};

const config: Config = {
  projects: [
    {
      ...comun,
      displayName: 'unit',
      testMatch: ['<rootDir>/src/**/*.spec.ts'],
      setupFiles: ['<rootDir>/test/env.ts'],
    },
    {
      ...comun,
      displayName: 'e2e',
      testMatch: ['<rootDir>/test/**/*.e2e-spec.ts'],
      globalSetup: '<rootDir>/test/global-setup.ts',
      setupFiles: ['<rootDir>/test/env.ts'],
    },
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.module.ts',
    '!src/main.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.dto.ts',
    '!src/database/migrations/**',
    '!src/database/seed.ts',
    '!src/database/data-source.ts',
    '!src/database/reiniciar.ts',
  ],
  // Las suites e2e comparten una sola base de datos: se ejecutan de a una.
  maxWorkers: 1,
  coverageReporters: ['lcov', 'text-summary', 'cobertura'],
  coverageThreshold: {
    global: {}, // el umbral global (80 % en código nuevo, M05) lo exige el Quality Gate de SonarQube Cloud
    // M06: el mismo 90 de la Tabla de métricas del SQAP (Sección 5)
    './src/modules/notas/': { lines: 90 },
    './src/modules/calculo/': { lines: 90 },
    './src/modules/auditoria/': { lines: 90 },
    './src/modules/auth/': { lines: 90 },
  },
  reporters: [
    'default',
    ['jest-junit', { outputDirectory: 'reports', outputName: 'junit-api.xml' }],
  ],
};

export default config;

// Jenkinsfile — job Multibranch Pipeline "calisfacu" (ramas, pull requests y etiquetas).
// Flujo de ramas (docs/desarrollo/flujo-git.md): feature/* y fix/* → develop (staging) → main (producción).
pipeline {
  agent any
  options {
    timestamps()
    timeout(time: 45, unit: 'MINUTES')
    buildDiscarder(logRotator(numToKeepStr: '30'))         // Sección 12: últimos 30 builds
    disableConcurrentBuilds()
  }
  environment {
    PGHOST = 'postgres-ci'                                 // base de CI desechable
    PGUSER = 'calis'
    PGPASSWORD = 'calis'
    DB_NAME = "ci_${env.BUILD_TAG.replaceAll('[^A-Za-z0-9]', '_').toLowerCase()}"
    DATABASE_URL = "postgresql://calis:calis@postgres-ci:5432/${env.DB_NAME}"
    REDIS_URL = 'redis://redis-ci:6379'
  }
  stages {
    stage('Instalar') { steps { sh 'node -v && npm ci' } }
    stage('Lint') {                                        // M16
      steps { sh 'npx eslint . --max-warnings=0 && npx prettier --check .' }
    }
    stage('Pruebas') {
      parallel {
        stage('API') {                                     // M01, M06, M09, M15
          steps {
            sh 'createdb "$DB_NAME"'
            // Unitarias + e2e contra PostgreSQL (migraciones aplicadas en el globalSetup de Jest).
            // Incluye calculo.casos (M01), autorizacion (M09), auditoria (M15) y coverageThreshold (M06).
            sh 'npm run -w api test:cov'
          }
          post {
            always {
              junit 'api/reports/*.xml'                    // build sano: informe publicado
              sh 'dropdb --if-exists "$DB_NAME"'
            }
          }
        }
        stage('Web') {
          steps { sh 'npm run -w web test -- --run --coverage' }
          post { always { junit 'web/reports/*.xml' } }
        }
      }
    }
    stage('Dependencias') {                                // M08 y licencias (Sección 11)
      steps {
        sh 'npm audit --audit-level=high'
        sh 'npx license-checker --production --excludePrivatePackages --onlyAllow "MIT;Apache-2.0;BSD-2-Clause;BSD-3-Clause;ISC;0BSD"'
      }
    }
    stage('Análisis estático') {                           // M05, M07, M08: Quality Gate "CalisFacu"
      when { not { buildingTag() } }
      steps {
        withCredentials([string(credentialsId: 'sonar-token', variable: 'SONAR_TOKEN')]) {
          script {
            def destino = env.CHANGE_ID ?
              "-Dsonar.pullrequest.key=${env.CHANGE_ID} -Dsonar.pullrequest.branch=${env.CHANGE_BRANCH} -Dsonar.pullrequest.base=${env.CHANGE_TARGET}" :
              "-Dsonar.branch.name=${env.BRANCH_NAME}"
            sh "sonar-scanner -Dsonar.qualitygate.wait=true ${destino}"
          }
        }
      }
    }
    stage('Build') {
      steps {
        sh 'npm run -w api build && npm run -w web build'
        sh 'tar czf "calisfacu-${GIT_COMMIT}.tgz" api/dist web/dist'
        archiveArtifacts artifacts: 'calisfacu-*.tgz', fingerprint: true   // build sano: artefacto
      }
    }
    stage('Deploy staging') {
      when { branch 'develop' }                            // nunca antes de que pasen las pruebas
      steps {
        // Variables globales de Jenkins (jenkins/README.md, sección 3): sin ellas fallarían el smoke test y E2E.
        script {
          ['STAGING_API_URL', 'STAGING_WEB_URL'].each { v ->
            if (!env."${v}") { error "Falta la variable global ${v} (Manage Jenkins → System → Global properties)" }
          }
        }
        withCredentials([string(credentialsId: 'render-hook-staging', variable: 'HOOK'),
                         string(credentialsId: 'vercel-token', variable: 'VERCEL_TOKEN'),
                         string(credentialsId: 'vercel-org-id', variable: 'VERCEL_ORG_ID'),
                         string(credentialsId: 'vercel-project-id', variable: 'VERCEL_PROJECT_ID')]) {
          sh 'curl -fsS -X POST "$HOOK&ref=$GIT_COMMIT"'
          sh 'cd web && npx vercel deploy --yes --token="$VERCEL_TOKEN"'
        }
      }
    }
    stage('Smoke test') {
      when { branch 'develop' }
      steps { sh './scripts/smoke.sh "$STAGING_API_URL" "$GIT_COMMIT"' }   // salud + commit desplegado
    }
    stage('E2E') {                                         // M02
      when { branch 'develop' }
      steps {
        sh '''npx cypress run --project e2e --config baseUrl="$STAGING_WEB_URL" --env apiUrl="$STAGING_API_URL" \
              --reporter junit --reporter-options "mochaFile=e2e/reports/junit-[hash].xml"'''
      }
      post {
        always {
          junit 'e2e/reports/*.xml'
          archiveArtifacts artifacts: 'e2e/cypress/videos/**, e2e/cypress/screenshots/**', allowEmptyArchive: true
        }
      }
    }
    stage('Rendimiento') {                                 // M03, M04: solo etiquetas v*-rc.*
      when { tag pattern: 'v*-rc.*', comparator: 'GLOB' }
      environment {
        DATABASE_URL = "postgresql://calis:calis@postgres-ci:5432/${env.DB_NAME}_perf"
        JWT_SECRET = 'solo-para-la-prueba-de-carga'
        NODE_ENV = 'perf'
      }
      steps {
        sh 'createdb "${DB_NAME}_perf" && npm run -w api db:migrate && npm run -w api seed:perf'
        sh 'npm run -w api build && (node api/dist/main.js > api.log 2>&1 & echo $! > api.pid)'
        sh './scripts/esperar-salud.sh http://localhost:3000/api/salud'
        sh '''
          jmeter -n -t perf/boletin.jmx  -Jusuarios=100 -Jduracion=600 -l perf/boletin.jtl  -e -o perf/boletin
          jmeter -n -t perf/planilla.jmx -Jusuarios=100 -Jduracion=600 -l perf/planilla.jtl -e -o perf/planilla
          jq -e ".Total.pct2ResTime <= 2000" perf/boletin/statistics.json
          jq -e ".Total.errorPct < 1"         perf/boletin/statistics.json
          jq -e ".Total.errorPct < 1"         perf/planilla/statistics.json
        '''
      }
      post {
        always {
          sh 'kill "$(cat api.pid)" || true; dropdb --if-exists "${DB_NAME}_perf"'
          archiveArtifacts artifacts: 'perf/**, api.log', allowEmptyArchive: true
        }
      }
    }
    stage('Aprobar producción') {
      when { tag pattern: 'v\\d+\\.\\d+\\.\\d+', comparator: 'REGEXP' }
      steps {
        script {
          // Independencia (SQAP, Sección 3): aprueba quien NO creó la etiqueta. Exige etiquetas anotadas
          // (git tag -a), porque solo esas guardan quién las creó. El usuario de Jenkins (lujan o galvan)
          // debe aparecer en el nombre o el correo de Git de esa persona.
          def autor = sh(script: "git for-each-ref --format='%(taggername) %(taggeremail)' refs/tags/${env.TAG_NAME}",
                         returnStdout: true).trim().toLowerCase()
          if (!autor) { error "La etiqueta ${env.TAG_NAME} no es anotada: créela con git tag -a" }
          def aprobador = input message: "¿Desplegar ${env.TAG_NAME} a producción? Aprueba quien NO creó la etiqueta (${autor}).",
                                ok: 'Aprobar', submitter: 'lujan,galvan', submitterParameter: 'APROBADOR'
          if (autor.contains(aprobador.toLowerCase())) {
            error "${aprobador} creó la etiqueta y no puede aprobar su propio despliegue"
          }
          echo "Aprobado por ${aprobador}; etiqueta creada por ${autor}"
        }
      }
    }
    stage('Deploy producción') {
      when { tag pattern: 'v\\d+\\.\\d+\\.\\d+', comparator: 'REGEXP' }
      steps {
        withCredentials([string(credentialsId: 'render-hook-prod', variable: 'HOOK')]) {
          sh 'curl -fsS -X POST "$HOOK&ref=$GIT_COMMIT"'
        }
      }
    }
  }
}

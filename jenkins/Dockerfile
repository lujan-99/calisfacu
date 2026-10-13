# Imagen del controlador de Jenkins con todo lo que usan las etapas del Jenkinsfile (SQAP, Anexo C.2).
# Toda la configuración (usuarios, permisos, credenciales y el job) está en casc.yaml (Configuration as Code).
FROM jenkins/jenkins:lts-jdk17
USER root
# Base Debian 13: dependencias de Cypress con los nombres t64 de esa versión.
RUN apt-get update && apt-get install -y --no-install-recommends \
      curl unzip jq gnupg postgresql-client \
      xvfb libgtk-3-0t64 libgbm1 libnotify4 libnss3 libxss1 libxtst6 libasound2t64 xauth \
 && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
 && apt-get install -y nodejs \
 && curl -fsSL https://archive.apache.org/dist/jmeter/binaries/apache-jmeter-5.6.3.tgz | tar xz -C /opt \
 && ln -s /opt/apache-jmeter-5.6.3/bin/jmeter /usr/local/bin/jmeter \
 && rm -rf /var/lib/apt/lists/*
# SonarScanner CLI (opcional hasta T-030): se instala solo si se define SONAR_SCANNER_VERSION en jenkins/.env.
ARG SONAR_SCANNER_VERSION=
RUN if [ -n "$SONAR_SCANNER_VERSION" ]; then \
      curl -fsSL -o /tmp/ss.zip \
        "https://binaries.sonarsource.com/Distribution/sonar-scanner-cli/sonar-scanner-cli-${SONAR_SCANNER_VERSION}-linux-x64.zip" \
      && unzip -q /tmp/ss.zip -d /opt && rm /tmp/ss.zip \
      && ln -s /opt/sonar-scanner-${SONAR_SCANNER_VERSION}-linux-x64/bin/sonar-scanner /usr/local/bin/sonar-scanner; \
    fi
USER jenkins
ENV JAVA_OPTS="-Djenkins.install.runSetupWizard=false" CASC_JENKINS_CONFIG=/var/jenkins_home/casc.yaml
COPY plugins.txt /usr/share/jenkins/ref/plugins.txt
RUN jenkins-plugin-cli -f /usr/share/jenkins/ref/plugins.txt
COPY casc.yaml /usr/share/jenkins/ref/casc.yaml.override

# Imagen del controlador de Jenkins con todo lo que usan las etapas del Jenkinsfile (SQAP, Anexo C.2)
FROM jenkins/jenkins:lts-jdk17
USER root
RUN apt-get update && apt-get install -y --no-install-recommends \
      curl unzip jq gnupg postgresql-client \
      xvfb libgtk-3-0 libgbm1 libnotify4 libnss3 libxss1 libxtst6 xauth \
 && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
 && apt-get install -y nodejs \
 && curl -fsSL https://archive.apache.org/dist/jmeter/binaries/apache-jmeter-5.6.3.tgz | tar xz -C /opt \
 && ln -s /opt/apache-jmeter-5.6.3/bin/jmeter /usr/local/bin/jmeter \
 && rm -rf /var/lib/apt/lists/*
#    Dependencias de Cypress: lista de la documentación de Cypress para Debian
#    (los nombres de paquete cambian entre versiones de Debian; verificar al construir).
# SONAR_SCANNER_VERSION: versión vigente en binaries.sonarsource.com
ARG SONAR_SCANNER_VERSION
RUN curl -fsSL -o /tmp/ss.zip \
      "https://binaries.sonarsource.com/Distribution/sonar-scanner-cli/sonar-scanner-cli-${SONAR_SCANNER_VERSION}-linux-x64.zip" \
 && unzip -q /tmp/ss.zip -d /opt && rm /tmp/ss.zip \
 && ln -s /opt/sonar-scanner-${SONAR_SCANNER_VERSION}-linux-x64/bin/sonar-scanner /usr/local/bin/sonar-scanner
USER jenkins
COPY plugins.txt /usr/share/jenkins/ref/plugins.txt
RUN jenkins-plugin-cli -f /usr/share/jenkins/ref/plugins.txt

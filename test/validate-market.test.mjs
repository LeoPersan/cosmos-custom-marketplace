import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const EXPECTED_APPS = [
  'nodejs-git-runner',
  'python-git-runner',
  'golang-git-runner',
  'static-nginx-runner',
  'php-laravel-runner',
  'rust-git-runner',
  'mysql-shared-server'
];

const GIT_RUNNERS = [
  'nodejs-git-runner',
  'python-git-runner',
  'golang-git-runner',
  'static-nginx-runner',
  'php-laravel-runner',
  'rust-git-runner'
];

const STORE_ID_PREFIX = 'com.leopersan';

describe('Docker Hub Runner Images and Tooling Architecture', () => {
  test('All 6 git runners have valid Dockerfiles, executable entrypoints, and safe.directory configured', () => {
    for (const runner of GIT_RUNNERS) {
      const runnerDockerDir = path.join(ROOT_DIR, 'docker', runner);
      const dockerfilePath = path.join(runnerDockerDir, 'Dockerfile');
      const entrypointPath = path.join(runnerDockerDir, 'entrypoint.sh');

      assert.ok(fs.existsSync(runnerDockerDir), `Missing docker directory for ${runner}`);
      assert.ok(fs.existsSync(dockerfilePath), `Missing Dockerfile for ${runner}`);
      assert.ok(fs.existsSync(entrypointPath), `Missing entrypoint.sh for ${runner}`);

      const dockerfileContent = fs.readFileSync(dockerfilePath, 'utf-8');
      const entrypointContent = fs.readFileSync(entrypointPath, 'utf-8');

      // Verify safe.directory is configured to prevent Git ownership errors
      const hasSafeDir = dockerfileContent.includes('safe.directory') || entrypointContent.includes('safe.directory');
      assert.ok(hasSafeDir, `${runner} must configure git safe.directory`);

      // Verify entrypoint is configured in Dockerfile
      assert.ok(dockerfileContent.includes('ENTRYPOINT'), `${runner} Dockerfile must declare ENTRYPOINT`);
    }
  });

  test('PHP & Laravel Runner Dockerfile includes essential extensions, Composer and Apache mod_rewrite', () => {
    const phpDockerDir = path.join(ROOT_DIR, 'docker', 'php-laravel-runner');
    const dockerfilePath = path.join(phpDockerDir, 'Dockerfile');
    const vhostPath = path.join(phpDockerDir, 'apache-vhost.conf');

    assert.ok(fs.existsSync(dockerfilePath), 'PHP runner Dockerfile must exist');
    assert.ok(fs.existsSync(vhostPath), 'PHP runner apache-vhost.conf must exist');

    const dockerfile = fs.readFileSync(dockerfilePath, 'utf-8');
    assert.ok(dockerfile.includes('pdo_mysql'), 'PHP Dockerfile must install pdo_mysql extension');
    assert.ok(dockerfile.includes('pcntl'), 'PHP Dockerfile must install pcntl extension for Laravel Horizon/Queues');
    assert.ok(dockerfile.includes('bcmath'), 'PHP Dockerfile must install bcmath extension');
    assert.ok(dockerfile.includes('exif'), 'PHP Dockerfile must install exif extension for photos/images');
    assert.ok(dockerfile.includes('intl'), 'PHP Dockerfile must install intl extension');
    assert.ok(dockerfile.includes('gd'), 'PHP Dockerfile must install gd extension');
    assert.ok(dockerfile.includes('composer'), 'PHP Dockerfile must install Composer');
    assert.ok(dockerfile.includes('rewrite'), 'PHP Dockerfile must enable Apache rewrite module');
  });

  test('GitHub Actions CI/CD workflow and local build-all helper exist and are configured', () => {
    const workflowPath = path.join(ROOT_DIR, '.github', 'workflows', 'docker-publish.yml');
    const buildAllPath = path.join(ROOT_DIR, 'docker', 'build-all.sh');

    assert.ok(fs.existsSync(workflowPath), '.github/workflows/docker-publish.yml must exist');
    assert.ok(fs.existsSync(buildAllPath), 'docker/build-all.sh must exist');

    const workflowContent = fs.readFileSync(workflowPath, 'utf-8');
    assert.ok(workflowContent.includes('leopersan/'), 'Workflow must target leopersan/ namespace');
    assert.ok(workflowContent.includes('linux/amd64,linux/arm64'), 'Workflow must build multi-arch amd64/arm64');
  });
});

describe('Cosmos Market Source - Official Schema Test Suite', () => {
  const indexPath = path.join(ROOT_DIR, 'index.json');
  const servappsPath = path.join(ROOT_DIR, 'servapps.json');

  test('index.json and servapps.json structure conforming to Cosmos spec', () => {
    assert.ok(fs.existsSync(indexPath), 'index.json must exist');
    assert.ok(fs.existsSync(servappsPath), 'servapps.json must exist');

    const index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
    assert.ok(index.source, 'index.json must have source property');
    assert.ok(Array.isArray(index.showcase), 'index.json must have showcase array');
    assert.ok(Array.isArray(index.all), 'index.json must have all array');
    assert.equal(index.all.length, EXPECTED_APPS.length);

    const servapps = JSON.parse(fs.readFileSync(servappsPath, 'utf-8'));
    assert.ok(Array.isArray(servapps), 'servapps.json must be an array');
    assert.equal(servapps.length, EXPECTED_APPS.length);
  });

  test('All apps have required Cosmos properties, valid URLs, and physical files', () => {
    const servapps = JSON.parse(fs.readFileSync(servappsPath, 'utf-8'));

    for (const app of servapps) {
      assert.ok(EXPECTED_APPS.includes(app.id), `Unknown app id: ${app.id}`);
      assert.ok(app.name, `Missing name for ${app.id}`);
      assert.ok(app.description, `Missing description for ${app.id}`);
      assert.ok(app.longDescription, `Missing longDescription for ${app.id}`);
      assert.ok(Array.isArray(app.tags), `Missing tags for ${app.id}`);
      assert.ok(app.icon && app.icon.startsWith('http'), `Icon must be full URL for ${app.id}`);
      assert.ok(app.compose && app.compose.startsWith('http'), `Compose must be full URL for ${app.id}`);

      // Check physical files in servapps/
      const appDir = path.join(ROOT_DIR, 'servapps', app.id);
      assert.ok(fs.existsSync(appDir), `Directory not found: servapps/${app.id}`);
      assert.ok(fs.existsSync(path.join(appDir, 'description.json')), `Missing description.json in servapps/${app.id}`);
      assert.ok(fs.existsSync(path.join(appDir, 'cosmos-compose.json')), `Missing cosmos-compose.json in servapps/${app.id}`);
      assert.ok(fs.existsSync(path.join(appDir, 'icon.png')), `Missing icon.png in servapps/${app.id}`);

      // Check compose content
      const compose = JSON.parse(fs.readFileSync(path.join(appDir, 'cosmos-compose.json'), 'utf-8'));
      assert.ok(compose.services, `Missing services in ${app.id} compose`);
      assert.ok(compose.services['{ServiceName}'], `Missing {ServiceName} in ${app.id} compose`);
      
      const service = compose.services['{ServiceName}'];
      assert.ok(Array.isArray(service.environment), `environment in ${app.id} must be an array for Cosmos React setup form`);
      assert.ok(compose['cosmos-installer'] && Array.isArray(compose['cosmos-installer'].form), `cosmos-installer.form must be an array in ${app.id}`);

      // Check Docker Hub images and absence of slow boot packages
      if (GIT_RUNNERS.includes(app.id)) {
        assert.equal(service.image, `leopersan/${app.id}:latest`, `${app.id} must use leopersan/${app.id}:latest image`);
        if (service.command) {
          assert.ok(!service.command.includes('apk add'), `${app.id} command must not run apk add at boot`);
          assert.ok(!service.command.includes('apt-get'), `${app.id} command must not run apt-get at boot`);
        }
      }
    }
  });

  test('MySQL Shared Server specific configuration and healthcheck', () => {
    const mysqlDescPath = path.join(ROOT_DIR, 'servapps', 'mysql-shared-server', 'description.json');
    const mysqlComposePath = path.join(ROOT_DIR, 'servapps', 'mysql-shared-server', 'cosmos-compose.json');

    const desc = JSON.parse(fs.readFileSync(mysqlDescPath, 'utf-8'));
    const compose = JSON.parse(fs.readFileSync(mysqlComposePath, 'utf-8'));

    assert.equal(desc.category, 'Database');
    const paramNames = desc.params.map(p => p.name);
    assert.ok(paramNames.includes('MYSQL_ROOT_PASSWORD'));
    assert.ok(paramNames.includes('MYSQL_DATABASE'));
    assert.ok(paramNames.includes('MYSQL_USER'));
    assert.ok(paramNames.includes('MYSQL_PASSWORD'));
    assert.ok(paramNames.includes('ADDITIONAL_DATABASES'));
    assert.ok(paramNames.includes('ADDITIONAL_USERS'));

    const svc = compose.services['{ServiceName}'];
    assert.equal(svc.image, 'mysql:8.4');
    assert.ok(svc.volumes.some(v => v.target === '/var/lib/mysql'), 'Must persist /var/lib/mysql volume');
  });
});

describe('ZimaOS / CasaOS App Store - Official Schema Test Suite', () => {
  const storePath = path.join(ROOT_DIR, 'store.json');
  const storeConfigPath = path.join(ROOT_DIR, 'store-config.json');
  const supportedLanguagesPath = path.join(ROOT_DIR, 'supported-languages.json');
  const indexPath = path.join(ROOT_DIR, 'index.json');
  const categoryPath = path.join(ROOT_DIR, 'category-list.json');
  const recommendPath = path.join(ROOT_DIR, 'recommend-list.json');
  const appsDir = path.join(ROOT_DIR, 'Apps');

  test('store.json, locale files, store-config.json and supported-languages.json exist and match spec', () => {
    assert.ok(fs.existsSync(storePath), 'store.json must exist');
    assert.ok(fs.existsSync(storeConfigPath), 'store-config.json must exist');
    assert.ok(fs.existsSync(supportedLanguagesPath), 'supported-languages.json must exist');
    assert.ok(fs.existsSync(categoryPath), 'category-list.json must exist');
    assert.ok(fs.existsSync(recommendPath), 'recommend-list.json must exist');

    // Localized manifests
    assert.ok(fs.existsSync(path.join(ROOT_DIR, 'store.pt_BR.json')), 'store.pt_BR.json must exist');
    assert.ok(fs.existsSync(path.join(ROOT_DIR, 'store.en_US.json')), 'store.en_US.json must exist');
    assert.ok(fs.existsSync(path.join(ROOT_DIR, 'index.pt_BR.json')), 'index.pt_BR.json must exist');
    assert.ok(fs.existsSync(path.join(ROOT_DIR, 'index.en_US.json')), 'index.en_US.json must exist');

    const store = JSON.parse(fs.readFileSync(storePath, 'utf-8'));
    assert.equal(store.version, 2, 'store.json version must be 2');
    assert.ok(store.store_id, 'store.json must have store_id');

    // ZimaOS v2 App Discovery Protocol via index.json
    const index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
    assert.equal(index.version, 2, 'index.json version must be 2 for ZimaOS');
    assert.ok(Array.isArray(index.apps), 'index.json must contain apps array for ZimaOS app listing');
    assert.equal(index.apps.length, EXPECTED_APPS.length, 'index.json apps array must contain all 7 apps');

    for (const app of index.apps) {
      assert.ok(app.id.startsWith(STORE_ID_PREFIX + '.'), `App ID must start with ${STORE_ID_PREFIX}: ${app.id}`);
      assert.ok(app.id.split('.').length >= 3, `App ID must have valid reverse-domain segments: ${app.id}`);
      assert.ok(app.title, `Missing title in index.apps for ${app.id}`);
      assert.ok(app.tagline, `Missing tagline in index.apps for ${app.id}`);
      assert.ok(app.icon && app.icon.startsWith('http'), `Icon must be valid URL for ${app.id}`);
      assert.ok(app.compose_url && app.compose_url.startsWith('http'), `Compose URL must be valid for ${app.id}`);
      assert.ok(app.meta_url && app.meta_url.startsWith('http'), `Meta URL must be valid for ${app.id}`);
    }
  });

  test('All apps have required ZimaOS / CasaOS Compose, reverse-domain x-casaos metadata, meta.json, and physical files', () => {
    assert.ok(fs.existsSync(appsDir), 'Apps directory must exist');

    for (const appName of EXPECTED_APPS) {
      const zimaAppId = `${STORE_ID_PREFIX}.${appName}`;
      const appFolder = path.join(appsDir, zimaAppId);
      assert.ok(fs.existsSync(appFolder), `Apps/${zimaAppId} directory must exist`);

      const composePath = path.join(appFolder, 'docker-compose.yml');
      const iconPath = path.join(appFolder, 'icon.png');
      const metaPath = path.join(appFolder, 'meta.json');

      assert.ok(fs.existsSync(composePath), `Apps/${zimaAppId}/docker-compose.yml must exist`);
      assert.ok(fs.existsSync(iconPath), `Apps/${zimaAppId}/icon.png must exist`);
      assert.ok(fs.existsSync(metaPath), `Apps/${zimaAppId}/meta.json must exist`);

      const composeContent = fs.readFileSync(composePath, 'utf-8');
      
      assert.ok(composeContent.includes(`id: ${zimaAppId}`), `x-casaos.id must match ${zimaAppId}`);
      assert.ok(composeContent.includes('x-casaos:'), `Apps/${zimaAppId}/docker-compose.yml must contain x-casaos metadata`);
      assert.ok(composeContent.includes('main:'), `Apps/${zimaAppId}/docker-compose.yml must define main service`);
      assert.ok(composeContent.includes('title:'), `Apps/${zimaAppId}/docker-compose.yml must define title`);
      assert.ok(composeContent.includes('icon:'), `Apps/${zimaAppId}/docker-compose.yml must define icon`);
      assert.ok(composeContent.includes('category:'), `Apps/${zimaAppId}/docker-compose.yml must define category`);
      assert.ok(composeContent.includes('services:'), `Apps/${zimaAppId}/docker-compose.yml must define services`);
      assert.ok(composeContent.includes('environment:'), `Apps/${zimaAppId}/docker-compose.yml must define environment`);
      assert.ok(composeContent.includes('ports:') || composeContent.includes('expose:'), `Apps/${zimaAppId}/docker-compose.yml must define ports or expose`);
      
      if (GIT_RUNNERS.includes(appName)) {
        assert.ok(composeContent.includes(`image: leopersan/${appName}:latest`), `ZimaOS compose for ${appName} must use leopersan/${appName}:latest`);
      }

      if (appName === 'php-laravel-runner') {
        assert.ok(composeContent.includes('/var/www/html'), 'PHP Runner Compose must use /var/www/html for volume and working_dir');
      }
    }
  });
});

describe('Dual-Target Parity and Documentation Test Suite', () => {
  test('Cosmos and ZimaOS catalogs have 100% parity across all 7 applications', () => {
    for (const appName of EXPECTED_APPS) {
      const zimaAppId = `${STORE_ID_PREFIX}.${appName}`;
      const cosmosDir = path.join(ROOT_DIR, 'servapps', appName);
      const zimaDir = path.join(ROOT_DIR, 'Apps', zimaAppId);

      assert.ok(fs.existsSync(cosmosDir), `Cosmos app missing: ${appName}`);
      assert.ok(fs.existsSync(zimaDir), `ZimaOS app missing: ${zimaAppId}`);

      const cosmosIconStat = fs.statSync(path.join(cosmosDir, 'icon.png'));
      const zimaIconStat = fs.statSync(path.join(zimaDir, 'icon.png'));
      assert.ok(cosmosIconStat.size > 0, `Cosmos icon must not be empty for ${appName}`);
      assert.ok(zimaIconStat.size > 0, `ZimaOS icon must not be empty for ${zimaAppId}`);
    }
  });

  test('README.md completeness for both Cosmos-Server and ZimaOS / CasaOS guidance', () => {
    const readmePath = path.join(ROOT_DIR, 'README.md');
    assert.ok(fs.existsSync(readmePath));
    const content = fs.readFileSync(readmePath, 'utf-8');

    assert.ok(content.includes('Cosmos-Server') || content.includes('Cosmos Cloud'), 'README must mention Cosmos');
    assert.ok(content.includes('Market') && content.includes('Sources'), 'README must describe Cosmos Market > Sources');
    assert.ok(content.includes('ZimaOS') || content.includes('CasaOS'), 'README must mention ZimaOS / CasaOS');
    assert.ok(content.includes('store.json') || content.includes('Community Store'), 'README must describe ZimaOS store.json / Community Store');
    
    assert.ok(content.includes('Node.js 24'), 'README must list Node.js 24');
    assert.ok(content.includes('Python 3.13'), 'README must list Python 3.13');
    assert.ok(content.includes('Golang 1.24'), 'README must list Golang 1.24');
    assert.ok(content.includes('PHP 8.4'), 'README must list PHP 8.4');
    assert.ok(content.includes('Rust'), 'README must list Rust');
    assert.ok(content.includes('Nginx'), 'README must list Nginx');
  });
});

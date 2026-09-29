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
  'rust-git-runner'
];

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
      // Backend compatibility: command MUST be string (Cosmos Go backend unmarshals to string)
      assert.equal(typeof service.command, 'string', `command in ${app.id} must be a string for Cosmos Go unmarshaling`);
      // Frontend compatibility: environment MUST be array of strings (React setup.jsx calls .map())
      assert.ok(Array.isArray(service.environment), `environment in ${app.id} must be an array for Cosmos React setup form`);
      // Form definition
      assert.ok(compose['cosmos-installer'] && Array.isArray(compose['cosmos-installer'].form), `cosmos-installer.form must be an array in ${app.id}`);
    }
  });
});

describe('ZimaOS / CasaOS App Store - Official Schema Test Suite', () => {
  const storePath = path.join(ROOT_DIR, 'store.json');
  const categoryPath = path.join(ROOT_DIR, 'category-list.json');
  const recommendPath = path.join(ROOT_DIR, 'recommend-list.json');
  const appsDir = path.join(ROOT_DIR, 'Apps');

  test('store.json, category-list.json and recommend-list.json structure conforming to ZimaOS spec', () => {
    assert.ok(fs.existsSync(storePath), 'store.json must exist');
    assert.ok(fs.existsSync(categoryPath), 'category-list.json must exist');
    assert.ok(fs.existsSync(recommendPath), 'recommend-list.json must exist');

    const store = JSON.parse(fs.readFileSync(storePath, 'utf-8'));
    assert.equal(store.version, 2, 'store.json version must be 2');
    assert.ok(store.store_id, 'store.json must have store_id');
    assert.ok(store.name, 'store.json must have name');
    assert.ok(store.description, 'store.json must have description');

    const categories = JSON.parse(fs.readFileSync(categoryPath, 'utf-8'));
    assert.ok(Array.isArray(categories), 'category-list.json must be an array');
    assert.ok(categories.length > 0, 'category-list.json must have at least one category');
    for (const cat of categories) {
      assert.ok(cat.id, 'category must have id');
      assert.ok(cat.name, 'category must have name');
      assert.ok(cat.description, 'category must have description');
    }

    const recommend = JSON.parse(fs.readFileSync(recommendPath, 'utf-8'));
    assert.ok(Array.isArray(recommend), 'recommend-list.json must be an array');
    assert.ok(recommend.length > 0, 'recommend-list.json must contain apps');
  });

  test('All apps have required ZimaOS / CasaOS Compose, x-casaos metadata, and physical files', () => {
    assert.ok(fs.existsSync(appsDir), 'Apps directory must exist');

    for (const appId of EXPECTED_APPS) {
      const appFolder = path.join(appsDir, appId);
      assert.ok(fs.existsSync(appFolder), `Apps/${appId} directory must exist`);

      const composePath = path.join(appFolder, 'docker-compose.yml');
      const iconPath = path.join(appFolder, 'icon.png');

      assert.ok(fs.existsSync(composePath), `Apps/${appId}/docker-compose.yml must exist`);
      assert.ok(fs.existsSync(iconPath), `Apps/${appId}/icon.png must exist`);

      const composeContent = fs.readFileSync(composePath, 'utf-8');
      
      // Verify YAML content has x-casaos block
      assert.ok(composeContent.includes('x-casaos:'), `Apps/${appId}/docker-compose.yml must contain x-casaos metadata`);
      assert.ok(composeContent.includes('main:'), `Apps/${appId}/docker-compose.yml must define main service`);
      assert.ok(composeContent.includes('title:'), `Apps/${appId}/docker-compose.yml must define title`);
      assert.ok(composeContent.includes('icon:'), `Apps/${appId}/docker-compose.yml must define icon`);
      assert.ok(composeContent.includes('port_map:'), `Apps/${appId}/docker-compose.yml must define port_map`);
      assert.ok(composeContent.includes('category:'), `Apps/${appId}/docker-compose.yml must define category`);
      assert.ok(composeContent.includes('services:'), `Apps/${appId}/docker-compose.yml must define services`);
      assert.ok(composeContent.includes('environment:'), `Apps/${appId}/docker-compose.yml must define environment`);
      assert.ok(composeContent.includes('ports:'), `Apps/${appId}/docker-compose.yml must define ports`);
    }
  });
});

describe('Dual-Target Parity and Documentation Test Suite', () => {
  test('Cosmos and ZimaOS catalogs have 100% parity across all 6 applications', () => {
    for (const appId of EXPECTED_APPS) {
      const cosmosDir = path.join(ROOT_DIR, 'servapps', appId);
      const zimaDir = path.join(ROOT_DIR, 'Apps', appId);

      assert.ok(fs.existsSync(cosmosDir), `Cosmos app missing: ${appId}`);
      assert.ok(fs.existsSync(zimaDir), `ZimaOS app missing: ${appId}`);

      // Check icons
      const cosmosIconStat = fs.statSync(path.join(cosmosDir, 'icon.png'));
      const zimaIconStat = fs.statSync(path.join(zimaDir, 'icon.png'));
      assert.ok(cosmosIconStat.size > 0, `Cosmos icon must not be empty for ${appId}`);
      assert.ok(zimaIconStat.size > 0, `ZimaOS icon must not be empty for ${appId}`);
    }
  });

  test('README.md completeness for both Cosmos-Server and ZimaOS / CasaOS guidance', () => {
    const readmePath = path.join(ROOT_DIR, 'README.md');
    assert.ok(fs.existsSync(readmePath));
    const content = fs.readFileSync(readmePath, 'utf-8');

    // Cosmos guidance
    assert.ok(content.includes('Cosmos-Server') || content.includes('Cosmos Cloud'), 'README must mention Cosmos');
    assert.ok(content.includes('Market') && content.includes('Sources'), 'README must describe Cosmos Market > Sources');
    
    // ZimaOS guidance
    assert.ok(content.includes('ZimaOS') || content.includes('CasaOS'), 'README must mention ZimaOS / CasaOS');
    assert.ok(content.includes('store.json') || content.includes('Community Store'), 'README must describe ZimaOS store.json / Community Store');
    
    // Runner list
    assert.ok(content.includes('Node.js 24'), 'README must list Node.js 24');
    assert.ok(content.includes('Python 3.13'), 'README must list Python 3.13');
    assert.ok(content.includes('Golang 1.24'), 'README must list Golang 1.24');
    assert.ok(content.includes('PHP 8.4'), 'README must list PHP 8.4');
    assert.ok(content.includes('Rust'), 'README must list Rust');
    assert.ok(content.includes('Nginx'), 'README must list Nginx');
  });
});

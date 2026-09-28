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

  test('README.md completeness and setup guidance', () => {
    const readmePath = path.join(ROOT_DIR, 'README.md');
    assert.ok(fs.existsSync(readmePath));
    const content = fs.readFileSync(readmePath, 'utf-8');

    assert.ok(content.includes('Market') && content.includes('Sources'), 'README must describe navigation to Market > Sources');
    assert.ok(content.includes('Add Source'), 'README must describe Add Source step');
    assert.ok(content.includes('Node.js 24'), 'README must list Node.js 24');
    assert.ok(content.includes('Python 3.13'), 'README must list Python 3.13');
    assert.ok(content.includes('Golang 1.24'), 'README must list Golang 1.24');
    assert.ok(content.includes('PHP 8.4'), 'README must list PHP 8.4');
    assert.ok(content.includes('Rust'), 'README must list Rust');
    assert.ok(content.includes('Nginx'), 'README must list Nginx');
  });
});

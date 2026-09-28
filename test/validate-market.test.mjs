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

describe('Cosmos Market Source - Comprehensive Test Suite', () => {
  const indexPath = path.join(ROOT_DIR, 'index.json');

  test('index.json structure and required metadata', () => {
    assert.ok(fs.existsSync(indexPath), 'index.json must exist in root');
    const content = fs.readFileSync(indexPath, 'utf-8');
    const parsed = JSON.parse(content);
    assert.equal(typeof parsed.name, 'string');
    assert.equal(typeof parsed.description, 'string');
    assert.equal(typeof parsed.author, 'string');
    assert.ok(Array.isArray(parsed.apps));
    assert.equal(parsed.apps.length, EXPECTED_APPS.length, `Expected exactly ${EXPECTED_APPS.length} apps in index.json`);
  });

  test('All expected ServApps are present in index.json', () => {
    const parsed = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
    const registeredPaths = parsed.apps.map((app) => app.details);

    for (const expectedApp of EXPECTED_APPS) {
      const exists = registeredPaths.some((p) => p.includes(expectedApp));
      assert.ok(exists, `App ${expectedApp} should be registered in index.json`);
    }
  });

  test('Detailed validation of each ServApp recipe', () => {
    const parsed = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));

    for (const app of parsed.apps) {
      // 1. Icon validation
      const iconPath = path.join(ROOT_DIR, app.icon);
      assert.ok(fs.existsSync(iconPath), `Icon not found: ${app.icon}`);
      const iconStats = fs.statSync(iconPath);
      assert.ok(iconStats.size > 1000, `Icon for ${app.name} is too small (${iconStats.size} bytes)`);

      // 2. Details (description.json) validation
      const detailsPath = path.join(ROOT_DIR, app.details);
      assert.ok(fs.existsSync(detailsPath), `description.json not found: ${app.details}`);
      const details = JSON.parse(fs.readFileSync(detailsPath, 'utf-8'));
      assert.ok(details.name, `Missing name in ${app.details}`);
      assert.ok(details.description, `Missing description in ${app.details}`);
      assert.ok(details.long_description, `Missing long_description in ${app.details}`);
      assert.ok(Array.isArray(details.tags) && details.tags.length >= 3, `Tags in ${app.details} must have at least 3 items`);
      assert.ok(Array.isArray(details.params) && details.params.length >= 4, `Params in ${app.details} must have at least 4 configurable parameters`);

      for (const param of details.params) {
        assert.ok(param.name, `Param in ${app.details} missing name`);
        assert.ok(param.label, `Param ${param.name} in ${app.details} missing label`);
        assert.ok(['text', 'password', 'number', 'boolean', 'select'].includes(param.type), `Param ${param.name} has invalid type: ${param.type}`);
        assert.ok(param.description, `Param ${param.name} in ${app.details} missing description`);
      }

      // 3. Compose (cosmos-compose.json) validation
      const composePath = path.join(ROOT_DIR, app.compose);
      assert.ok(fs.existsSync(composePath), `cosmos-compose.json not found: ${app.compose}`);
      const compose = JSON.parse(fs.readFileSync(composePath, 'utf-8'));
      assert.ok(compose.services, `Services missing in ${app.compose}`);
      
      const serviceKeys = Object.keys(compose.services);
      assert.ok(serviceKeys.length > 0);
      const svc = compose.services[serviceKeys[0]];

      assert.ok(svc.image, `Image missing in ${app.compose}`);
      assert.ok(svc.working_dir || svc.workingDir, `working_dir missing in ${app.compose}`);
      assert.ok(Array.isArray(svc.volumes), `volumes missing in ${app.compose}`);
      
      const hasVolumeRoot = svc.volumes.some((v) =>
        typeof v === 'string' ? v.includes('{VOLUME_ROOT}') : v.source?.includes('{VOLUME_ROOT}')
      );
      assert.ok(hasVolumeRoot, `Volume root persistence missing in ${app.compose}`);

      // Route validation
      const routes = svc.routes || compose.routes;
      assert.ok(routes && Array.isArray(routes) && routes.length > 0, `Routes missing in ${app.compose}`);
      assert.equal(routes[0].mode, 'PROXY');
      assert.equal(routes[0].useHost, true);
      assert.ok(routes[0].smartShield, `SmartShield must be defined in route for ${app.name}`);

      // Startup idempotency and token handling validation
      const cmdStr = Array.isArray(svc.command) ? svc.command.join(' ') : String(svc.command);
      assert.ok(cmdStr.includes('git clone'), `Startup command in ${app.compose} must have git clone`);
      assert.ok(cmdStr.includes('git pull'), `Startup command in ${app.compose} must have git pull`);
      assert.ok(cmdStr.includes('.git'), `Startup command in ${app.compose} must check for .git directory`);
      assert.ok(cmdStr.includes('GITHUB_TOKEN') || cmdStr.includes('AUTH_REPO_URL'), `Startup command in ${app.compose} must handle token authentication`);
    }
  });

  test('README.md completeness and setup guidance', () => {
    const readmePath = path.join(ROOT_DIR, 'README.md');
    assert.ok(fs.existsSync(readmePath));
    const content = fs.readFileSync(readmePath, 'utf-8');

    assert.ok(content.includes('Market') && content.includes('Sources'), 'README must describe navigation to Market > Sources');
    assert.ok(content.includes('Add Source'), 'README must describe Add Source step');
    assert.ok(content.includes('GITHUB_TOKEN'), 'README must describe GITHUB_TOKEN configuration');
    assert.ok(content.includes('Node.js 24'), 'README must list Node.js 24');
    assert.ok(content.includes('Python 3.13'), 'README must list Python 3.13');
    assert.ok(content.includes('Golang 1.24'), 'README must list Golang 1.24');
    assert.ok(content.includes('PHP 8.4'), 'README must list PHP 8.4');
    assert.ok(content.includes('Rust'), 'README must list Rust');
    assert.ok(content.includes('Nginx'), 'README must list Nginx');
  });
});

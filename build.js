import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REPO_BASE_URL = 'https://raw.githubusercontent.com/LeoPersan/cosmos-custom-marketplace/main';

const servappsDir = path.join(__dirname, 'servapps');
const appsDir = path.join(__dirname, 'apps');
const zimaAppsDir = path.join(__dirname, 'Apps');

if (!fs.existsSync(zimaAppsDir)) {
  fs.mkdirSync(zimaAppsDir, { recursive: true });
}

const appFolders = fs.readdirSync(servappsDir).filter((file) => {
  return fs.lstatSync(path.join(servappsDir, file)).isDirectory();
});

const servappsList = [];
const zimaAppsList = [];
const recommendList = [];

function decodeScript(cmdString) {
  if (!cmdString) return '';
  const parts = cmdString.split('"');
  if (parts.length >= 2) {
    const b64 = parts[1];
    return Buffer.from(b64, 'base64').toString('utf-8');
  }
  return cmdString;
}

function escapeDollarForCompose(script) {
  // In Docker compose YAML, $ must be $$ to prevent compose host interpolation
  return script.replace(/\$/g, '$$$$');
}

for (const folder of appFolders) {
  const descPath = path.join(servappsDir, folder, 'description.json');
  const cosmosComposePath = path.join(servappsDir, folder, 'cosmos-compose.json');
  const iconPath = path.join(servappsDir, folder, 'icon.png');

  if (!fs.existsSync(descPath) || !fs.existsSync(cosmosComposePath)) continue;

  const desc = JSON.parse(fs.readFileSync(descPath, 'utf-8'));
  const cosmosCompose = JSON.parse(fs.readFileSync(cosmosComposePath, 'utf-8'));
  
  // 1. Cosmos ServApp Object
  const servapp = {
    ...desc,
    id: folder,
    longDescription: desc.longDescription || desc.long_description || `<p>${desc.description}</p>`,
    repository: desc.repository || 'https://github.com/LeoPersan/cosmos-custom-marketplace',
    supported_architectures: desc.supported_architectures || ['amd64', 'arm64', 'arm'],
    screenshots: desc.screenshots || [],
    artefacts: desc.artefacts || {},
    icon: `${REPO_BASE_URL}/servapps/${folder}/icon.png`,
    compose: `${REPO_BASE_URL}/servapps/${folder}/cosmos-compose.json`
  };

  servappsList.push(servapp);

  // Extract service details
  const svcConfig = cosmosCompose.services['{ServiceName}'] || {};
  const image = svcConfig.image || 'alpine:latest';
  const rawCommand = svcConfig.command || '';
  const decodedScript = decodeScript(rawCommand);
  const formattedScript = escapeDollarForCompose(decodedScript.trim());

  // Extract default variables from params or environment
  const envMap = {};
  if (Array.isArray(svcConfig.environment)) {
    for (const envStr of svcConfig.environment) {
      const [key, val] = envStr.split('=');
      if (val && val.startsWith('{Context.') && val.endsWith('}')) {
        const paramName = val.slice(9, -1);
        const paramObj = desc.params ? desc.params.find(p => p.name === paramName) : null;
        envMap[key] = paramObj && paramObj.default !== undefined ? String(paramObj.default) : '';
      } else {
        envMap[key] = val || '';
      }
    }
  }

  // Determine Port
  let appPort = '80';
  if (envMap.APP_PORT) {
    appPort = String(envMap.APP_PORT);
  } else if (svcConfig.routes && svcConfig.routes[0] && svcConfig.routes[0].target) {
    const match = svcConfig.routes[0].target.match(/:(\d+)$/);
    if (match) appPort = match[1];
  }

  // Determine Category
  const category = folder.includes('static') || (desc.category && desc.category.toLowerCase().includes('utilities'))
    ? 'Utilities'
    : 'Development';

  if (folder.includes('nodejs') || folder.includes('python') || folder.includes('golang') || folder.includes('static')) {
    recommendList.push(folder);
  }

  // Build Environment YAML lines
  const envYamlLines = Object.entries(envMap)
    .map(([k, v]) => `      - ${k}=${v}`)
    .join('\n');

  // Indent script for YAML literal block
  const indentedScript = formattedScript
    .split('\n')
    .map(line => `        ${line}`)
    .join('\n');

  const dockerComposeYaml = `name: ${folder}
services:
  app:
    image: ${image}
    container_name: ${folder}
    restart: unless-stopped
    working_dir: /app
    environment:
${envYamlLines}
    ports:
      - "${appPort}:${appPort}"
    volumes:
      - ${folder.replace(/-/g, '_')}_data:/app
    command: >
      sh -c '
${indentedScript}
      '

volumes:
  ${folder.replace(/-/g, '_')}_data:

x-casaos:
  architectures:
    - amd64
    - arm64
    - arm
  main: app
  description:
    en_us: "${desc.description.replace(/"/g, '\\"')}"
    pt_br: "${desc.description.replace(/"/g, '\\"')}"
  tagline:
    en_us: "${(desc.name || folder)} Runner"
    pt_br: "${(desc.name || folder)} Runner"
  developer: "${desc.author || 'Private Market Admin'}"
  author: "${desc.author || 'Private Market Admin'}"
  icon: "${REPO_BASE_URL}/Apps/${folder}/icon.png"
  thumbnail: "${REPO_BASE_URL}/Apps/${folder}/icon.png"
  title:
    en_us: "${desc.name || folder}"
  category: "${category}"
  port_map: "${appPort}"
  index: /
`;

  const metaJsonContent = {
    id: folder,
    title: desc.name || folder,
    tagline: desc.description || `${desc.name} Runner`,
    description: desc.long_description || desc.description,
    category: category,
    categories: [category.toLowerCase()],
    author: desc.author || 'Private Market Admin',
    developer: desc.author || 'Private Market Admin',
    icon: `${REPO_BASE_URL}/Apps/${folder}/icon.png`,
    thumbnail: `${REPO_BASE_URL}/Apps/${folder}/icon.png`,
    compose_url: `${REPO_BASE_URL}/Apps/${folder}/docker-compose.yml`,
    base_url: REPO_BASE_URL,
    version: '1.0.0',
    architectures: desc.supported_architectures || ['amd64', 'arm64', 'arm'],
    min_memory: 0,
    min_image_size: {
      amd64: 0,
      arm64: 0
    }
  };

  // 2. Sync to apps/ folder (Cosmos legacy mirror + lowercase compatibility)
  const legacyAppDir = path.join(appsDir, folder);
  if (fs.existsSync(legacyAppDir)) {
    fs.writeFileSync(path.join(legacyAppDir, 'description.json'), JSON.stringify(desc, null, 2));
    fs.copyFileSync(cosmosComposePath, path.join(legacyAppDir, 'cosmos-compose.json'));
    if (fs.existsSync(iconPath)) {
      fs.copyFileSync(iconPath, path.join(legacyAppDir, 'icon.png'));
    }
    fs.writeFileSync(path.join(legacyAppDir, 'docker-compose.yml'), dockerComposeYaml);
    fs.writeFileSync(path.join(legacyAppDir, 'meta.json'), JSON.stringify(metaJsonContent, null, 2));
  }

  // 3. Generate ZimaOS / CasaOS App Structure (Apps/<folder>/)
  const zimaTargetDir = path.join(zimaAppsDir, folder);
  if (!fs.existsSync(zimaTargetDir)) {
    fs.mkdirSync(zimaTargetDir, { recursive: true });
  }

  if (fs.existsSync(iconPath)) {
    fs.copyFileSync(iconPath, path.join(zimaTargetDir, 'icon.png'));
  }

  fs.writeFileSync(path.join(zimaTargetDir, 'docker-compose.yml'), dockerComposeYaml);
  fs.writeFileSync(path.join(zimaTargetDir, 'meta.json'), JSON.stringify(metaJsonContent, null, 2));

  // 4. ZimaOS App Item for index.json
  zimaAppsList.push({
    id: folder,
    title: desc.name || folder,
    tagline: desc.description || `${desc.name} Runner`,
    category: category,
    categories: [category.toLowerCase()],
    author: desc.author || 'Private Market Admin',
    developer: desc.author || 'Private Market Admin',
    architectures: desc.supported_architectures || ['amd64', 'arm64', 'arm'],
    icon: `${REPO_BASE_URL}/Apps/${folder}/icon.png`,
    thumbnail: `${REPO_BASE_URL}/Apps/${folder}/icon.png`,
    compose_url: `${REPO_BASE_URL}/Apps/${folder}/docker-compose.yml`,
    meta_url: `${REPO_BASE_URL}/Apps/${folder}/meta.json`,
    version: '1.0.0'
  });
}

// 5. Unified index.json (Serving both Cosmos and ZimaOS v2 simultaneously)
const indexContent = {
  // ZimaOS v2 Store Protocol
  version: 2,
  updated_at: new Date().toISOString(),
  app_count: zimaAppsList.length,
  base_url: REPO_BASE_URL,
  apps: zimaAppsList,

  // Cosmos-Server Protocol
  source: `${REPO_BASE_URL}/servapps.json`,
  showcase: servappsList,
  all: servappsList
};

fs.writeFileSync(path.join(__dirname, 'servapps.json'), JSON.stringify(servappsList, null, 2));
fs.writeFileSync(path.join(__dirname, 'index.json'), JSON.stringify(indexContent, null, 2));

// 6. ZimaOS / CasaOS Store Manifests
const storeContent = {
  version: 2,
  store_id: 'com.leopersan.cosmos-custom-marketplace',
  name: 'Custom Git Runners Store',
  description: 'Deploy contínuo via Git para Node.js, Python, Golang, PHP, Rust e Nginx SPA no Cosmos-Server e ZimaOS / CasaOS.',
  maintainer: 'Private Market Admin',
  url: 'https://github.com/LeoPersan/cosmos-custom-marketplace'
};

const categoryListContent = [
  {
    id: 1,
    name: 'Development',
    description: 'Runtimes de desenvolvimento, APIs, compiladores e runners Git de CI/CD.'
  },
  {
    id: 2,
    name: 'Utilities',
    description: 'Servidores web estáticos, proxies e ferramentas auxiliares.'
  }
];

fs.writeFileSync(path.join(__dirname, 'store.json'), JSON.stringify(storeContent, null, 2));
fs.writeFileSync(path.join(__dirname, 'category-list.json'), JSON.stringify(categoryListContent, null, 2));
fs.writeFileSync(path.join(__dirname, 'recommend-list.json'), JSON.stringify(recommendList, null, 2));

console.log(`Successfully compiled dual-target market:`);
console.log(`- Cosmos-Server: ${servappsList.length} ServApps compiled into servapps.json & index.json`);
console.log(`- ZimaOS / CasaOS: ${zimaAppsList.length} Apps compiled into Apps/ + index.json (apps: [${zimaAppsList.length}]) & store.json`);

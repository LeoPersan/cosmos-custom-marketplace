import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REPO_BASE_URL = 'https://raw.githubusercontent.com/LeoPersan/cosmos-custom-marketplace/main';

const servappsDir = path.join(__dirname, 'servapps');
const appFolders = fs.readdirSync(servappsDir).filter((file) => {
  return fs.lstatSync(path.join(servappsDir, file)).isDirectory();
});

const servappsList = [];

for (const folder of appFolders) {
  const descPath = path.join(servappsDir, folder, 'description.json');
  if (!fs.existsSync(descPath)) continue;

  const desc = JSON.parse(fs.readFileSync(descPath, 'utf-8'));
  
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

  // Sync back to apps folder if present
  const appsDescPath = path.join(__dirname, 'apps', folder, 'description.json');
  if (fs.existsSync(path.dirname(appsDescPath))) {
    fs.writeFileSync(appsDescPath, JSON.stringify(desc, null, 2));
  }

  servappsList.push(servapp);
}

const indexContent = {
  source: `${REPO_BASE_URL}/servapps.json`,
  showcase: servappsList,
  all: servappsList
};

fs.writeFileSync(path.join(__dirname, 'servapps.json'), JSON.stringify(servappsList, null, 2));
fs.writeFileSync(path.join(__dirname, 'index.json'), JSON.stringify(indexContent, null, 2));

console.log(`Successfully compiled ${servappsList.length} ServApps into servapps.json and index.json!`);

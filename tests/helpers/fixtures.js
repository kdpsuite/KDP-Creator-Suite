const fs = require('fs');
const path = require('path');
const os = require('os');

const FIXTURES_DIR = path.join(__dirname, '..', 'fixtures');

function ensureFixturesDir() {
  fs.mkdirSync(FIXTURES_DIR, { recursive: true });
}

function getSamplePdfPath() {
  ensureFixturesDir();
  const filePath = path.join(FIXTURES_DIR, 'sample-kdp.pdf');

  if (!fs.existsSync(filePath)) {
    const pdf = Buffer.from(
      '%PDF-1.4\n' +
        '1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n' +
        '2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n' +
        '3 0 obj<</Type/Page/MediaBox[0 0 432 648]/Parent 2 0 R/Resources<<>>>>endobj\n' +
        'xref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000052 00000 n \n0000000101 00000 n \n' +
        'trailer<</Size 4/Root 1 0 R>>\nstartxref\n178\n%%EOF'
    );
    fs.writeFileSync(filePath, pdf);
  }

  return filePath;
}

function getSamplePngPath() {
  ensureFixturesDir();
  const filePath = path.join(FIXTURES_DIR, 'sample-coloring.png');

  if (!fs.existsSync(filePath)) {
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64'
    );
    fs.writeFileSync(filePath, png);
  }

  return filePath;
}

function createTempImagePaths(count = 2) {
  const samplePath = getSamplePngPath();
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kdp-batch-'));
  const paths = [];

  for (let index = 0; index < count; index += 1) {
    const target = path.join(tempDir, `sample-${index}.png`);
    fs.copyFileSync(samplePath, target);
    paths.push(target);
  }

  return { tempDir, paths };
}

async function uploadFileViaChooser(page, chooseFileIndex, filePath) {
  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByRole('button', { name: 'Choose File' }).nth(chooseFileIndex).click(),
  ]);
  await fileChooser.setFiles(filePath);
}

module.exports = {
  getSamplePdfPath,
  getSamplePngPath,
  createTempImagePaths,
  uploadFileViaChooser,
};

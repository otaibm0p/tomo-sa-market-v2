const fs = require('fs');
const path = require('path');

const layoutPath = path.join(__dirname, 'data', 'homeLayout.json');
console.log('Layout Path:', layoutPath);
console.log('Exists:', fs.existsSync(layoutPath));

if (fs.existsSync(layoutPath)) {
  const content = fs.readFileSync(layoutPath, 'utf8');
  console.log('Content length:', content.length);
  try {
    const parsed = JSON.parse(content);
    console.log('Valid JSON:', true);
    console.log('Sections:', parsed.sections?.length || 0);
  } catch (e) {
    console.log('Invalid JSON:', e.message);
  }
}


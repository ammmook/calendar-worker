import fs from 'fs';
import path from 'path';

// Define correct paths relative to the current working directory
const rootDir = process.cwd();
const msgTxtPath = path.join(rootDir, 'msg.txt');
const timeflowCssPath = path.join(rootDir, 'src', 'timeflow.css');
const indexCssPath = path.join(rootDir, 'src', 'index.css');

// Extract CSS from msg.txt
const content = fs.readFileSync(msgTxtPath, 'utf8');
const styleMatch = content.match(/<style>([\s\S]*?)<\/style>/);

if (styleMatch) {
  fs.writeFileSync(timeflowCssPath, styleMatch[1].trim());
  console.log('Extracted CSS to src/timeflow.css');
}

// Ensure timeflow.css is imported in index.css
let indexCss = fs.readFileSync(indexCssPath, 'utf8');

if (!indexCss.includes('@import "./timeflow.css"')) {
  fs.writeFileSync(indexCssPath, `@import "./timeflow.css";\n${indexCss}`);
  console.log('Appended import to src/index.css');
}

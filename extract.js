import fs from 'fs';

const content = fs.readFileSync('c:/Users/ammmook/Desktop/ammmook-coding/try-coding/calendar-worker/msg.txt', 'utf8');

const styleMatch = content.match(/<style>([\s\S]*?)<\/style>/);
if (styleMatch) {
  fs.writeFileSync('c:/Users/ammmook/Desktop/ammmook-coding/try-coding/calendar-worker/src/timeflow.css', styleMatch[1]);
  console.log('Extracted CSS to timeflow.css');
}

// Ensure timeflow.css is imported in index.css
const indexCssPath = 'c:/Users/ammmook/Desktop/ammmook-coding/try-coding/calendar-worker/src/index.css';
let indexCss = fs.readFileSync(indexCssPath, 'utf8');
if (!indexCss.includes('@import "./timeflow.css"')) {
  fs.writeFileSync(indexCssPath, `@import "./timeflow.css";\n${indexCss}`);
  console.log('Appended to index.css');
}

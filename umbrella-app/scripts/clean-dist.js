const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
// Keep completed release artifacts between builds. Each packaging script
// replaces its exact versioned output, while retaining prior deliverables
// avoids failing the entire build when Explorer or antivirus briefly holds
// the portable-release directory open.
['dist', 'build'].forEach((name) => {
  const target = path.join(root, name);
  if (fs.existsSync(target)) {
    fs.rmSync(target, { recursive: true, force: true });
    console.log('Removed ' + name);
  } else {
    console.log('Already clean: ' + name);
  }
});

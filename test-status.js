const { execSync } = require('child_process');
console.log("Checking git status...");
try {
  const status = execSync('git status', { encoding: 'utf8' });
  console.log(status);
} catch(e) {
  console.log("Error:", e.message);
}
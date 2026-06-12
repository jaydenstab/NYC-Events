#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Setting up WhatsUpNYC - Hyperlocal Event Aggregator\n');

// Check if Node.js is installed
try {
  const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
  console.log(`✅ Node.js ${nodeVersion} detected`);
} catch (error) {
  console.error('❌ Node.js is not installed. Please install Node.js v16 or higher.');
  process.exit(1);
}

// Check if npm is available
try {
  const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
  console.log(`✅ npm ${npmVersion} detected`);
} catch (error) {
  console.error('❌ npm is not available. Please install npm.');
  process.exit(1);
}

// Create environment files if they don't exist
const backendEnvPath = path.join(__dirname, 'backend', '.env');
const frontendEnvPath = path.join(__dirname, 'frontend', '.env.local');

if (!fs.existsSync(backendEnvPath)) {
  const examplePath = path.join(__dirname, 'backend', 'env.example');
  if (fs.existsSync(examplePath)) {
    fs.copyFileSync(examplePath, backendEnvPath);
  } else {
    fs.writeFileSync(backendEnvPath, `PORT=8000
GEMINI_API_KEY=your_gemini_api_key_here
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
SKIP_GEOCODE=false
SEMANTIC_SEARCH_ENABLED=true
`);
  }
  console.log('📝 Created backend/.env from env.example');
}

if (!fs.existsSync(frontendEnvPath)) {
  fs.writeFileSync(frontendEnvPath, `VITE_MAPBOX_ACCESS_TOKEN=your_mapbox_access_token_here
# VITE_API_BASE_URL=
`);
  console.log('📝 Created frontend/.env.local file');
}

// Install dependencies
console.log('\n📦 Installing dependencies...\n');

try {
  console.log('Installing root dependencies...');
  execSync('npm install', { stdio: 'inherit' });
  
  console.log('Installing backend dependencies...');
  execSync('npm install', { cwd: path.join(__dirname, 'backend'), stdio: 'inherit' });
  
  console.log('Installing frontend dependencies...');
  execSync('npm install', { cwd: path.join(__dirname, 'frontend'), stdio: 'inherit' });
  
  console.log('\n✅ All dependencies installed successfully!');
} catch (error) {
  console.error('❌ Error installing dependencies:', error.message);
  process.exit(1);
}

console.log('\n🎉 Setup complete! Next steps:');
console.log('1. Get your API keys:');
console.log('   - Google Gemini API: https://makersuite.google.com/app/apikey');
console.log('   - Mapbox (frontend only): https://account.mapbox.com/access-tokens/');
console.log('2. Set GEMINI_API_KEY in backend/.env and VITE_MAPBOX_ACCESS_TOKEN in frontend/.env.local');
console.log('3. Run the application: npm run dev');
console.log('\n📚 For more information, see README.md');

// Simple test to validate the BlockClaim application structure
// Run with: node test/structure-test.js

const fs = require('fs');
const path = require('path');

console.log('🧪 BlockClaim Structure Test');
console.log('============================\n');

// Test files exist
const requiredFiles = [
  'package.json',
  'README.md', 
  'server/index.js',
  'server/models/Block.js',
  'server/models/User.js',
  'server/scripts/initDatabase.js',
  'public/index.html',
  'public/css/style.css',
  'public/js/app.js',
  'public/js/grid.js',
  'public/js/socket-handler.js',
  'public/js/ui.js',
  'public/js/utils.js'
];

let allFilesExist = true;

console.log('📁 Checking required files...');
requiredFiles.forEach(file => {
  const exists = fs.existsSync(path.join(__dirname, '..', file));
  console.log(`${exists ? '✅' : '❌'} ${file}`);
  if (!exists) allFilesExist = false;
});

console.log('\n📊 File Statistics:');
requiredFiles.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    const sizeKB = Math.round(stats.size / 1024 * 100) / 100;
    console.log(`   ${file}: ${sizeKB} KB`);
  }
});

// Test package.json content
console.log('\n📦 Package.json validation...');
try {
  const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
  
  const requiredDeps = ['express', 'socket.io', 'sqlite3', 'uuid', 'cors'];
  const missingDeps = requiredDeps.filter(dep => !pkg.dependencies || !pkg.dependencies[dep]);
  
  if (missingDeps.length === 0) {
    console.log('✅ All required dependencies defined');
  } else {
    console.log('❌ Missing dependencies:', missingDeps);
    allFilesExist = false;
  }
  
  const requiredScripts = ['start', 'dev', 'init-db'];
  const missingScripts = requiredScripts.filter(script => !pkg.scripts || !pkg.scripts[script]);
  
  if (missingScripts.length === 0) {
    console.log('✅ All required scripts defined');
  } else {
    console.log('❌ Missing scripts:', missingScripts);
  }
  
} catch (error) {
  console.log('❌ Error reading package.json:', error.message);
  allFilesExist = false;
}

// Test basic HTML structure
console.log('\n🌐 HTML structure validation...');
try {
  const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
  
  const requiredElements = [
    'gameCanvas',
    'userBadge', 
    'connectionStatus',
    'statsPanel',
    'leaderboardList',
    'onlineUsersList'
  ];
  
  const missingElements = requiredElements.filter(id => !html.includes(`id="${id}"`));
  
  if (missingElements.length === 0) {
    console.log('✅ All required HTML elements present');
  } else {
    console.log('❌ Missing HTML elements:', missingElements);
  }
  
} catch (error) {
  console.log('❌ Error reading HTML:', error.message);
}

// Test server structure
console.log('\n🖥️  Server structure validation...');
try {
  const serverCode = fs.readFileSync(path.join(__dirname, '..', 'server', 'index.js'), 'utf8');
  
  const requiredClasses = ['BlockClaimServer'];
  const requiredMethods = ['setupSocketHandlers', 'claimBlock', 'setupRoutes'];
  
  requiredClasses.forEach(className => {
    if (serverCode.includes(`class ${className}`) || serverCode.includes(`function ${className}`)) {
      console.log(`✅ ${className} class/function found`);
    } else {
      console.log(`⚠️  ${className} class/function not found`);
    }
  });
  
} catch (error) {
  console.log('❌ Error reading server code:', error.message);
}

// Final result
console.log('\n🎯 Test Results:');
console.log('================');
if (allFilesExist) {
  console.log('🎉 SUCCESS: BlockClaim structure is valid!');
  console.log('\n🚀 Next steps:');
  console.log('   1. Run: npm install');
  console.log('   2. Run: npm run init-db');
  console.log('   3. Run: npm start');
  console.log('   4. Open: http://localhost:3000');
} else {
  console.log('❌ FAILED: Some required files or content missing');
  console.log('\n🔧 Please check the missing items above');
}

console.log('\n📝 Note: This test only checks file structure, not runtime functionality');
console.log('   For full testing, start the server and test in browser\n');
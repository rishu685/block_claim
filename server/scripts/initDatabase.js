const BlockModel = require('../models/Block');

async function initializeDatabase() {
  console.log('Initializing BlockClaim database...');
  
  try {
    const blockModel = new BlockModel();
    await blockModel.initialize();
    
    console.log('✅ Database initialized successfully!');
    console.log('📊 Grid size: 50x50 (2,500 claimable blocks)');
    console.log('🔧 Tables created with proper indexes');
    console.log('💾 Ready for real-time block claims');
    
    // Close the database connection
    blockModel.close();
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
    process.exit(1);
  }
}

// Run initialization if this script is called directly
if (require.main === module) {
  initializeDatabase();
}

module.exports = { initializeDatabase };
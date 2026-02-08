// Simplified Block model that uses in-memory storage instead of SQLite
// This allows the app to run without database dependencies

class BlockModel {
  constructor() {
    this.blocks = new Map(); // In-memory storage: key -> block data
    this.gridSize = 50; // 50x50 grid = 2,500 blocks
    console.log('BlockModel initialized with in-memory storage');
  }

  async initialize() {
    // No database setup needed - just log success
    console.log('In-memory block storage ready');
    return Promise.resolve();
  }

  async claimBlock(x, y, userId, userName, userColor) {
    const key = `${x}-${y}`;
    const timestamp = new Date().toISOString();

    // Check if block is already claimed
    if (this.blocks.has(key)) {
      const existingBlock = this.blocks.get(key);
      return {
        success: false,
        error: 'Block already claimed',
        currentOwner: {
          name: existingBlock.ownerName,
          color: existingBlock.ownerColor,
          claimedAt: existingBlock.claimedAt
        }
      };
    }

    // Claim the block
    const block = { 
      x, 
      y, 
      owner: userId, 
      ownerName: userName, 
      ownerColor: userColor, 
      claimedAt: timestamp 
    };
    
    this.blocks.set(key, block);
    
    console.log(`Block (${x}, ${y}) claimed by ${userName}`);
    return { success: true, block };
  }

  getAllBlocksSync() {
    // Convert Map to object format expected by frontend
    const claimedBlocks = {};
    this.blocks.forEach((block, key) => {
      claimedBlocks[key] = {
        owner: block.owner,
        ownerName: block.ownerName,
        ownerColor: block.ownerColor,
        claimedAt: block.claimedAt
      };
    });
    
    return {
      gridSize: this.gridSize,
      claimedBlocks
    };
  }

  async getAllBlocks() {
    return this.getAllBlocksSync();
  }

  async getStats() {
    const totalBlocks = this.gridSize * this.gridSize;
    const totalClaimed = this.blocks.size;
    
    // Calculate leaderboard
    const playerStats = new Map();
    this.blocks.forEach(block => {
      const playerId = block.owner;
      if (playerStats.has(playerId)) {
        playerStats.get(playerId).blocksOwned++;
      } else {
        playerStats.set(playerId, {
          name: block.ownerName,
          color: block.ownerColor,
          blocksOwned: 1
        });
      }
    });
    
    const leaderboard = Array.from(playerStats.values())
      .sort((a, b) => b.blocksOwned - a.blocksOwned)
      .slice(0, 10);
    
    return {
      totalBlocks,
      totalClaimed,
      totalUnclaimed: totalBlocks - totalClaimed,
      uniqueOwners: playerStats.size,
      leaderboard
    };
  }

  async updateUserName(userId, newName) {
    let updatedCount = 0;
    
    this.blocks.forEach(block => {
      if (block.owner === userId) {
        block.ownerName = newName;
        updatedCount++;
      }
    });
    
    console.log(`Updated ${updatedCount} blocks for user name change`);
    return updatedCount;
  }

  // No cleanup needed for in-memory storage
  close() {
    console.log('In-memory block storage closed');
  }
}

module.exports = BlockModel;
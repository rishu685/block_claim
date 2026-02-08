const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class BlockModel {
  constructor() {
    this.db = null;
    this.blocks = new Map(); // In-memory cache for fast access
    this.gridSize = 50; // 50x50 grid = 2,500 blocks
  }

  async initialize() {
    return new Promise((resolve, reject) => {
      const dbPath = path.join(__dirname, '../data/blocks.db');
      
      // Ensure the data directory exists
      const fs = require('fs');
      const dataDir = path.dirname(dbPath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      this.db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          console.error('Error opening database:', err);
          reject(err);
          return;
        }
        console.log('Connected to SQLite database');
        this.createTables()
          .then(() => this.loadBlocksIntoMemory())
          .then(() => resolve())
          .catch(reject);
      });
    });
  }

  async createTables() {
    return new Promise((resolve, reject) => {
      const createBlocksTable = `
        CREATE TABLE IF NOT EXISTS blocks (
          id INTEGER PRIMARY KEY,
          x INTEGER NOT NULL,
          y INTEGER NOT NULL,
          owner TEXT,
          ownerName TEXT,
          ownerColor TEXT,
          claimedAt DATETIME,
          UNIQUE(x, y)
        )
      `;

      this.db.run(createBlocksTable, (err) => {
        if (err) {
          console.error('Error creating blocks table:', err);
          reject(err);
          return;
        }
        
        // Create index for faster lookups
        const createIndex = `CREATE INDEX IF NOT EXISTS idx_coordinates ON blocks(x, y)`;
        this.db.run(createIndex, (err) => {
          if (err) {
            console.error('Error creating index:', err);
            reject(err);
          } else {
            console.log('Database tables created successfully');
            resolve();
          }
        });
      });
    });
  }

  async loadBlocksIntoMemory() {
    return new Promise((resolve, reject) => {
      const query = 'SELECT * FROM blocks WHERE owner IS NOT NULL';
      
      this.db.all(query, [], (err, rows) => {
        if (err) {
          console.error('Error loading blocks:', err);
          reject(err);
          return;
        }

        // Clear existing cache
        this.blocks.clear();

        // Load claimed blocks into memory
        rows.forEach(row => {
          const key = `${row.x}-${row.y}`;
          this.blocks.set(key, {
            x: row.x,
            y: row.y,
            owner: row.owner,
            ownerName: row.ownerName,
            ownerColor: row.ownerColor,
            claimedAt: row.claimedAt
          });
        });

        console.log(`Loaded ${rows.length} claimed blocks into memory`);
        resolve();
      });
    });
  }

  async claimBlock(x, y, userId, userName, userColor) {
    const key = `${x}-${y}`;
    const timestamp = new Date().toISOString();

    // Check if block is already claimed (in memory for speed)
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

    // Attempt to claim the block in database
    return new Promise((resolve) => {
      const insertQuery = `
        INSERT OR IGNORE INTO blocks (x, y, owner, ownerName, ownerColor, claimedAt)
        VALUES (?, ?, ?, ?, ?, ?)
      `;

      this.db.run(insertQuery, [x, y, userId, userName, userColor, timestamp], function(err) {
        if (err) {
          console.error('Database error during block claim:', err);
          resolve({ success: false, error: 'Database error' });
          return;
        }

        if (this.changes === 0) {
          // Block was already claimed by someone else (race condition)
          resolve({ success: false, error: 'Block claimed by another user' });
        } else {
          // Success! Add to memory cache
          const block = { x, y, owner: userId, ownerName: userName, ownerColor: userColor, claimedAt: timestamp };
          this.blocks.set(key, block);
          
          resolve({ success: true, block });
        }
      });
    });
  }

  getAllBlocksSync() {
    // Return only claimed blocks to reduce data transfer
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
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          COUNT(*) as totalClaimed,
          COUNT(DISTINCT owner) as uniqueOwners,
          ownerName,
          ownerColor,
          COUNT(*) as blocksOwned
        FROM blocks 
        WHERE owner IS NOT NULL
        GROUP BY owner, ownerName, ownerColor
        ORDER BY blocksOwned DESC
      `;

      this.db.all(query, [], (err, rows) => {
        if (err) {
          console.error('Error getting stats:', err);
          reject(err);
          return;
        }

        const totalBlocks = this.gridSize * this.gridSize;
        const totalClaimed = rows.reduce((sum, row) => sum + row.blocksOwned, 0);
        
        resolve({
          totalBlocks,
          totalClaimed,
          totalUnclaimed: totalBlocks - totalClaimed,
          uniqueOwners: rows.length,
          leaderboard: rows.slice(0, 10).map(row => ({
            name: row.ownerName,
            color: row.ownerColor,
            blocksOwned: row.blocksOwned
          }))
        });
      });
    });
  }

  async updateUserName(userId, newName) {
    return new Promise((resolve, reject) => {
      const query = 'UPDATE blocks SET ownerName = ? WHERE owner = ?';
      
      this.db.run(query, [newName, userId], function(err) {
        if (err) {
          console.error('Error updating user name:', err);
          reject(err);
          return;
        }

        // Update memory cache
        this.blocks.forEach(block => {
          if (block.owner === userId) {
            block.ownerName = newName;
          }
        });

        console.log(`Updated ${this.changes} blocks for user name change`);
        resolve(this.changes);
      });
    });
  }

  close() {
    if (this.db) {
      this.db.close((err) => {
        if (err) {
          console.error('Error closing database:', err);
        } else {
          console.log('Database connection closed');
        }
      });
    }
  }
}

module.exports = BlockModel;
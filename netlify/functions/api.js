const fs = require('fs');
const path = require('path');

// In-memory storage (will reset on each cold start)
let blocks = {};
let users = [];
let stats = { totalClaimed: 0 };

// Simple user management
class UserManager {
  constructor() {
    this.users = [];
    this.colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57',
      '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3', '#FF9F43',
      '#FFD93D', '#6C5CE7', '#A29BFE', '#FD79A8', '#E17055'
    ];
    this.names = [
      'Block Hunter', 'Grid Master', 'Pixel Warrior', 'Square Seeker', 'Territory King',
      'Block Ninja', 'Grid Explorer', 'Pixel Pioneer', 'Square Conqueror', 'Area Defender'
    ];
  }

  createUser(id) {
    const user = {
      id,
      name: this.names[Math.floor(Math.random() * this.names.length)],
      color: this.colors[Math.floor(Math.random() * this.colors.length)],
      blocksOwned: 0
    };
    
    this.users.push(user);
    return user;
  }

  getConnectedUsers() {
    return this.users;
  }
}

// Block management
class BlockModel {
  constructor() {
    this.blocks = blocks;
  }

  initialize() {
    // Initialize empty grid
    return Promise.resolve();
  }

  getAllBlocksSync() {
    return Object.values(this.blocks);
  }

  async claimBlock(x, y, userId, userName, userColor) {
    const blockId = `${x}-${y}`;
    
    if (this.blocks[blockId]) {
      return {
        success: false,
        error: 'Block already claimed',
        currentOwner: this.blocks[blockId]
      };
    }

    const block = {
      x,
      y,
      owner: userId,
      ownerName: userName,
      ownerColor: userColor,
      claimedAt: new Date().toISOString()
    };

    this.blocks[blockId] = block;
    stats.totalClaimed++;

    return { success: true, block };
  }

  async getStats() {
    return {
      totalClaimed: stats.totalClaimed,
      totalBlocks: 2500
    };
  }
}

// Initialize managers
const userManager = new UserManager();
const blockModel = new BlockModel();

function generateId() {
  return Array.from({length: 16}, () => 
    Math.floor(Math.random() * 256).toString(16).padStart(2, '0')
  ).join('');
}

function isValidCoordinate(x, y) {
  return Number.isInteger(x) && Number.isInteger(y) && 
         x >= 0 && x < 50 && y >= 0 && y < 50;
}

function serveStaticFile(filePath) {
  try {
    let fullPath;
    if (filePath === 'simple.html' || filePath === '/') {
      fullPath = path.join(__dirname, '../../simple.html');
    } else {
      fullPath = path.join(__dirname, '../../', filePath);
    }
    
    const content = fs.readFileSync(fullPath);
    let contentType = 'text/plain';
    
    if (filePath.endsWith('.html')) contentType = 'text/html';
    else if (filePath.endsWith('.css')) contentType = 'text/css';
    else if (filePath.endsWith('.js')) contentType = 'application/javascript';
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*'
      },
      body: content.toString()
    };
  } catch (error) {
    return {
      statusCode: 404,
      headers: {
        'Content-Type': 'text/plain',
        'Access-Control-Allow-Origin': '*'
      },
      body: 'File not found'
    };
  }
}

exports.handler = async (event, context) => {
  const { httpMethod, path: requestPath, queryStringParameters, body } = event;
  
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // Handle OPTIONS (preflight)
  if (httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Route handling
  if (requestPath === '/' || requestPath === '/index.html') {
    return serveStaticFile('simple.html');
  }
  
  if (requestPath.startsWith('/css/')) {
    return serveStaticFile(`public${requestPath}`);
  }
  
  if (requestPath.startsWith('/js/')) {
    return serveStaticFile(`public${requestPath}`);
  }

  // API routes
  if (requestPath === '/api/blocks' && httpMethod === 'GET') {
    try {
      const blocks = blockModel.getAllBlocksSync();
      return {
        statusCode: 200,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true, blocks })
      };
    } catch (error) {
      return {
        statusCode: 500,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: false, error: 'Failed to get blocks' })
      };
    }
  }

  if (requestPath === '/api/stats' && httpMethod === 'GET') {
    try {
      const statsData = await blockModel.getStats();
      const usersData = userManager.getConnectedUsers();
      
      return {
        statusCode: 200,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          success: true, 
          stats: {
            ...statsData,
            connectedUsers: usersData.length,
            users: usersData.map(u => ({ 
              id: u.id, 
              name: u.name, 
              color: u.color, 
              blocksOwned: u.blocksOwned 
            }))
          }
        })
      };
    } catch (error) {
      return {
        statusCode: 500,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: false, error: 'Failed to get stats' })
      };
    }
  }

  if (requestPath === '/api/join' && httpMethod === 'POST') {
    const userId = generateId();
    const user = userManager.createUser(userId);
    
    return {
      statusCode: 200,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        success: true, 
        user: {
          id: user.id,
          name: user.name,
          color: user.color
        }
      })
    };
  }

  if (requestPath === '/api/claim-block' && httpMethod === 'POST') {
    try {
      const { x, y, userId, userName, userColor } = JSON.parse(body);
      
      if (!isValidCoordinate(x, y)) {
        return {
          statusCode: 400,
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: false, error: 'Invalid coordinates' })
        };
      }

      const result = await blockModel.claimBlock(x, y, userId, userName, userColor);
      
      if (result.success) {
        return {
          statusCode: 200,
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: true })
        };
      } else {
        return {
          statusCode: 409,
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            success: false, 
            error: result.error,
            currentOwner: result.currentOwner
          })
        };
      }
    } catch (error) {
      return {
        statusCode: 500,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: false, error: 'Server error' })
      };
    }
  }

  // Default 404
  return {
    statusCode: 404,
    headers: { ...headers, 'Content-Type': 'text/plain' },
    body: 'Not Found'
  };
};
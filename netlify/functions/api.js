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
      '#10b981', '#059669', '#047857', '#065f46', '#064e3b',
      '#34d399', '#6ee7b7', '#a7f3d0', '#d1fae5', '#ecfdf5',
      '#14b8a6', '#0d9488', '#0f766e', '#115e59', '#134e4a'
    ];
    this.names = [
      'Emerald Guardian', 'Forest Walker', 'Jade Master', 'Mint Ninja', 'Pine Warrior',
      'Sage Hunter', 'Moss Keeper', 'Leaf Phantom', 'Grove Seeker', 'Verdant Knight',
      'Cedar Ghost', 'Fern Sage', 'Ivy Reaper', 'Bamboo Fox', 'Olive Warden'
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
    if (filePath === 'netlify.html' || filePath === '/') {
      fullPath = path.join(__dirname, '../../netlify.html');
    } else if (filePath === 'index.html') {
      fullPath = path.join(__dirname, '../../index.html');
    } else {
      fullPath = path.join(__dirname, '../../', filePath);
    }
    
    console.log('Trying to serve file:', fullPath); // Debug logging
    
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
    console.log('File serve error:', error.message); // Debug logging
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
  
  console.log('Request:', httpMethod, requestPath); // Debug logging
  
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

  // Clean up path - remove leading /api if present
  let cleanPath = requestPath;
  if (cleanPath.startsWith('/api')) {
    cleanPath = cleanPath.substring(4);
  }
  if (cleanPath === '') {
    cleanPath = '/';
  }

  console.log('Clean path:', cleanPath); // Debug logging

  // Route handling
  if (cleanPath === '/' || cleanPath === '/index.html') {
    return serveStaticFile('netlify.html');
  }
  
  if (cleanPath.startsWith('/css/')) {
    return serveStaticFile(`public${cleanPath}`);
  }
  
  if (cleanPath.startsWith('/js/')) {
    return serveStaticFile(`public${cleanPath}`);
  }

  // API routes
  if (cleanPath === '/blocks' && httpMethod === 'GET') {
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

  if (cleanPath === '/stats' && httpMethod === 'GET') {
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

  if (cleanPath === '/join' && httpMethod === 'POST') {
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

  if (cleanPath === '/claim-block' && httpMethod === 'POST') {
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
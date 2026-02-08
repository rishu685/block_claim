// Simplified server using only Node.js built-in modules
// No external dependencies required - runs immediately!

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const BlockModel = require('./models/BlockSimple');
const UserManager = require('./models/UserSimple');

class SimpleBlockClaimServer {
  constructor() {
    this.server = http.createServer();
    this.userManager = new UserManager();
    this.blockModel = new BlockModel();
    this.clients = new Map(); // Store SSE connections
    
    this.setupRequestHandlers();
  }

  setupRequestHandlers() {
    this.server.on('request', (req, res) => {
      const parsedUrl = url.parse(req.url, true);
      const pathname = parsedUrl.pathname;
      
      // Enable CORS
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      
      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }

      // Routes
      if (pathname === '/' || pathname === '/index.html') {
        this.serveFile(res, 'simple.html', 'text/html');
      } else if (pathname.startsWith('/css/')) {
        this.serveFile(res, `public${pathname}`, 'text/css');
      } else if (pathname.startsWith('/js/')) {
        this.serveFile(res, `public${pathname}`, 'application/javascript');
      } else if (pathname === '/api/blocks') {
        this.handleGetBlocks(req, res);
      } else if (pathname === '/api/stats') {
        this.handleGetStats(req, res);
      } else if (pathname === '/api/claim-block' && req.method === 'POST') {
        this.handleClaimBlock(req, res);
      } else if (pathname === '/api/events') {
        this.handleSSE(req, res);
      } else if (pathname === '/api/join') {
        this.handleUserJoin(req, res);
      } else {
        res.writeHead(404, {'Content-Type': 'text/plain'});
        res.end('Not Found');
      }
    });
  }

  serveFile(res, filePath, contentType) {
    try {
      const fullPath = path.join(__dirname, '..', filePath);
      const content = fs.readFileSync(fullPath);
      res.writeHead(200, {'Content-Type': contentType});
      res.end(content);
    } catch (error) {
      res.writeHead(404, {'Content-Type': 'text/plain'});
      res.end('File not found');
    }
  }

  handleGetBlocks(req, res) {
    try {
      const blocks = this.blockModel.getAllBlocksSync();
      res.writeHead(200, {'Content-Type': 'application/json'});
      res.end(JSON.stringify({ success: true, blocks }));
    } catch (error) {
      res.writeHead(500, {'Content-Type': 'application/json'});
      res.end(JSON.stringify({ success: false, error: 'Failed to get blocks' }));
    }
  }

  async handleGetStats(req, res) {
    try {
      const stats = await this.blockModel.getStats();
      const users = this.userManager.getConnectedUsers();
      
      res.writeHead(200, {'Content-Type': 'application/json'});
      res.end(JSON.stringify({ 
        success: true, 
        stats: {
          ...stats,
          connectedUsers: users.length,
          users: users.map(u => ({ 
            id: u.id, 
            name: u.name, 
            color: u.color, 
            blocksOwned: u.blocksOwned 
          }))
        }
      }));
    } catch (error) {
      res.writeHead(500, {'Content-Type': 'application/json'});
      res.end(JSON.stringify({ success: false, error: 'Failed to get stats' }));
    }
  }

  handleUserJoin(req, res) {
    const userId = this.generateId();
    const user = this.userManager.createUser(userId);
    
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({ 
      success: true, 
      user: {
        id: user.id,
        name: user.name,
        color: user.color
      }
    }));

    // Broadcast user joined
    this.broadcast('user-joined', {
      id: user.id,
      name: user.name,
      color: user.color,
      connectedUsers: this.userManager.getConnectedUsers().length
    });
  }

  async handleClaimBlock(req, res) {
    try {
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      
      req.on('end', async () => {
        const { x, y, userId, userName, userColor } = JSON.parse(body);
        
        if (!this.isValidCoordinate(x, y)) {
          res.writeHead(400, {'Content-Type': 'application/json'});
          res.end(JSON.stringify({ success: false, error: 'Invalid coordinates' }));
          return;
        }

        const result = await this.blockModel.claimBlock(x, y, userId, userName, userColor);
        
        if (result.success) {
          // Update user stats
          this.userManager.incrementUserBlocks(userId);
          
          // Broadcast to all clients
          this.broadcast('block-claimed', {
            x: result.block.x,
            y: result.block.y,
            owner: result.block.owner,
            ownerName: result.block.ownerName,
            ownerColor: result.block.ownerColor,
            timestamp: result.block.claimedAt
          });
          
          res.writeHead(200, {'Content-Type': 'application/json'});
          res.end(JSON.stringify({ success: true }));
        } else {
          res.writeHead(409, {'Content-Type': 'application/json'});
          res.end(JSON.stringify({ 
            success: false, 
            error: result.error,
            currentOwner: result.currentOwner
          }));
        }
      });
    } catch (error) {
      res.writeHead(500, {'Content-Type': 'application/json'});
      res.end(JSON.stringify({ success: false, error: 'Server error' }));
    }
  }

  handleSSE(req, res) {
    // Server-Sent Events for real-time updates
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    const clientId = this.generateId();
    this.clients.set(clientId, res);

    // Send initial message
    res.write(`data: ${JSON.stringify({ type: 'connected', clientId })}\n\n`);

    // Clean up on client disconnect
    req.on('close', () => {
      this.clients.delete(clientId);
      console.log(`Client ${clientId} disconnected`);
    });

    req.on('error', () => {
      this.clients.delete(clientId);
    });
  }

  broadcast(event, data) {
    const message = `data: ${JSON.stringify({ type: event, data })}\n\n`;
    
    this.clients.forEach((res, clientId) => {
      try {
        res.write(message);
      } catch (error) {
        console.log(`Failed to send to client ${clientId}:`, error.message);
        this.clients.delete(clientId);
      }
    });
  }

  generateId() {
    // Simple UUID-like ID generation using crypto
    return Array.from({length: 16}, () => 
      Math.floor(Math.random() * 256).toString(16).padStart(2, '0')
    ).join('');
  }

  isValidCoordinate(x, y) {
    return Number.isInteger(x) && Number.isInteger(y) && 
           x >= 0 && x < 50 && y >= 0 && y < 50;
  }

  start(port = 3000) {
    console.log('Starting BlockClaim Simple Server...');
    
    this.blockModel.initialize()
      .then(() => {
        console.log('Block model initialized');
        
        this.server.listen(port, () => {
          console.log(`🚀 BlockClaim Simple Server running on http://localhost:${port}`);
          console.log(`📊 Grid size: 50x50 (2,500 claimable blocks)`);
          console.log(`🔌 Server-Sent Events ready for real-time updates`);
          console.log(`💡 Using in-memory storage (no database required)`);
          console.log(`\n🎮 Open http://localhost:${port} to play!`);
        });
      })
      .catch((error) => {
        console.error('Failed to start server:', error);
        process.exit(1);
      });
  }
}

// Start the server
if (require.main === module) {
  const server = new SimpleBlockClaimServer();
  const port = process.env.PORT || 3000;
  server.start(port);
}

module.exports = SimpleBlockClaimServer;
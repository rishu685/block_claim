const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const BlockModel = require('./models/Block');
const UserManager = require('./models/User');

class BlockClaimServer {
  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.io = new Server(this.server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });
    
    this.userManager = new UserManager();
    this.blockModel = new BlockModel();
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupSocketHandlers();
  }

  setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.static(path.join(__dirname, '../public')));
  }

  setupRoutes() {
    // Serve the main application
    this.app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, '../public/index.html'));
    });

    // API endpoints
    this.app.get('/api/blocks', async (req, res) => {
      try {
        const blocks = await this.blockModel.getAllBlocks();
        res.json({ success: true, blocks });
      } catch (error) {
        console.error('Error fetching blocks:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch blocks' });
      }
    });

    this.app.get('/api/stats', async (req, res) => {
      try {
        const stats = await this.blockModel.getStats();
        const users = this.userManager.getConnectedUsers();
        res.json({ 
          success: true, 
          stats: {
            ...stats,
            connectedUsers: users.length,
            users: users.map(u => ({ id: u.id, name: u.name, color: u.color, blocksOwned: u.blocksOwned }))
          }
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch stats' });
      }
    });
  }

  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`User connected: ${socket.id}`);
      
      // Generate user with unique color
      const user = this.userManager.createUser(socket.id);
      console.log(`Created user: ${user.name} with color ${user.color}`);

      // Send initial data
      socket.emit('user-assigned', user);
      socket.emit('blocks-initialized', this.blockModel.getAllBlocksSync());
      
      // Broadcast user joined
      socket.broadcast.emit('user-joined', {
        id: user.id,
        name: user.name,
        color: user.color,
        connectedUsers: this.userManager.getConnectedUsers().length
      });

      // Handle block claim attempts
      socket.on('claim-block', async (data) => {
        try {
          const { x, y } = data;
          
          // Validate coordinates
          if (!this.isValidCoordinate(x, y)) {
            socket.emit('claim-failed', { error: 'Invalid coordinates', x, y });
            return;
          }

          // Attempt to claim the block
          const result = await this.blockModel.claimBlock(x, y, user.id, user.name, user.color);
          
          if (result.success) {
            // Update user stats
            this.userManager.incrementUserBlocks(user.id);
            
            // Broadcast the successful claim to all users
            this.io.emit('block-claimed', {
              x: result.block.x,
              y: result.block.y,
              owner: result.block.owner,
              ownerName: result.block.ownerName,
              ownerColor: result.block.ownerColor,
              timestamp: result.block.claimedAt
            });
            
            console.log(`Block (${x}, ${y}) claimed by ${user.name}`);
          } else {
            // Send failure reason to the claiming user
            socket.emit('claim-failed', {
              error: result.error,
              x,
              y,
              currentOwner: result.currentOwner
            });
          }
        } catch (error) {
          console.error('Error handling claim-block:', error);
          socket.emit('claim-failed', { error: 'Server error', x: data.x, y: data.y });
        }
      });

      // Handle user name updates
      socket.on('update-name', (newName) => {
        if (newName && newName.trim().length > 0) {
          const oldName = user.name;
          user.name = newName.trim().substring(0, 20); // Limit name length
          this.userManager.updateUser(user);
          
          // Update all blocks owned by this user
          this.blockModel.updateUserName(user.id, user.name);
          
          // Broadcast name change
          this.io.emit('user-name-changed', {
            userId: user.id,
            oldName,
            newName: user.name,
            color: user.color
          });
          
          console.log(`User ${oldName} changed name to ${user.name}`);
        }
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`User disconnected: ${user.name} (${socket.id})`);
        
        this.userManager.removeUser(socket.id);
        
        // Broadcast user left
        socket.broadcast.emit('user-left', {
          id: user.id,
          name: user.name,
          connectedUsers: this.userManager.getConnectedUsers().length
        });
      });
    });
  }

  isValidCoordinate(x, y) {
    return Number.isInteger(x) && Number.isInteger(y) && 
           x >= 0 && x < 50 && y >= 0 && y < 50;
  }

  async start(port = 3000) {
    try {
      // Initialize database
      await this.blockModel.initialize();
      console.log('Database initialized successfully');
      
      this.server.listen(port, () => {
        console.log(`🚀 BlockClaim server running on http://localhost:${port}`);
        console.log(`📊 Grid size: 50x50 (2,500 claimable blocks)`);
        console.log(`🔌 WebSocket ready for real-time updates`);
      });
    } catch (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
  }
}

// Start the server
if (require.main === module) {
  const server = new BlockClaimServer();
  const port = process.env.PORT || 3000;
  server.start(port);
}

module.exports = BlockClaimServer;
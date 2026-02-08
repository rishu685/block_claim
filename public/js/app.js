// Main application file - BlockClaim

class BlockClaimApp {
  constructor() {
    this.grid = null;
    this.socket = null;
    this.ui = null;
    
    // Application state
    this.isInitialized = false;
    this.currentUser = null;
    this.gameStats = null;
    
    // Performance monitoring
    this.lastStatsUpdate = 0;
    this.statsUpdateInterval = 30000; // Update stats every 30 seconds
    
    console.log('BlockClaim app initializing...');
  }
  
  async initialize() {
    try {
      // Initialize UI handler first
      this.ui = new UIHandler();
      this.ui.showLoadingScreen();
      
      // Load user preferences
      this.ui.loadPreferences();
      
      // Setup UI callbacks
      this.setupUICallbacks();
      
      // Initialize grid renderer
      this.grid = new GridRenderer('gameCanvas', 50);
      this.setupGridCallbacks();
      
      // Initialize socket handler
      this.socket = new SocketHandler();
      this.setupSocketCallbacks();
      
      // Connect to server
      this.socket.connect();
      
      // Start periodic stats updates
      this.startStatsUpdates();
      
      console.log('BlockClaim app initialized successfully');
      this.isInitialized = true;
      
    } catch (error) {
      console.error('Failed to initialize app:', error);
      this.ui.showErrorScreen();
    }
  }
  
  setupUICallbacks() {
    // Connect UI actions to grid methods
    this.ui.onZoomIn = () => {
      if (this.grid) this.grid.zoomIn();
    };
    
    this.ui.onZoomOut = () => {
      if (this.grid) this.grid.zoomOut();
    };
    
    this.ui.onCenter = () => {
      if (this.grid) this.grid.resetCamera();
    };
    
    this.ui.onNameChange = (newName) => {
      if (this.socket) {
        this.socket.updateName(newName);
      }
    };
    
    this.ui.onInstructionsHidden = () => {
      // Game is ready to play
      console.log('Game ready - instructions hidden');
    };
  }
  
  setupGridCallbacks() {
    // Connect grid clicks to socket actions
    this.grid.onBlockClick = (x, y) => {
      if (this.socket && this.socket.isConnectedToServer()) {
        console.log(`User clicked block at (${x}, ${y})`);
        this.socket.claimBlock(x, y);
      } else {
        Utils.showToast('Not connected to server', 'error');
      }
    };
  }
  
  setupSocketCallbacks() {
    // Connection events
    this.socket.on('connected', () => {
      console.log('Socket connected - app ready');
      
      // Request initial stats
      this.updateStats();
    });
    
    this.socket.on('disconnected', (reason) => {
      console.log('Socket disconnected:', reason);
      
      if (reason === 'transport close' || reason === 'ping timeout') {
        // Show connection lost message
        Utils.showToast('Connection lost. Attempting to reconnect...', 'warning', 5000);
      }
    });
    
    this.socket.on('reconnected', () => {
      console.log('Socket reconnected - refreshing data');
      
      // Refresh all data after reconnection
      this.updateStats();
      this.refreshGridData();
    });
    
    // User events
    this.socket.on('user-assigned', (userData) => {
      console.log('User assigned:', userData);
      this.currentUser = userData;
      
      // Update UI with user data
      this.ui.updateUser(userData);
      this.ui.hideLoadingScreen();
      
      // Show instructions for first-time users
      if (this.ui.getState().showInstructions) {
        this.ui.showInstructions();
      }
    });
    
    // Block events
    this.socket.on('blocks-initialized', (blocksData) => {
      console.log('Blocks initialized:', blocksData);
      
      if (this.grid) {
        this.grid.setBlocks(blocksData);
      }
      
      // Hide loading screen once blocks are loaded
      this.ui.hideLoadingScreen();
    });
    
    this.socket.on('block-claimed', (blockData) => {
      console.log('Block claimed:', blockData);
      
      // Update grid with new block
      if (this.grid) {
        this.grid.claimBlock(
          blockData.x,
          blockData.y,
          {
            owner: blockData.owner,
            ownerName: blockData.ownerName,
            ownerColor: blockData.ownerColor,
            claimedAt: blockData.timestamp
          },
          true // animate
        );
      }
      
      // Update user's block count if it's their block
      if (blockData.owner === this.currentUser?.id) {
        this.ui.incrementUserBlocks();
        Utils.showToast('Block claimed successfully!', 'success', 2000);
      }
      
      // Update stats periodically (not on every block)
      const now = Date.now();
      if (now - this.lastStatsUpdate > 10000) { // Every 10 seconds max
        this.updateStats();
      }
    });
    
    this.socket.on('claim-failed', (errorData) => {
      console.log('Block claim failed:', errorData);
      // Toast notification is handled by socket handler
    });
    
    // User management events
    this.socket.on('user-joined', (userData) => {
      this.updateStats(); // Refresh connected users count
    });
    
    this.socket.on('user-left', (userData) => {
      this.updateStats(); // Refresh connected users count
    });
    
    this.socket.on('user-name-changed', (changeData) => {
      // Update grid blocks if needed (for visual consistency)
      if (this.grid && changeData.userId === this.currentUser?.id) {
        // The server will handle updating block owner names
        // We just need to refresh our user display
        this.currentUser.name = changeData.newName;
        this.ui.updateUser(this.currentUser);
      }
    });
  }
  
  async updateStats() {
    try {
      const stats = await this.socket.fetchStats();
      
      if (stats) {
        this.gameStats = stats;
        this.ui.updateStats(stats);
        this.lastStatsUpdate = Date.now();
        
        console.log('Stats updated:', stats);
      }
    } catch (error) {
      console.error('Failed to update stats:', error);
    }
  }
  
  async refreshGridData() {
    try {
      const blocks = await this.socket.fetchBlocks();
      
      if (blocks && this.grid) {
        this.grid.setBlocks(blocks);
        console.log('Grid data refreshed');
      }
    } catch (error) {
      console.error('Failed to refresh grid data:', error);
    }
  }
  
  startStatsUpdates() {
    // Update stats periodically
    setInterval(() => {
      if (this.socket && this.socket.isConnectedToServer()) {
        this.updateStats();
      }
    }, this.statsUpdateInterval);
    
    // Also update stats when window becomes visible again
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.socket && this.socket.isConnectedToServer()) {
        // Wait a bit for reconnection if needed
        setTimeout(() => {
          this.updateStats();
        }, 1000);
      }
    });
  }
  
  // Debug methods
  enableDebugMode() {
    window.DEBUG_MODE = true;
    console.log('Debug mode enabled');
    
    // Add debug info to console
    setInterval(() => {
      if (this.isInitialized) {
        console.log('Debug Info:', {
          connected: this.socket?.isConnectedToServer(),
          user: this.currentUser,
          stats: this.gameStats,
          fps: Utils.Performance.getFPS(),
          gridBlocks: this.grid?.blocks.size
        });
      }
    }, 10000);
  }
  
  // Public API for external use
  getCurrentUser() {
    return this.currentUser;
  }
  
  getGameStats() {
    return this.gameStats;
  }
  
  isConnected() {
    return this.socket?.isConnectedToServer() || false;
  }
  
  // Error handling
  handleError(error, context = 'Unknown') {
    console.error(`Error in ${context}:`, error);
    
    Utils.showToast(
      `Error: ${error.message || 'Something went wrong'}`,
      'error',
      5000
    );
  }
  
  // Cleanup
  destroy() {
    if (this.socket) {
      this.socket.disconnect();
    }
    
    console.log('BlockClaim app destroyed');
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Global error handling
  window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    Utils.showToast('An unexpected error occurred', 'error');
  });
  
  // Initialize the BlockClaim app
  window.blockClaimApp = new BlockClaimApp();
  window.blockClaimApp.initialize();
  
  // Enable debug mode in development
  if (window.location.hostname === 'localhost' || 
      window.location.hostname === '127.0.0.1' ||
      window.location.search.includes('debug=true')) {
    window.blockClaimApp.enableDebugMode();
  }
  
  console.log('🎮 BlockClaim loaded - Ready to capture blocks!');
});

// Export app for global access
window.BlockClaimApp = BlockClaimApp;
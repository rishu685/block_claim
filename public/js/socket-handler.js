// WebSocket handler for real-time communication

class SocketHandler {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000; // Start with 1 second
    
    // Event emitter for internal communication
    this.events = new Utils.EventEmitter();
    
    // User data
    this.currentUser = null;
    
    // Connection state
    this.connectionState = 'disconnected'; // 'connecting', 'connected', 'disconnected'
    
    console.log('Socket handler initialized');
  }
  
  connect() {
    if (this.socket && this.isConnected) {
      console.log('Already connected');
      return;
    }
    
    this.connectionState = 'connecting';
    this.updateConnectionUI();
    
    console.log('Connecting to server...');
    
    // Initialize Socket.IO connection
    this.socket = io({
      transports: ['websocket', 'polling'], // Fallback to polling if websocket fails
      timeout: 10000,
      forceNew: true
    });
    
    this.setupSocketListeners();
  }
  
  setupSocketListeners() {
    // Connection events
    this.socket.on('connect', () => {
      console.log('Connected to server:', this.socket.id);
      this.isConnected = true;
      this.connectionState = 'connected';
      this.reconnectAttempts = 0;
      this.reconnectDelay = 1000;
      
      this.updateConnectionUI();
      this.events.emit('connected');
      
      Utils.showToast('Connected to server!', 'success');
    });
    
    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected from server:', reason);
      this.isConnected = false;
      this.connectionState = 'disconnected';
      
      this.updateConnectionUI();
      this.events.emit('disconnected', reason);
      
      Utils.showToast('Lost connection to server', 'error');
      
      // Attempt to reconnect
      if (reason !== 'io client disconnect') {
        this.attemptReconnect();
      }
    });
    
    this.socket.on('reconnect', () => {
      console.log('Reconnected to server');
      this.isConnected = true;
      this.connectionState = 'connected';
      
      this.updateConnectionUI();
      this.events.emit('reconnected');
      
      Utils.showToast('Reconnected to server!', 'success');
    });
    
    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      this.connectionState = 'disconnected';
      this.updateConnectionUI();
      
      if (this.reconnectAttempts === 0) {
        Utils.showToast('Failed to connect to server', 'error');
      }
    });
    
    // Game events
    this.socket.on('user-assigned', (userData) => {
      console.log('User assigned:', userData);
      this.currentUser = userData;
      this.events.emit('user-assigned', userData);
    });
    
    this.socket.on('blocks-initialized', (blocksData) => {
      console.log('Blocks initialized:', blocksData);
      this.events.emit('blocks-initialized', blocksData);
    });
    
    this.socket.on('block-claimed', (blockData) => {
      console.log('Block claimed:', blockData);
      this.events.emit('block-claimed', blockData);
      
      // Show notification for other users' claims
      if (blockData.owner !== this.currentUser?.id) {
        Utils.showToast(
          `${blockData.ownerName} claimed a block!`,
          'success',
          2000
        );
      }
    });
    
    this.socket.on('claim-failed', (errorData) => {
      console.log('Claim failed:', errorData);
      this.events.emit('claim-failed', errorData);
      
      let message = 'Block claim failed';
      if (errorData.error === 'Block already claimed') {
        message = `Block already owned by ${errorData.currentOwner?.name || 'another player'}`;
      } else if (errorData.error === 'Invalid coordinates') {
        message = 'Invalid block coordinates';
      }
      
      Utils.showToast(message, 'warning', 3000);
    });
    
    // User events
    this.socket.on('user-joined', (userData) => {
      console.log('User joined:', userData);
      this.events.emit('user-joined', userData);
      
      Utils.showToast(
        `${userData.name} joined the game`,
        'success',
        2000
      );
    });
    
    this.socket.on('user-left', (userData) => {
      console.log('User left:', userData);
      this.events.emit('user-left', userData);
      
      Utils.showToast(
        `${userData.name} left the game`,
        'warning',
        2000
      );
    });
    
    this.socket.on('user-name-changed', (changeData) => {
      console.log('User name changed:', changeData);
      this.events.emit('user-name-changed', changeData);
      
      if (changeData.userId === this.currentUser?.id) {
        this.currentUser.name = changeData.newName;
        Utils.showToast('Name updated successfully!', 'success');
      } else {
        Utils.showToast(
          `${changeData.oldName} is now ${changeData.newName}`,
          'success',
          2000
        );
      }
    });
  }
  
  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnection attempts reached');
      Utils.showToast('Unable to reconnect. Please refresh the page.', 'error', 5000);
      return;
    }
    
    this.reconnectAttempts++;
    this.connectionState = 'connecting';
    this.updateConnectionUI();
    
    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
    
    setTimeout(() => {
      if (!this.isConnected) {
        this.connect();
      }
    }, this.reconnectDelay);
    
    // Exponential backoff
    this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, 10000);
  }
  
  updateConnectionUI() {
    const statusElement = document.getElementById('connectionStatus');
    const statusDot = statusElement?.querySelector('.status-dot');
    const statusText = statusElement?.querySelector('span');
    
    if (!statusElement) return;
    
    // Update status dot
    statusDot.className = 'status-dot';
    
    switch (this.connectionState) {
      case 'connecting':
        statusDot.classList.add('connecting');
        statusText.textContent = 'Connecting...';
        break;
      case 'connected':
        statusDot.classList.add('connected');
        statusText.textContent = 'Connected';
        break;
      case 'disconnected':
        statusDot.classList.add('disconnected');
        statusText.textContent = 'Disconnected';
        break;
    }
  }
  
  // Game actions
  claimBlock(x, y) {
    if (!this.isConnected) {
      Utils.showToast('Not connected to server', 'error');
      return false;
    }
    
    console.log(`Attempting to claim block (${x}, ${y})`);
    this.socket.emit('claim-block', { x, y });
    return true;
  }
  
  updateName(newName) {
    if (!this.isConnected) {
      Utils.showToast('Not connected to server', 'error');
      return false;
    }
    
    if (!newName || newName.trim().length === 0) {
      Utils.showToast('Name cannot be empty', 'warning');
      return false;
    }
    
    const trimmedName = newName.trim().substring(0, 20);
    console.log('Updating name to:', trimmedName);
    this.socket.emit('update-name', trimmedName);
    return true;
  }
  
  // API calls for additional data
  async fetchStats() {
    try {
      const response = await fetch('/api/stats');
      const data = await response.json();
      
      if (data.success) {
        return data.stats;
      } else {
        throw new Error(data.error || 'Failed to fetch stats');
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      Utils.showToast('Failed to load stats', 'error');
      return null;
    }
  }
  
  async fetchBlocks() {
    try {
      const response = await fetch('/api/blocks');
      const data = await response.json();
      
      if (data.success) {
        return data.blocks;
      } else {
        throw new Error(data.error || 'Failed to fetch blocks');
      }
    } catch (error) {
      console.error('Error fetching blocks:', error);
      Utils.showToast('Failed to load blocks', 'error');
      return null;
    }
  }
  
  // Event subscription helpers
  on(event, callback) {
    this.events.on(event, callback);
  }
  
  off(event, callback) {
    this.events.off(event, callback);
  }
  
  // Connection status
  isConnectedToServer() {
    return this.isConnected;
  }
  
  getCurrentUser() {
    return this.currentUser;
  }
  
  getConnectionState() {
    return this.connectionState;
  }
  
  // Utility methods
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.isConnected = false;
    this.connectionState = 'disconnected';
    this.updateConnectionUI();
  }
  
  // Heartbeat to detect connection issues
  startHeartbeat() {
    setInterval(() => {
      if (this.isConnected && this.socket) {
        this.socket.emit('ping');
      }
    }, 30000); // Every 30 seconds
  }
}

// Export for use in other modules
window.SocketHandler = SocketHandler;
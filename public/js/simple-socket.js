// Simplified socket handler using Server-Sent Events and Fetch API
// No Socket.IO dependency required!

class SimpleSocketHandler {
  constructor() {
    this.eventSource = null;
    this.isConnected = false;
    this.currentUser = null;
    this.events = new Utils.EventEmitter();
    
    console.log('Simple socket handler initialized');
  }
  
  async connect() {
    try {
      // First, join the game to get user data
      const response = await fetch('/api/join', { method: 'POST' });
      const data = await response.json();
      
      if (data.success) {
        this.currentUser = data.user;
        this.events.emit('user-assigned', data.user);
        console.log('User assigned:', data.user);
      }
      
      // Connect to Server-Sent Events stream
      this.eventSource = new EventSource('/api/events');
      
      this.eventSource.onopen = () => {
        console.log('Connected to server');
        this.isConnected = true;
        this.events.emit('connected');
        Utils.showToast('Connected to server!', 'success');
        
        // Load initial blocks
        this.loadBlocks();
      };
      
      this.eventSource.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('Error parsing SSE message:', error);
        }
      };
      
      this.eventSource.onerror = (error) => {
        console.error('SSE connection error:', error);
        this.isConnected = false;
        this.events.emit('disconnected', 'connection error');
        
        // Attempt to reconnect after a delay
        setTimeout(() => {
          if (!this.isConnected) {
            console.log('Attempting to reconnect...');
            this.connect();
          }
        }, 3000);
      };
      
    } catch (error) {
      console.error('Failed to connect:', error);
      Utils.showToast('Failed to connect to server', 'error');
    }
  }
  
  handleMessage(message) {
    switch (message.type) {
      case 'connected':
        console.log('SSE connected with ID:', message.clientId);
        break;
        
      case 'block-claimed':
        console.log('Block claimed:', message.data);
        this.events.emit('block-claimed', message.data);
        
        // Show notification for other users' claims
        if (message.data.owner !== this.currentUser?.id) {
          Utils.showToast(
            `${message.data.ownerName} claimed a block!`,
            'success',
            2000
          );
        }
        break;
        
      case 'user-joined':
        console.log('User joined:', message.data);
        this.events.emit('user-joined', message.data);
        Utils.showToast(
          `${message.data.name} joined the game`,
          'success',
          2000
        );
        break;
        
      case 'user-left':
        console.log('User left:', message.data);
        this.events.emit('user-left', message.data);
        break;
        
      default:
        console.log('Unknown message type:', message.type);
    }
  }
  
  async loadBlocks() {
    try {
      const response = await fetch('/api/blocks');
      const data = await response.json();
      
      if (data.success) {
        console.log('Blocks loaded:', data.blocks);
        this.events.emit('blocks-initialized', data.blocks);
      }
    } catch (error) {
      console.error('Failed to load blocks:', error);
    }
  }
  
  async claimBlock(x, y) {
    if (!this.isConnected || !this.currentUser) {
      Utils.showToast('Not connected to server', 'error');
      return false;
    }
    
    try {
      const response = await fetch('/api/claim-block', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          x,
          y,
          userId: this.currentUser.id,
          userName: this.currentUser.name,
          userColor: this.currentUser.color
        })
      });
      
      const data = await response.json();
      
      if (!data.success) {
        let message = 'Block claim failed';
        if (data.error === 'Block already claimed') {
          message = `Block already owned by ${data.currentOwner?.name || 'another player'}`;
        }
        Utils.showToast(message, 'warning', 3000);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error claiming block:', error);
      Utils.showToast('Failed to claim block', 'error');
      return false;
    }
  }
  
  async updateName(newName) {
    if (!this.currentUser) {
      Utils.showToast('Not connected to server', 'error');
      return false;
    }
    
    const trimmedName = newName.trim().substring(0, 20);
    this.currentUser.name = trimmedName;
    
    // In the simplified version, we just update locally
    // In a full version, this would sync with the server
    Utils.showToast('Name updated!', 'success');
    return true;
  }
  
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
  
  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    
    this.isConnected = false;
    console.log('Disconnected from server');
  }
}

// Export for use in other modules
window.SimpleSocketHandler = SimpleSocketHandler;
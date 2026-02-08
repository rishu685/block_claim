// Simplified User Manager that doesn't require external dependencies

class UserManager {
  constructor() {
    this.users = new Map(); // socketId -> user
    this.usersById = new Map(); // userId -> user
    this.usedColors = new Set();
    this.nameCounter = 1;
  }

  createUser(socketId) {
    const userId = this.generateId();
    const color = this.generateUniqueColor();
    const name = this.generateUniqueName();
    
    const user = {
      id: userId,
      socketId: socketId,
      name: name,
      color: color,
      blocksOwned: 0,
      joinedAt: new Date().toISOString()
    };

    this.users.set(socketId, user);
    this.usersById.set(userId, user);
    
    console.log(`Created user: ${name} (${userId}) with color ${color}`);
    return user;
  }

  generateId() {
    // Simple ID generation without external dependencies
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return `${timestamp}-${random}`;
  }

  updateUser(user) {
    this.users.set(user.socketId, user);
    this.usersById.set(user.id, user);
  }

  removeUser(socketId) {
    const user = this.users.get(socketId);
    if (user) {
      this.users.delete(socketId);
      this.usersById.delete(user.id);
      this.usedColors.delete(user.color);
      
      console.log(`Removed user: ${user.name} (${user.id})`);
      return user;
    }
    return null;
  }

  getUser(socketId) {
    return this.users.get(socketId);
  }

  getUserById(userId) {
    return this.usersById.get(userId);
  }

  incrementUserBlocks(userId) {
    const user = this.usersById.get(userId);
    if (user) {
      user.blocksOwned++;
    }
  }

  getConnectedUsers() {
    return Array.from(this.users.values());
  }

  generateUniqueName() {
    const adjectives = [
      'Swift', 'Clever', 'Brave', 'Bright', 'Quick', 'Smart', 'Bold', 'Cool',
      'Epic', 'Fire', 'Mega', 'Super', 'Ultra', 'Hyper', 'Turbo', 'Ninja',
      'Cosmic', 'Stellar', 'Mystic', 'Phoenix', 'Dragon', 'Thunder', 'Lightning',
      'Frost', 'Blaze', 'Storm', 'Crystal', 'Golden', 'Silver', 'Royal'
    ];
    
    const nouns = [
      'Player', 'Gamer', 'Hero', 'Champion', 'Master', 'Wizard', 'Knight', 'Warrior',
      'Explorer', 'Hunter', 'Seeker', 'Raider', 'Guardian', 'Defender', 'Conqueror',
      'Pioneer', 'Voyager', 'Ranger', 'Scout', 'Captain', 'Commander', 'Admiral',
      'Fox', 'Wolf', 'Eagle', 'Hawk', 'Tiger', 'Lion', 'Bear', 'Shark'
    ];

    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const number = Math.floor(Math.random() * 999) + 1;
    
    return `${adjective}${noun}${number}`;
  }

  generateUniqueColor() {
    // Predefined set of visually distinct colors
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD',
      '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9', '#F8C471', '#82E0AA',
      '#F1948A', '#85929E', '#D7BDE2', '#A9DFBF', '#F9E79F', '#D5A6BD',
      '#A3E4D7', '#FADBD8', '#E8DAEF', '#D6EAF8', '#FCF3CF', '#EBDEF0',
      '#D1F2EB', '#FDF2E9', '#EAEDED', '#FEF9E7', '#F4F6F6', '#1B2631'
    ];

    // Filter out already used colors
    const availableColors = colors.filter(color => !this.usedColors.has(color));
    
    let selectedColor;
    if (availableColors.length > 0) {
      selectedColor = availableColors[Math.floor(Math.random() * availableColors.length)];
    } else {
      // Generate random color if all predefined colors are used
      selectedColor = this.generateRandomColor();
    }
    
    this.usedColors.add(selectedColor);
    return selectedColor;
  }

  generateRandomColor() {
    const hue = Math.floor(Math.random() * 360);
    const saturation = 70 + Math.floor(Math.random() * 30);
    const lightness = 45 + Math.floor(Math.random() * 25);
    
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  }

  getTotalConnected() {
    return this.users.size;
  }
}

module.exports = UserManager;
const { v4: uuidv4 } = require('uuid');

class UserManager {
  constructor() {
    this.users = new Map(); // socketId -> user
    this.usersById = new Map(); // userId -> user
    this.usedColors = new Set();
    this.nameCounter = 1;
  }

  createUser(socketId) {
    const userId = uuidv4();
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
    // Predefined set of visually distinct colors that work well on both light and dark backgrounds
    const colors = [
      '#FF6B6B', // Red
      '#4ECDC4', // Teal
      '#45B7D1', // Blue
      '#96CEB4', // Mint
      '#FFEAA7', // Yellow
      '#DDA0DD', // Plum
      '#98D8C8', // Mint Green
      '#F7DC6F', // Light Yellow
      '#BB8FCE', // Light Purple
      '#85C1E9', // Light Blue
      '#F8C471', // Orange
      '#82E0AA', // Light Green
      '#F1948A', // Light Red
      '#85929E', // Blue Grey
      '#D7BDE2', // Lavender
      '#A9DFBF', // Pale Green
      '#F9E79F', // Pale Yellow
      '#D5A6BD', // Rose
      '#A3E4D7', // Aqua
      '#FADBD8', // Pale Pink
      '#E8DAEF', // Pale Purple
      '#D6EAF8', // Pale Blue
      '#FCF3CF', // Cream
      '#EBDEF0', // Very Pale Purple
      '#D1F2EB', // Very Pale Green
      '#FDF2E9', // Very Pale Orange
      '#EAEDED', // Very Light Grey
      '#FEF9E7', // Very Pale Yellow
      '#F4F6F6', // Almost White
      '#1B2631'  // Dark Grey (for contrast)
    ];

    // Filter out already used colors
    const availableColors = colors.filter(color => !this.usedColors.has(color));
    
    let selectedColor;
    if (availableColors.length > 0) {
      // Use an available predefined color
      selectedColor = availableColors[Math.floor(Math.random() * availableColors.length)];
    } else {
      // If all predefined colors are used, generate a random one
      selectedColor = this.generateRandomColor();
    }
    
    this.usedColors.add(selectedColor);
    return selectedColor;
  }

  generateRandomColor() {
    // Generate a random bright color
    const hue = Math.floor(Math.random() * 360);
    const saturation = 70 + Math.floor(Math.random() * 30); // 70-100%
    const lightness = 45 + Math.floor(Math.random() * 25); // 45-70%
    
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  }

  // Get user statistics
  getTopUsers(limit = 10) {
    return Array.from(this.users.values())
      .sort((a, b) => b.blocksOwned - a.blocksOwned)
      .slice(0, limit)
      .map(user => ({
        name: user.name,
        color: user.color,
        blocksOwned: user.blocksOwned,
        joinedAt: user.joinedAt
      }));
  }

  // Utility methods
  isNameTaken(name) {
    return Array.from(this.users.values()).some(user => user.name === name);
  }

  getTotalConnected() {
    return this.users.size;
  }

  getTotalBlocksOwned() {
    return Array.from(this.users.values()).reduce((total, user) => total + user.blocksOwned, 0);
  }
}

module.exports = UserManager;
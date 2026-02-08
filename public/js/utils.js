// Utility functions for the BlockClaim app

/**
 * Debounce function to limit the rate of function calls
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function to limit function calls to once per interval
 */
function throttle(func, limit) {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Format numbers with commas
 */
function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Format timestamp to readable time
 */
function formatTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  
  if (diff < 60000) { // Less than 1 minute
    return 'Just now';
  } else if (diff < 3600000) { // Less than 1 hour
    const minutes = Math.floor(diff / 60000);
    return `${minutes}m ago`;
  } else if (diff < 86400000) { // Less than 1 day
    const hours = Math.floor(diff / 3600000);
    return `${hours}h ago`;
  } else {
    const days = Math.floor(diff / 86400000);
    return `${days}d ago`;
  }
}

/**
 * Generate a random color
 */
function generateRandomColor() {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue}, 70%, 60%)`;
}

/**
 * Check if a color is light or dark
 */
function isLightColor(color) {
  // Convert hex to RGB
  let r, g, b;
  
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    r = parseInt(hex.substr(0, 2), 16);
    g = parseInt(hex.substr(2, 2), 16);
    b = parseInt(hex.substr(4, 2), 16);
  } else if (color.startsWith('hsl')) {
    // For HSL colors, assume they're reasonably bright
    const lightness = parseInt(color.match(/(\d+)%\)$/)[1]);
    return lightness > 50;
  } else if (color.startsWith('rgb')) {
    const values = color.match(/\d+/g);
    r = parseInt(values[0]);
    g = parseInt(values[1]);
    b = parseInt(values[2]);
  }
  
  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5;
}

/**
 * Show toast notification
 */
function showToast(message, type = 'success', duration = 3000) {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  
  container.appendChild(toast);
  
  // Auto remove
  setTimeout(() => {
    if (toast.parentElement) {
      toast.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => {
        if (toast.parentElement) {
          container.removeChild(toast);
        }
      }, 300);
    }
  }, duration);
}

/**
 * Clamp a number between min and max
 */
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Linear interpolation
 */
function lerp(start, end, factor) {
  return start + (end - start) * factor;
}

/**
 * Get mouse position relative to element
 */
function getMousePos(canvas, event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  };
}

/**
 * Get touch position relative to element
 */
function getTouchPos(canvas, touch) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: touch.clientX - rect.left,
    y: touch.clientY - rect.top
  };
}

/**
 * Convert screen coordinates to grid coordinates
 */
function screenToGrid(screenX, screenY, camera) {
  return {
    x: Math.floor((screenX - camera.x) / camera.zoom),
    y: Math.floor((screenY - camera.y) / camera.zoom)
  };
}

/**
 * Convert grid coordinates to screen coordinates
 */
function gridToScreen(gridX, gridY, camera) {
  return {
    x: gridX * camera.zoom + camera.x,
    y: gridY * camera.zoom + camera.y
  };
}

/**
 * Check if coordinates are within grid bounds
 */
function isInBounds(x, y, gridSize) {
  return x >= 0 && x < gridSize && y >= 0 && y < gridSize;
}

/**
 * Animate value changes
 */
function animateValue(element, start, end, duration, formatter = null) {
  const startTime = performance.now();
  
  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Easing function (ease out)
    const easedProgress = 1 - Math.pow(1 - progress, 3);
    
    const current = Math.floor(lerp(start, end, easedProgress));
    element.textContent = formatter ? formatter(current) : current;
    
    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }
  
  requestAnimationFrame(update);
}

/**
 * Local storage helpers
 */
const Storage = {
  set(key, value) {
    try {
      localStorage.setItem(`blockclaim_${key}`, JSON.stringify(value));
    } catch (e) {
      console.warn('Failed to save to localStorage:', e);
    }
  },
  
  get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(`blockclaim_${key}`);
      return item ? JSON.parse(item) : defaultValue;
    } catch (e) {
      console.warn('Failed to read from localStorage:', e);
      return defaultValue;
    }
  },
  
  remove(key) {
    try {
      localStorage.removeItem(`blockclaim_${key}`);
    } catch (e) {
      console.warn('Failed to remove from localStorage:', e);
    }
  }
};

/**
 * Performance monitoring
 */
const Performance = {
  fps: 0,
  frameCount: 0,
  lastTime: 0,
  
  update(currentTime) {
    this.frameCount++;
    
    if (currentTime - this.lastTime >= 1000) {
      this.fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastTime));
      this.frameCount = 0;
      this.lastTime = currentTime;
    }
  },
  
  getFPS() {
    return this.fps;
  }
};

/**
 * Simple event emitter for custom events
 */
class EventEmitter {
  constructor() {
    this.events = {};
  }
  
  on(event, callback) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
  }
  
  off(event, callback) {
    if (!this.events[event]) return;
    
    const index = this.events[event].indexOf(callback);
    if (index > -1) {
      this.events[event].splice(index, 1);
    }
  }
  
  emit(event, ...args) {
    if (!this.events[event]) return;
    
    this.events[event].forEach(callback => {
      try {
        callback(...args);
      } catch (error) {
        console.error('Error in event callback:', error);
      }
    });
  }
}

/**
 * Simple state management
 */
class StateManager {
  constructor(initialState = {}) {
    this.state = { ...initialState };
    this.subscribers = [];
  }
  
  setState(newState) {
    const prevState = { ...this.state };
    this.state = { ...this.state, ...newState };
    
    this.subscribers.forEach(callback => {
      try {
        callback(this.state, prevState);
      } catch (error) {
        console.error('Error in state subscriber:', error);
      }
    });
  }
  
  getState() {
    return { ...this.state };
  }
  
  subscribe(callback) {
    this.subscribers.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.subscribers.indexOf(callback);
      if (index > -1) {
        this.subscribers.splice(index, 1);
      }
    };
  }
}

// Export utilities for use in other modules
window.Utils = {
  debounce,
  throttle,
  formatNumber,
  formatTime,
  generateRandomColor,
  isLightColor,
  showToast,
  clamp,
  lerp,
  getMousePos,
  getTouchPos,
  screenToGrid,
  gridToScreen,
  isInBounds,
  animateValue,
  Storage,
  Performance,
  EventEmitter,
  StateManager
};
// Grid rendering and interaction system for BlockClaim

class GridRenderer {
  constructor(canvasId, gridSize = 50) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.gridSize = gridSize;
    this.blockSize = 12; // Size of each block in pixels
    this.gridLineWidth = 1;
    
    // Camera/viewport controls
    this.camera = {
      x: 0,
      y: 0,
      zoom: 1,
      targetZoom: 1,
      minZoom: 0.5,
      maxZoom: 4
    };
    
    // Panning
    this.isPanning = false;
    this.lastPanPoint = { x: 0, y: 0 };
    
    // Block data
    this.blocks = new Map(); // key: "x-y", value: { owner, ownerName, ownerColor, claimedAt }
    
    // Animation system
    this.animatedBlocks = new Map(); // For block claim animations
    this.animationQueue = [];
    
    // Performance
    this.needsRedraw = true;
    this.lastFrameTime = 0;
    
    this.setupCanvas();
    this.setupEventListeners();
    this.startRenderLoop();
    
    console.log(`Grid initialized: ${gridSize}x${gridSize} blocks`);
  }
  
  setupCanvas() {
    // Set up canvas for high DPI displays
    const dpr = window.devicePixelRatio || 1;
    const container = this.canvas.parentElement;
    
    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect();
      this.canvas.width = rect.width * dpr;
      this.canvas.height = rect.height * dpr;
      this.canvas.style.width = rect.width + 'px';
      this.canvas.style.height = rect.height + 'px';
      
      this.ctx.scale(dpr, dpr);
      this.centerGrid();
      this.needsRedraw = true;
    };
    
    resizeCanvas();
    window.addEventListener('resize', Utils.debounce(resizeCanvas, 250));
  }
  
  setupEventListeners() {
    // Mouse events
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.addEventListener('wheel', this.handleWheel.bind(this));
    this.canvas.addEventListener('click', this.handleClick.bind(this));
    
    // Touch events for mobile
    this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this));
    this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this));
    this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));
    
    // Prevent context menu
    this.canvas.addEventListener('contextmenu', e => e.preventDefault());
  }
  
  handleMouseDown(event) {
    if (event.button === 1 || event.button === 2) { // Middle or right mouse
      this.startPanning(event.clientX, event.clientY);
      event.preventDefault();
    }
  }
  
  handleMouseMove(event) {
    if (this.isPanning) {
      this.updatePanning(event.clientX, event.clientY);
      event.preventDefault();
    }
  }
  
  handleMouseUp(event) {
    if (this.isPanning) {
      this.stopPanning();
      event.preventDefault();
    }
  }
  
  handleWheel(event) {
    event.preventDefault();
    
    const mousePos = Utils.getMousePos(this.canvas, event);
    const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
    this.zoomAt(mousePos.x, mousePos.y, zoomFactor);
  }
  
  handleClick(event) {
    if (this.isPanning) return;
    
    const mousePos = Utils.getMousePos(this.canvas, event);
    const gridPos = this.screenToGrid(mousePos.x, mousePos.y);
    
    if (Utils.isInBounds(gridPos.x, gridPos.y, this.gridSize)) {
      this.onBlockClick(gridPos.x, gridPos.y);
    }
  }
  
  handleTouchStart(event) {
    event.preventDefault();
    
    if (event.touches.length === 1) {
      const touch = event.touches[0];
      const touchPos = Utils.getTouchPos(this.canvas, touch);
      
      // Store for potential click
      this.touchStart = {
        x: touchPos.x,
        y: touchPos.y,
        time: Date.now()
      };
    } else if (event.touches.length === 2) {
      // Start pinch zoom
      this.startPinchZoom(event.touches);
    }
  }
  
  handleTouchMove(event) {
    event.preventDefault();
    
    if (event.touches.length === 1 && this.touchStart) {
      const touch = event.touches[0];
      const touchPos = Utils.getTouchPos(this.canvas, touch);
      
      const deltaX = touchPos.x - this.touchStart.x;
      const deltaY = touchPos.y - this.touchStart.y;
      
      // If moved more than 10 pixels, it's a pan
      if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
        if (!this.isPanning) {
          this.startPanning(this.touchStart.x, this.touchStart.y);
        }
        this.updatePanning(touchPos.x, touchPos.y);
        this.touchStart = null; // Cancel potential click
      }
    } else if (event.touches.length === 2) {
      this.updatePinchZoom(event.touches);
    }
  }
  
  handleTouchEnd(event) {
    event.preventDefault();
    
    if (this.isPanning) {
      this.stopPanning();
    } else if (this.touchStart && Date.now() - this.touchStart.time < 300) {
      // It's a tap
      const gridPos = this.screenToGrid(this.touchStart.x, this.touchStart.y);
      
      if (Utils.isInBounds(gridPos.x, gridPos.y, this.gridSize)) {
        this.onBlockClick(gridPos.x, gridPos.y);
      }
    }
    
    this.touchStart = null;
  }
  
  startPanning(x, y) {
    this.isPanning = true;
    this.lastPanPoint = { x, y };
    this.canvas.style.cursor = 'grabbing';
  }
  
  updatePanning(x, y) {
    if (!this.isPanning) return;
    
    const deltaX = x - this.lastPanPoint.x;
    const deltaY = y - this.lastPanPoint.y;
    
    this.camera.x += deltaX;
    this.camera.y += deltaY;
    
    this.lastPanPoint = { x, y };
    this.needsRedraw = true;
  }
  
  stopPanning() {
    this.isPanning = false;
    this.canvas.style.cursor = 'crosshair';
  }
  
  startPinchZoom(touches) {
    const touch1 = touches[0];
    const touch2 = touches[1];
    
    this.pinchData = {
      initialDistance: Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      ),
      initialZoom: this.camera.zoom,
      center: {
        x: (touch1.clientX + touch2.clientX) / 2,
        y: (touch1.clientY + touch2.clientY) / 2
      }
    };
  }
  
  updatePinchZoom(touches) {
    if (!this.pinchData) return;
    
    const touch1 = touches[0];
    const touch2 = touches[1];
    
    const currentDistance = Math.hypot(
      touch2.clientX - touch1.clientX,
      touch2.clientY - touch1.clientY
    );
    
    const zoomFactor = currentDistance / this.pinchData.initialDistance;
    const newZoom = Utils.clamp(
      this.pinchData.initialZoom * zoomFactor,
      this.camera.minZoom,
      this.camera.maxZoom
    );
    
    this.camera.zoom = newZoom;
    this.camera.targetZoom = newZoom;
    this.needsRedraw = true;
  }
  
  zoomAt(x, y, factor) {
    const newZoom = Utils.clamp(
      this.camera.zoom * factor,
      this.camera.minZoom,
      this.camera.maxZoom
    );
    
    // Zoom towards mouse position
    const zoomFactor = newZoom / this.camera.zoom;
    this.camera.x = x - (x - this.camera.x) * zoomFactor;
    this.camera.y = y - (y - this.camera.y) * zoomFactor;
    
    this.camera.zoom = newZoom;
    this.camera.targetZoom = newZoom;
    this.needsRedraw = true;
    
    // Update zoom display
    this.updateZoomDisplay();
  }
  
  centerGrid() {
    const canvasRect = this.canvas.getBoundingClientRect();
    const gridPixelSize = this.gridSize * this.blockSize;
    
    this.camera.x = (canvasRect.width - gridPixelSize) / 2;
    this.camera.y = (canvasRect.height - gridPixelSize) / 2;
    this.needsRedraw = true;
  }
  
  screenToGrid(screenX, screenY) {
    return {
      x: Math.floor((screenX - this.camera.x) / (this.blockSize * this.camera.zoom)),
      y: Math.floor((screenY - this.camera.y) / (this.blockSize * this.camera.zoom))
    };
  }
  
  gridToScreen(gridX, gridY) {
    return {
      x: gridX * this.blockSize * this.camera.zoom + this.camera.x,
      y: gridY * this.blockSize * this.camera.zoom + this.camera.y
    };
  }
  
  onBlockClick(x, y) {
    // Override this method to handle block clicks
    console.log(`Block clicked: (${x}, ${y})`);
  }
  
  setBlocks(blocksData) {
    this.blocks.clear();
    
    if (blocksData.claimedBlocks) {
      Object.entries(blocksData.claimedBlocks).forEach(([key, blockData]) => {
        this.blocks.set(key, blockData);
      });
    }
    
    this.needsRedraw = true;
    console.log(`Loaded ${this.blocks.size} claimed blocks`);
  }
  
  claimBlock(x, y, ownerData, animate = true) {
    const key = `${x}-${y}`;
    this.blocks.set(key, ownerData);
    
    if (animate) {
      this.animatedBlocks.set(key, {
        startTime: performance.now(),
        duration: 500,
        scale: 0
      });
    }
    
    this.needsRedraw = true;
  }
  
  startRenderLoop() {
    const render = (currentTime) => {
      // Update animations
      this.updateAnimations(currentTime);
      
      // Smooth zoom interpolation
      if (Math.abs(this.camera.zoom - this.camera.targetZoom) > 0.01) {
        this.camera.zoom = Utils.lerp(this.camera.zoom, this.camera.targetZoom, 0.1);
        this.needsRedraw = true;
      }
      
      // Render frame
      if (this.needsRedraw) {
        this.render();
        this.needsRedraw = false;
      }
      
      // Update performance counter
      Utils.Performance.update(currentTime);
      
      requestAnimationFrame(render);
    };
    
    requestAnimationFrame(render);
  }
  
  updateAnimations(currentTime) {
    let hasActiveAnimations = false;
    
    this.animatedBlocks.forEach((animation, key) => {
      const elapsed = currentTime - animation.startTime;
      const progress = Math.min(elapsed / animation.duration, 1);
      
      // Ease-out animation
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      animation.scale = easedProgress;
      
      if (progress >= 1) {
        this.animatedBlocks.delete(key);
      } else {
        hasActiveAnimations = true;
      }
    });
    
    if (hasActiveAnimations) {
      this.needsRedraw = true;
    }
  }
  
  render() {
    const { width, height } = this.canvas.getBoundingClientRect();
    
    // Clear canvas
    this.ctx.clearRect(0, 0, width, height);
    
    // Calculate visible grid bounds for performance
    const visibleBounds = this.getVisibleBounds(width, height);
    
    // Draw grid background
    this.drawGridBackground(visibleBounds);
    
    // Draw grid lines
    this.drawGridLines(visibleBounds);
    
    // Draw claimed blocks
    this.drawBlocks(visibleBounds);
    
    // Draw UI overlay
    this.drawUIOverlay();
  }
  
  getVisibleBounds(width, height) {
    const startGrid = this.screenToGrid(0, 0);
    const endGrid = this.screenToGrid(width, height);
    
    return {
      startX: Math.max(0, Math.floor(startGrid.x) - 1),
      startY: Math.max(0, Math.floor(startGrid.y) - 1),
      endX: Math.min(this.gridSize, Math.ceil(endGrid.x) + 1),
      endY: Math.min(this.gridSize, Math.ceil(endGrid.y) + 1)
    };
  }
  
  drawGridBackground(bounds) {
    // Draw grid background
    this.ctx.fillStyle = '#f8f9fa';
    
    for (let x = bounds.startX; x < bounds.endX; x++) {
      for (let y = bounds.startY; y < bounds.endY; y++) {
        if (!this.blocks.has(`${x}-${y}`)) {
          const screenPos = this.gridToScreen(x, y);
          const blockSize = this.blockSize * this.camera.zoom;
          
          this.ctx.fillRect(
            screenPos.x,
            screenPos.y,
            blockSize,
            blockSize
          );
        }
      }
    }
  }
  
  drawGridLines(bounds) {
    if (this.camera.zoom < 0.5) return; // Don't draw grid lines when zoomed out too much
    
    this.ctx.strokeStyle = '#e2e8f0';
    this.ctx.lineWidth = this.gridLineWidth;
    
    const blockSize = this.blockSize * this.camera.zoom;
    
    // Vertical lines
    for (let x = bounds.startX; x <= bounds.endX; x++) {
      const screenX = x * blockSize + this.camera.x;
      this.ctx.beginPath();
      this.ctx.moveTo(screenX, bounds.startY * blockSize + this.camera.y);
      this.ctx.lineTo(screenX, bounds.endY * blockSize + this.camera.y);
      this.ctx.stroke();
    }
    
    // Horizontal lines
    for (let y = bounds.startY; y <= bounds.endY; y++) {
      const screenY = y * blockSize + this.camera.y;
      this.ctx.beginPath();
      this.ctx.moveTo(bounds.startX * blockSize + this.camera.x, screenY);
      this.ctx.lineTo(bounds.endX * blockSize + this.camera.x, screenY);
      this.ctx.stroke();
    }
  }
  
  drawBlocks(bounds) {
    const blockSize = this.blockSize * this.camera.zoom;
    
    for (let x = bounds.startX; x < bounds.endX; x++) {
      for (let y = bounds.startY; y < bounds.endY; y++) {
        const key = `${x}-${y}`;
        const block = this.blocks.get(key);
        
        if (block) {
          const screenPos = this.gridToScreen(x, y);
          
          // Handle animation
          let scale = 1;
          const animation = this.animatedBlocks.get(key);
          if (animation) {
            scale = animation.scale;
          }
          
          this.ctx.fillStyle = block.ownerColor;
          
          if (scale < 1) {
            // Animated block
            const animatedSize = blockSize * scale;
            const offset = (blockSize - animatedSize) / 2;
            
            this.ctx.fillRect(
              screenPos.x + offset,
              screenPos.y + offset,
              animatedSize,
              animatedSize
            );
          } else {
            // Normal block
            this.ctx.fillRect(
              screenPos.x,
              screenPos.y,
              blockSize,
              blockSize
            );
          }
          
          // Draw border for better visibility
          if (this.camera.zoom > 1) {
            this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(screenPos.x, screenPos.y, blockSize, blockSize);
          }
        }
      }
    }
  }
  
  drawUIOverlay() {
    // Draw performance info in debug mode
    if (window.DEBUG_MODE) {
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      this.ctx.fillRect(10, 10, 200, 80);
      
      this.ctx.fillStyle = 'white';
      this.ctx.font = '12px monospace';
      this.ctx.fillText(`FPS: ${Utils.Performance.getFPS()}`, 20, 30);
      this.ctx.fillText(`Zoom: ${this.camera.zoom.toFixed(2)}x`, 20, 50);
      this.ctx.fillText(`Blocks: ${this.blocks.size}`, 20, 70);
    }
  }
  
  updateZoomDisplay() {
    const zoomDisplay = document.getElementById('zoomLevel');
    if (zoomDisplay) {
      zoomDisplay.textContent = `${Math.round(this.camera.zoom * 100)}%`;
    }
  }
  
  // Public methods for external control
  zoomIn() {
    this.zoomAt(
      this.canvas.getBoundingClientRect().width / 2,
      this.canvas.getBoundingClientRect().height / 2,
      1.2
    );
  }
  
  zoomOut() {
    this.zoomAt(
      this.canvas.getBoundingClientRect().width / 2,
      this.canvas.getBoundingClientRect().height / 2,
      0.8
    );
  }
  
  resetCamera() {
    this.camera.zoom = 1;
    this.camera.targetZoom = 1;
    this.centerGrid();
    this.updateZoomDisplay();
  }
}

// Export for use in other modules
window.GridRenderer = GridRenderer;
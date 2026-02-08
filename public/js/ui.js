// UI handler for user interface interactions and updates

class UIHandler {
  constructor() {
    this.elements = {};
    this.state = new Utils.StateManager({
      statsVisible: true,
      showInstructions: true,
      userName: '',
      userColor: '',
      connectedUsers: 0,
      totalBlocks: 0,
      claimedBlocks: 0,
      userBlocks: 0,
      leaderboard: [],
      onlineUsers: []
    });
    
    this.initializeElements();
    this.setupEventListeners();
    this.setupStateSubscription();
    
    console.log('UI handler initialized');
  }
  
  initializeElements() {
    // Cache DOM elements for better performance
    this.elements = {
      // Loading and screens
      loadingScreen: document.getElementById('loadingScreen'),
      errorScreen: document.getElementById('errorScreen'),
      instructionsOverlay: document.getElementById('instructionsOverlay'),
      
      // User info
      userBadge: document.getElementById('userBadge'),
      userColor: document.getElementById('userColor'),
      userName: document.getElementById('userName'),
      editNameBtn: document.getElementById('editNameBtn'),
      
      // Connection status
      connectionStatus: document.getElementById('connectionStatus'),
      
      // Stats panel
      statsPanel: document.getElementById('statsPanel'),
      toggleStats: document.getElementById('toggleStats'),
      connectedUsers: document.getElementById('connectedUsers'),
      claimedBlocks: document.getElementById('claimedBlocks'),
      userBlocks: document.getElementById('userBlocks'),
      leaderboardList: document.getElementById('leaderboardList'),
      onlineUsersList: document.getElementById('onlineUsersList'),
      
      // Game controls
      zoomInBtn: document.getElementById('zoomInBtn'),
      zoomOutBtn: document.getElementById('zoomOutBtn'),
      centerBtn: document.getElementById('centerBtn'),
      zoomLevel: document.getElementById('zoomLevel'),
      
      // Mobile controls
      mobileControls: document.getElementById('mobileControls'),
      mobileZoomIn: document.getElementById('mobileZoomIn'),
      mobileZoomOut: document.getElementById('mobileZoomOut'),
      
      // Modal
      nameModal: document.getElementById('nameModal'),
      newNameInput: document.getElementById('newNameInput'),
      saveNameBtn: document.getElementById('saveNameBtn'),
      cancelNameBtn: document.getElementById('cancelNameBtn'),
      
      // Instructions
      startGameBtn: document.getElementById('startGameBtn')
    };
  }
  
  setupEventListeners() {
    // Stats panel toggle
    if (this.elements.toggleStats) {
      this.elements.toggleStats.addEventListener('click', () => {
        this.toggleStatsPanel();
      });
    }
    
    // Name editing
    if (this.elements.editNameBtn) {
      this.elements.editNameBtn.addEventListener('click', () => {
        this.showNameModal();
      });
    }
    
    // Modal controls
    if (this.elements.saveNameBtn) {
      this.elements.saveNameBtn.addEventListener('click', () => {
        this.saveName();
      });
    }
    
    if (this.elements.cancelNameBtn) {
      this.elements.cancelNameBtn.addEventListener('click', () => {
        this.hideNameModal();
      });
    }
    
    if (this.elements.newNameInput) {
      this.elements.newNameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.saveName();
        } else if (e.key === 'Escape') {
          this.hideNameModal();
        }
      });
    }
    
    // Instructions
    if (this.elements.startGameBtn) {
      this.elements.startGameBtn.addEventListener('click', () => {
        this.hideInstructions();
      });
    }
    
    // Game controls - these will be connected to the grid renderer
    if (this.elements.zoomInBtn) {
      this.elements.zoomInBtn.addEventListener('click', () => {
        this.onZoomIn();
      });
    }
    
    if (this.elements.zoomOutBtn) {
      this.elements.zoomOutBtn.addEventListener('click', () => {
        this.onZoomOut();
      });
    }
    
    if (this.elements.centerBtn) {
      this.elements.centerBtn.addEventListener('click', () => {
        this.onCenter();
      });
    }
    
    // Mobile controls
    if (this.elements.mobileZoomIn) {
      this.elements.mobileZoomIn.addEventListener('click', () => {
        this.onZoomIn();
      });
    }
    
    if (this.elements.mobileZoomOut) {
      this.elements.mobileZoomOut.addEventListener('click', () => {
        this.onZoomOut();
      });
    }
    
    // Close modal when clicking outside
    if (this.elements.nameModal) {
      this.elements.nameModal.addEventListener('click', (e) => {
        if (e.target === this.elements.nameModal) {
          this.hideNameModal();
        }
      });
    }
    
    // Close instructions when clicking outside
    if (this.elements.instructionsOverlay) {
      this.elements.instructionsOverlay.addEventListener('click', (e) => {
        if (e.target === this.elements.instructionsOverlay) {
          this.hideInstructions();
        }
      });
    }
    
    // Handle window resize for mobile detection
    this.handleResize();
    window.addEventListener('resize', Utils.debounce(() => {
      this.handleResize();
    }, 250));
  }
  
  setupStateSubscription() {
    this.state.subscribe((newState, prevState) => {
      // Update UI elements when state changes
      if (newState.userName !== prevState.userName) {
        this.updateUserName(newState.userName);
      }
      
      if (newState.userColor !== prevState.userColor) {
        this.updateUserColor(newState.userColor);
      }
      
      if (newState.connectedUsers !== prevState.connectedUsers) {
        this.updateConnectedUsers(newState.connectedUsers);
      }
      
      if (newState.claimedBlocks !== prevState.claimedBlocks || 
          newState.totalBlocks !== prevState.totalBlocks) {
        this.updateBlockStats(newState.claimedBlocks, newState.totalBlocks);
      }
      
      if (newState.userBlocks !== prevState.userBlocks) {
        this.updateUserBlocks(newState.userBlocks);
      }
      
      if (newState.leaderboard !== prevState.leaderboard) {
        this.updateLeaderboard(newState.leaderboard);
      }
      
      if (newState.onlineUsers !== prevState.onlineUsers) {
        this.updateOnlineUsers(newState.onlineUsers);
      }
    });
  }
  
  // Screen management
  showLoadingScreen() {
    if (this.elements.loadingScreen) {
      this.elements.loadingScreen.style.display = 'flex';
    }
  }
  
  hideLoadingScreen() {
    if (this.elements.loadingScreen) {
      this.elements.loadingScreen.style.display = 'none';
    }
  }
  
  showErrorScreen() {
    if (this.elements.errorScreen) {
      this.elements.errorScreen.style.display = 'flex';
    }
  }
  
  hideErrorScreen() {
    if (this.elements.errorScreen) {
      this.elements.errorScreen.style.display = 'none';
    }
  }
  
  showInstructions() {
    if (this.elements.instructionsOverlay) {
      this.elements.instructionsOverlay.style.display = 'flex';
    }
  }
  
  hideInstructions() {
    if (this.elements.instructionsOverlay) {
      this.elements.instructionsOverlay.style.display = 'none';
    }
    Utils.Storage.set('instructions_shown', true);
    
    // Emit event for app to know instructions are hidden
    if (this.onInstructionsHidden) {
      this.onInstructionsHidden();
    }
  }
  
  // User interface updates
  updateUser(userData) {
    this.state.setState({
      userName: userData.name,
      userColor: userData.color
    });
    
    // Store user preference
    if (userData.name !== this.state.getState().userName) {
      Utils.Storage.set('user_name', userData.name);
    }
  }
  
  updateUserName(name) {
    if (this.elements.userName) {
      this.elements.userName.textContent = name;
    }
  }
  
  updateUserColor(color) {
    if (this.elements.userColor) {
      this.elements.userColor.style.backgroundColor = color;
    }
  }
  
  updateConnectedUsers(count) {
    if (this.elements.connectedUsers) {
      Utils.animateValue(
        this.elements.connectedUsers,
        parseInt(this.elements.connectedUsers.textContent) || 0,
        count,
        500
      );
    }
  }
  
  updateBlockStats(claimed, total) {
    if (this.elements.claimedBlocks) {
      const current = parseInt(this.elements.claimedBlocks.textContent.split(' / ')[0]) || 0;
      Utils.animateValue(
        this.elements.claimedBlocks,
        current,
        claimed,
        500,
        (value) => `${Utils.formatNumber(value)} / ${Utils.formatNumber(total)}`
      );
    }
  }
  
  updateUserBlocks(count) {
    if (this.elements.userBlocks) {
      const current = parseInt(this.elements.userBlocks.textContent) || 0;
      Utils.animateValue(this.elements.userBlocks, current, count, 500);
    }
  }
  
  updateLeaderboard(leaderboard) {
    if (!this.elements.leaderboardList) return;
    
    if (leaderboard.length === 0) {
      this.elements.leaderboardList.innerHTML = '<div class="loading-state">No players yet...</div>';
      return;
    }
    
    const html = leaderboard.map((player, index) => `
      <div class="leaderboard-item">
        <span class="rank">#${index + 1}</span>
        <div class="player-info">
          <div class="player-color" style="background-color: ${player.color}"></div>
          <span class="player-name">${this.escapeHtml(player.name)}</span>
        </div>
        <span class="player-blocks">${player.blocksOwned}</span>
      </div>
    `).join('');
    
    this.elements.leaderboardList.innerHTML = html;
  }
  
  updateOnlineUsers(users) {
    if (!this.elements.onlineUsersList) return;
    
    if (users.length === 0) {
      this.elements.onlineUsersList.innerHTML = '<div class="loading-state">No users online...</div>';
      return;
    }
    
    const html = users.map(user => `
      <div class="online-user">
        <div class="player-info">
          <div class="player-color" style="background-color: ${user.color}"></div>
          <span class="player-name">${this.escapeHtml(user.name)}</span>
        </div>
        <span class="player-blocks">${user.blocksOwned || 0}</span>
      </div>
    `).join('');
    
    this.elements.onlineUsersList.innerHTML = html;
  }
  
  // Stats panel management
  toggleStatsPanel() {
    const isVisible = this.state.getState().statsVisible;
    
    if (this.elements.statsPanel) {
      if (isVisible) {
        this.elements.statsPanel.style.transform = 'translateX(-100%)';
      } else {
        this.elements.statsPanel.style.transform = 'translateX(0)';
      }
    }
    
    this.state.setState({ statsVisible: !isVisible });
    Utils.Storage.set('stats_visible', !isVisible);
  }
  
  // Name modal management
  showNameModal() {
    if (this.elements.nameModal && this.elements.newNameInput) {
      this.elements.newNameInput.value = this.state.getState().userName;
      this.elements.nameModal.style.display = 'flex';
      this.elements.newNameInput.focus();
      this.elements.newNameInput.select();
    }
  }
  
  hideNameModal() {
    if (this.elements.nameModal) {
      this.elements.nameModal.style.display = 'none';
    }
  }
  
  saveName() {
    if (this.elements.newNameInput && this.onNameChange) {
      const newName = this.elements.newNameInput.value.trim();
      if (newName.length > 0) {
        this.onNameChange(newName);
        this.hideNameModal();
      } else {
        Utils.showToast('Name cannot be empty', 'warning');
      }
    }
  }
  
  // Game control callbacks - to be overridden by the main app
  onZoomIn() {
    console.log('Zoom in requested');
  }
  
  onZoomOut() {
    console.log('Zoom out requested');
  }
  
  onCenter() {
    console.log('Center view requested');
  }
  
  onNameChange(newName) {
    console.log('Name change requested:', newName);
  }
  
  onInstructionsHidden() {
    console.log('Instructions hidden');
  }
  
  // Responsive design handling
  handleResize() {
    const isMobile = window.innerWidth <= 768;
    
    if (this.elements.mobileControls) {
      this.elements.mobileControls.style.display = isMobile ? 'flex' : 'none';
    }
    
    // Adjust stats panel for mobile
    if (isMobile && this.elements.statsPanel) {
      const isVisible = this.state.getState().statsVisible;
      if (!isVisible) {
        this.elements.statsPanel.style.transform = 'translateX(-100%)';
      }
    }
  }
  
  // Utility methods
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  // Load saved preferences
  loadPreferences() {
    const savedStatsVisible = Utils.Storage.get('stats_visible', true);
    const instructionsShown = Utils.Storage.get('instructions_shown', false);
    
    this.state.setState({ 
      statsVisible: savedStatsVisible,
      showInstructions: !instructionsShown
    });
    
    // Apply saved preferences
    if (!savedStatsVisible && this.elements.statsPanel) {
      this.elements.statsPanel.style.transform = 'translateX(-100%)';
    }
    
    if (instructionsShown) {
      this.hideInstructions();
    }
  }
  
  // Public methods for external updates
  updateStats(statsData) {
    this.state.setState({
      connectedUsers: statsData.connectedUsers || 0,
      totalBlocks: statsData.totalBlocks || 2500,
      claimedBlocks: statsData.totalClaimed || 0,
      leaderboard: statsData.leaderboard || [],
      onlineUsers: statsData.users || []
    });
  }
  
  incrementUserBlocks() {
    const current = this.state.getState().userBlocks;
    this.state.setState({ userBlocks: current + 1 });
  }
  
  // Get current state
  getState() {
    return this.state.getState();
  }
  
  // Subscribe to state changes
  subscribe(callback) {
    return this.state.subscribe(callback);
  }
}

// Export for use in other modules
window.UIHandler = UIHandler;
// Funções utilitárias para ranking local
function getLocalHighScore() {
    return parseInt(localStorage.getItem('escapeRoomHighScore') || '0', 10);
}

function setLocalHighScore(score) {
    localStorage.setItem('escapeRoomHighScore', score);
}

class AccessibilityManager {
    constructor(game) {
        this.game = game;
        this.enabled = false;
        this.feedbackInterval = null;
        this.lastSpokenDirection = null;
        this.lastSpokenProximity = null;

        this.audioContext = null;
        this.panner = null;
        this.proximitySoundNode = null;
        
        this.sounds = {
            close: document.getElementById('proximity-close-sound'),
            medium: document.getElementById('proximity-medium-sound'),
            far: document.getElementById('proximity-far-sound'),
        };
        
        Object.values(this.sounds).forEach(sound => {
            if (sound) sound.volume = 0.7;
        });
    }

    initAudioContext() {
        if (this.audioContext) return;
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.panner = this.audioContext.createStereoPanner();
            this.panner.connect(this.audioContext.destination);
        } catch (e) {
            console.error("Web Audio API não é suportada neste navegador.", e);
        }
    }
    
    enable() {
        this.enabled = true;
        document.body.classList.add('accessibility-mode');
        document.getElementById('accessibility-indicator').classList.remove('hidden');
        document.getElementById('route-btn').classList.remove('hidden');
        
        this.initAudioContext();
        this.startFeedbackLoop();
        
        this.speak('Modo acessibilidade ativado. Toque três vezes na tela para calcular a rota.');
    }
    
    disable() {
        this.enabled = false;
        document.body.classList.remove('accessibility-mode');
        document.getElementById('accessibility-indicator').classList.add('hidden');
        document.getElementById('route-btn').classList.add('hidden');
        
        this.stopFeedbackLoop();
        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close();
            this.audioContext = null;
        }
    }
    
    startFeedbackLoop() {
        this.stopFeedbackLoop();
        this.feedbackInterval = setInterval(() => {
            if (!this.game.gameRunning || this.game.movementPaused) return;
            
            const nearestItem = this.findNearestItem();
            if (nearestItem) {
                this.provideContinuousFeedback(nearestItem, 'item');
            } else {
                const doorLocation = this.getDoorLocation();
                this.provideContinuousFeedback(doorLocation, 'door');
            }
        }, 1200);
    }
    
    stopFeedbackLoop() {
        if (this.feedbackInterval) {
            clearInterval(this.feedbackInterval);
            this.feedbackInterval = null;
        }
    }
    
    findNearestItem() {
        let nearest = null;
        let minDistance = Infinity;
        
        const allItems = [...this.game.newsItems, ...this.game.powerUps];

        allItems.forEach(item => {
            if (item.collected) return;
            
            const itemPixelX = (item.xPercent / 100) * this.game.canvas.offsetWidth;
            const itemPixelY = (item.yPercent / 100) * this.game.canvas.offsetHeight;
            
            const distance = Math.sqrt(
                Math.pow(this.game.player.x - itemPixelX, 2) +
                Math.pow(this.game.player.y - itemPixelY, 2)
            );
            
            if (distance < minDistance) {
                minDistance = distance;
                nearest = { x: itemPixelX, y: itemPixelY, distance: distance, item: item };
            }
        });
        
        return nearest;
    }
    
    getDoorLocation() {
        const doorRect = this.game.door.getBoundingClientRect();
        const canvasRect = this.game.canvas.getBoundingClientRect();

        const doorX = (doorRect.left - canvasRect.left) + (doorRect.width / 2);
        const doorY = (doorRect.top - canvasRect.top) + (doorRect.height / 2);
        
        const distance = Math.sqrt(
            Math.pow(this.game.player.x - doorX, 2) +
            Math.pow(this.game.player.y - doorY, 2)
        );

        return { x: doorX, y: doorY, distance: distance };
    }

    provideContinuousFeedback(target, targetType) {
        const { distance, x, y } = target;
        let proximityState;
        let proximityText;
        
        if (distance < 60) {
            proximityState = 'close';
            proximityText = 'muito perto';
        } else if (distance < 180) {
            proximityState = 'medium';
            proximityText = 'perto';
        } else {
            proximityState = 'far';
            proximityText = 'longe';
        }
        
        const dx = x - this.game.player.x;
        
        this.playProximitySound(proximityState, dx);
        
        const directionText = this.getSimpleDirection(dx, y - this.game.player.y);
        
        let objectName = 'Item';
        if (targetType === 'door') {
            objectName = 'A porta';
        } else if (target.item && target.item.questionData) {
            objectName = 'Notícia';
        }

        if (directionText !== this.lastSpokenDirection || proximityText !== this.lastSpokenProximity) {
            this.speak(`${objectName} ${proximityText}, ${directionText}`);
            this.lastSpokenDirection = directionText;
            this.lastSpokenProximity = proximityText;
        }
    }

    playProximitySound(state, dx) {
        if (!this.audioContext || !this.game.soundManager.enabled) return;
        
        const sound = this.sounds[state];
        if (sound) {
            if (!this.proximitySoundNode || this.proximitySoundNode.mediaElement !== sound) {
                this.proximitySoundNode = this.audioContext.createMediaElementSource(sound);
                this.proximitySoundNode.connect(this.panner);
            }

            const panValue = dx / (this.game.canvas.offsetWidth / 2);
            this.panner.pan.setValueAtTime(Math.max(-1, Math.min(1, panValue)), this.audioContext.currentTime);

            sound.currentTime = 0;
            sound.play().catch(e => console.log('Som de proximidade não disponível'));
        }
    }

    getSimpleDirection(dx, dy) {
        const parts = [];
        const threshold = 20;

        if (Math.abs(dy) > threshold) {
            parts.push(dy < 0 ? 'para cima' : 'para baixo');
        }
        if (Math.abs(dx) > threshold) {
            parts.push(dx > 0 ? 'para a direita' : 'para a esquerda');
        }

        if (parts.length === 0) {
            return "bem em frente";
        }
        return parts.join(' e ');
    }
    
    provideRouteToNearestItem() {
        let target, targetType, targetName;

        const nearestItem = this.findNearestItem();
        if (nearestItem) {
            target = nearestItem;
            targetType = 'item';
            targetName = nearestItem.item.questionData ? 'notícia' : 'item';
        } else {
            target = this.getDoorLocation();
            targetType = 'door';
            targetName = 'porta';
        }
        
        const dx = target.x - this.game.player.x;
        const dy = target.y - this.game.player.y;

        const stepSize = 40;
        const horizontalSteps = Math.round(Math.abs(dx) / stepSize);
        const verticalSteps = Math.round(Math.abs(dy) / stepSize);
        
        let instructions = `Para a ${targetName} mais próxima: `;
        const parts = [];

        if (horizontalSteps > 0) {
            const direction = dx > 0 ? 'direita' : 'esquerda';
            parts.push(`mova ${horizontalSteps} ${horizontalSteps > 1 ? 'passos' : 'passo'} para a ${direction}`);
        }
        if (verticalSteps > 0) {
            const direction = dy < 0 ? 'cima' : 'baixo';
            parts.push(`mova ${verticalSteps} ${verticalSteps > 1 ? 'passos' : 'passo'} para ${direction}`);
        }
        
        if (parts.length === 0) {
            instructions += "está bem na sua frente.";
        } else {
            instructions += parts.join(', e depois, ');
        }
        this.speak(instructions);
    }
    
    speak(text) {
        if ('speechSynthesis' in window) {
            speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'pt-BR';
            utterance.rate = 1.3;
            speechSynthesis.speak(utterance);
        }
    }
}

// Sistema de Controles Mobile
class MobileControls {
    constructor(game) {
        this.game = game;
        this.joystickBase = document.getElementById('joystick-base');
        this.joystickStick = document.getElementById('joystick-stick');
        this.isActive = false;
        this.joystickData = {
            startX: 0,
            startY: 0,
            currentX: 0,
            currentY: 0,
            angle: 0,
            distance: 0
        };
        
        this.detectMobile();
        this.setupControls();
    }
    
    detectMobile() {
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        
        if (isMobile || isTouchDevice) {
            this.enableMobileControls();
        }
    }
    
    enableMobileControls() {
        document.getElementById('mobile-controls').classList.remove('hidden');
        document.querySelector('.mobile-instructions').classList.remove('hidden');
        document.querySelector('.desktop-instructions').classList.add('hidden');
    }
    
    setupControls() {
        this.joystickBase.addEventListener('touchstart', (e) => this.handleJoystickStart(e), { passive: false });
        this.joystickBase.addEventListener('touchmove', (e) => this.handleJoystickMove(e), { passive: false });
        this.joystickBase.addEventListener('touchend', (e) => this.handleJoystickEnd(e), { passive: false });
        
        document.getElementById('mobile-mochila')?.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.game.openInventory();
        });
        
        document.getElementById('mobile-interact')?.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.game.tryOpenDoor();
        });
    }
    
    handleJoystickStart(e) {
        e.preventDefault();
        this.isActive = true;
        
        const touch = e.touches[0];
        const rect = this.joystickBase.getBoundingClientRect();
        
        this.joystickData.startX = rect.left + rect.width / 2;
        this.joystickData.startY = rect.top + rect.height / 2;
    }
    
    handleJoystickMove(e) {
        e.preventDefault();
        if (!this.isActive) return;
        
        const touch = e.touches[0];
        const maxDistance = 40;
        
        let deltaX = touch.clientX - this.joystickData.startX;
        let deltaY = touch.clientY - this.joystickData.startY;
        
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const angle = Math.atan2(deltaY, deltaX);
        
        if (distance > maxDistance) {
            deltaX = Math.cos(angle) * maxDistance;
            deltaY = Math.sin(angle) * maxDistance;
        }
        
        this.joystickStick.style.transform = `translate(calc(-50% + ${deltaX}px), calc(-50% + ${deltaY}px))`;
        
        this.updatePlayerMovement(deltaX, deltaY, maxDistance);
    }
    
    handleJoystickEnd(e) {
        e.preventDefault();
        this.isActive = false;
        
        this.joystickStick.style.transform = 'translate(-50%, -50%)';
        
        this.game.keys.left = false;
        this.game.keys.right = false;
        this.game.keys.up = false;
        this.game.keys.down = false;
    }
    
    updatePlayerMovement(deltaX, deltaY, maxDistance) {
        const threshold = maxDistance * 0.3;
        
        this.game.keys.left = false;
        this.game.keys.right = false;
        this.game.keys.up = false;
        this.game.keys.down = false;
        
        if (Math.abs(deltaX) > threshold) {
            if (deltaX > 0) {
                this.game.keys.right = true;
            } else {
                this.game.keys.left = true;
            }
        }
        
        if (Math.abs(deltaY) > threshold) {
            if (deltaY > 0) {
                this.game.keys.down = true;
            } else {
                this.game.keys.up = true;
            }
        }
    }
}

// Sistema de Som
class SoundManager {
    constructor() {
        this.enabled = true;
        this.sounds = {
            collect: this.createAudioElement('collect'),
            correct: this.createAudioElement('correct'),
            wrong: this.createAudioElement('wrong'),
            powerup: this.createAudioElement('powerup'),
            unlock: this.createAudioElement('unlock'),
            background: document.getElementById('background-music')
        };
        
        if (this.sounds.background) {
            this.sounds.background.volume = 0.3;
        }
    }
    
    createAudioElement(id) {
        const audio = document.getElementById(`${id}-sound`);
        if (audio) {
            audio.volume = 0.5;
            return audio;
        }
        return {
            play: () => Promise.resolve(),
            pause: () => {},
            volume: 0.5
        };
    }
    
    play(soundName) {
        if (!this.enabled) return;
        
        const sound = this.sounds[soundName];
        if (sound) {
            sound.currentTime = 0;
            sound.play().catch(e => console.log('Som não pode ser tocado:', e));
        }
    }
    
    toggle() {
        this.enabled = !this.enabled;
        if (this.enabled) {
            this.sounds.background?.play();
        } else {
            this.sounds.background?.pause();
        }
        return this.enabled;
    }
}

// Sistema de Inventário
class Inventory {
    constructor() {
        this.items = {
            time: 0,
            hint: 0,
            shield: 0,
            speed: 0,
            radar: 0
        };
        
        this.itemInfo = {
            time: { name: 'Relógio', icon: '⏰', effect: 'Adiciona 30 segundos' },
            hint: { name: 'Lupa', icon: '💡', effect: 'Revela uma dica' },
            shield: { name: 'Escudo', icon: '🛡️', effect: 'Protege de 1 penalidade' },
            speed: { name: 'Velocidade', icon: '⚡', effect: 'Movimento 2x mais rápido por 15s' },
            radar: { name: 'Radar', icon: '🎯', effect: 'Mostra todos os itens por 5s' }
        };
    }
    
    addItem(type) {
        if (this.items.hasOwnProperty(type)) {
            this.items[type]++;
            return true;
        }
        return false;
    }
    
    useItem(type, game) {
        if (this.items[type] > 0) {
            this.items[type]--;
            this.applyItemEffect(type, game);
            return true;
        }
        return false;
    }
    
    applyItemEffect(type, game) {
        switch(type) {
            case 'time':
                game.timeLeft += 30;
                game.showFeedback('⏰ +30 segundos adicionados!', 'correct');
                break;
            case 'hint':
                game.showFeedback('💡 Dica ativada! Use no próximo desafio.', 'correct');
                break;
            case 'shield':
                game.shieldActive = true;
                document.getElementById('game-canvas').classList.add('shield-active');
                game.showFeedback('🛡️ Escudo ativado! Protegido contra 1 penalidade.', 'correct');
                break;
            case 'speed':
                game.speedBoost = true;
                game.playerSpeed = 8;
                document.getElementById('game-canvas').classList.add('speed-boost');
                setTimeout(() => {
                    game.speedBoost = false;
                    game.playerSpeed = 4;
                    document.getElementById('game-canvas').classList.remove('speed-boost');
                }, 15000);
                game.showFeedback('⚡ Velocidade aumentada por 15 segundos!', 'correct');
                break;
            case 'radar':
                document.getElementById('game-canvas').classList.add('radar-active');
                setTimeout(() => {
                    document.getElementById('game-canvas').classList.remove('radar-active');
                }, 5000);
                game.showFeedback('🎯 Radar ativado! Todos os itens visíveis por 5 segundos!', 'correct');
                break;
        }
    }
    
    render() {
        const grid = document.getElementById('inventory-grid');
        grid.innerHTML = '';
        
        Object.entries(this.items).forEach(([type, count]) => {
            const item = document.createElement('div');
            item.className = 'inventory-item';
            item.innerHTML = `
                <div class="item-icon">${this.itemInfo[type].icon}</div>
                <div class="item-name">${this.itemInfo[type].name}</div>
                ${count > 0 ? `<div class="item-count">${count}</div>` : ''}
            `;
            
            if (count > 0) {
                item.style.cursor = 'pointer';
                item.title = this.itemInfo[type].effect;
                item.addEventListener('click', () => {
                    const game = window.currentGame;
                    if (game && this.useItem(type, game)) {
                        this.render();
                    }
                });
            } else {
                item.style.opacity = '0.5';
            }
            
            grid.appendChild(item);
        });
    }
}

function shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

import rooms from './rooms.js';

class EscapeRoomGame {
    constructor() {
        window.currentGame = this;
        
        this.player = {
            x: 40,
            y: 40,
            element: document.getElementById('player'),
        };
        
        this.shuffledRooms = shuffleArray([...rooms]);
        this.currentRoomIndex = 0;
        this.maxRooms = this.shuffledRooms.length;
        this.foundDigits = 0;
        this.passwordLength = 5;
        this.score = 0;
        this.timeLeft = 600;
        this.gameRunning = false;
        this.roomData = {};
        this.currentPassword = [];
        this.newsItems = [];
        this.powerUps = [];
        
        this.soundManager = new SoundManager();
        this.inventory = new Inventory();
        
        this.correctStreak = 0;
        this.wrongStreak = 0;
        this.movementPaused = false;
        this.playerSpeed = 4;
        this.speedBoost = false;
        this.shieldActive = false;
        this.hintAvailable = false;
        this.accessibilityMode = false;
        this.accessibilityManager = new AccessibilityManager(this);
        this.mobileControls = new MobileControls(this);
        
        this.h1Title = document.getElementById('room-title');
        this.canvas = document.getElementById('game-canvas');
        this.door = document.getElementById('door');
        
        this.keys = {
            left: false,
            right: false,
            up: false,
            down: false
        };
        
        this.lastDirection = null;

        // --- NOVO: Variáveis para detectar toque triplo ---
        this.tapCount = 0;
        this.lastTapTime = 0;
        
        this.init();
    }
    
    async init() {
        this.showTutorial();
        await this.loadRoomData();
        this.setupEventListeners();
    }
    
    showTutorial() {
        const tutorialModal = document.getElementById('tutorial-modal');
        tutorialModal.classList.remove('hidden');
        
        document.getElementById('normal-mode-btn').addEventListener('click', () => {
            tutorialModal.classList.add('hidden');
            this.accessibilityMode = false;
            this.startGame();
        });
        
        document.getElementById('accessibility-mode-btn').addEventListener('click', () => {
            tutorialModal.classList.add('hidden');
            this.accessibilityMode = true;
            this.accessibilityManager.enable();
            this.startGame();
        });
    }

    startGame() {
        this.gameRunning = true;
        this.initializeRoom();
        this.startTimer();
        this.gameLoop();
        this.soundManager.play('background');
    }
    
    async loadRoomData() {
        try {
            const response = await fetch('data/questions.json');
            const data = await response.json();
            this.roomData = {};
            Object.keys(data).forEach(roomKey => {
                this.roomData[roomKey] = shuffleArray([...data[roomKey]]);
            });
        } catch (error) {
            console.error('Erro ao carregar dados das salas:', error);
            this.roomData = this.getDefaultQuestions();
        }
    }
    
    getDefaultQuestions() {
        return {
            room1: [
                {
                    id: 1,
                    text: "Nova pesquisa revela que comer sementes de maçã diariamente previne todas as doenças genéticas.",
                    isFake: true,
                    digit: 4,
                    explanation: "FAKE NEWS! Não há comprovação científica.",
                    hint: "Sementes de maçã contêm cianeto em pequenas quantidades."
                }
            ]
        };
    }
    
    updateRoomInfo() {
        const currentRoomData = this.shuffledRooms[this.currentRoomIndex];
        const roomName = currentRoomData ? currentRoomData.name : `Sala ${this.currentRoomIndex + 1}`;
        
        if (this.h1Title) {
            this.h1Title.textContent = `Escape Room - ${roomName}`;
        }
        
        document.getElementById('room-info').textContent = roomName;
        document.getElementById('high-score').textContent = `Recorde: ${getLocalHighScore()}`;
        
        const progress = ((this.currentRoomIndex + 1) / this.maxRooms) * 100;
        document.querySelector('.difficulty-fill').style.width = `${progress}%`;
        document.getElementById('difficulty-level').textContent = `Nível ${this.currentRoomIndex + 1}/${this.maxRooms}`;
    }
    
    initializeRoom() {
        this.currentPassword = Array(this.passwordLength).fill('_');
        this.foundDigits = 0;
        this.updatePasswordDisplay();
        this.spawnNewsItems();
        this.spawnPowerUps();
        this.updateRoomInfo();
        this.resetPlayerPosition();
        
        if (this.currentRoomIndex > 0) {
            const difficultyMultiplier = 1 + (this.currentRoomIndex * 0.1);
            this.playerSpeed = Math.max(3, 4 / difficultyMultiplier);
        }
    }
    
    resetPlayerPosition() {
        this.player.x = 40;
        this.player.y = 40;
        this.player.element.style.left = this.player.x + 'px';
        this.player.element.style.top = this.player.y + 'px';
    }
    
    setupEventListeners() {
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));
        
        // --- NOVO: Listener de toque para o gesto de toque triplo ---
        this.canvas.addEventListener('touchend', (e) => this.handleTripleTap(e));
        
        document.getElementById('fake-btn').addEventListener('click', () => this.answerQuestion(true));
        document.getElementById('real-btn').addEventListener('click', () => this.answerQuestion(false));
        document.getElementById('use-hint-btn').addEventListener('click', () => this.useHint());
        
        this.door.addEventListener('click', () => this.tryOpenDoor());
        
        document.getElementById('pause-btn')?.addEventListener('click', () => this.togglePause());
        
        document.getElementById('sound-btn')?.addEventListener('click', () => {
            const enabled = this.soundManager.toggle();
            document.getElementById('sound-btn').textContent = enabled ? '🔊 Som' : '🔇 Som';
        });

        document.getElementById('route-btn')?.addEventListener('click', () => {
            if (this.accessibilityMode) {
                this.accessibilityManager.provideRouteToNearestItem();
            }
        });
        
        document.getElementById('mochila-btn')?.addEventListener('click', () => this.openInventory());
        document.getElementById('close-mochila')?.addEventListener('click', () => this.closeInventory());
    }
    
    // --- NOVA FUNÇÃO: Lógica para detectar o toque triplo ---
    handleTripleTap(e) {
        if (!this.accessibilityMode) return;

        const currentTime = new Date().getTime();
        const timeSinceLastTap = currentTime - this.lastTapTime;

        if (timeSinceLastTap < 500) { // Toques devem ser rápidos
            this.tapCount++;
        } else {
            this.tapCount = 1;
        }

        this.lastTapTime = currentTime;

        if (this.tapCount === 3) {
            e.preventDefault();
            this.accessibilityManager.provideRouteToNearestItem();
            this.tapCount = 0; // Reseta a contagem
        }
    }
    
    handleKeyDown(e) {
        if (this.movementPaused) return;
        
        switch (e.key.toLowerCase()) {
            case 'arrowleft':
            case 'a':
                this.keys.left = true;
                this.lastDirection = 'left';
                e.preventDefault();
                break;
            case 'arrowright':
            case 'd':
                this.keys.right = true;
                this.lastDirection = 'right';
                e.preventDefault();
                break;
            case 'arrowup':
            case 'w':
                this.keys.up = true;
                this.lastDirection = 'up';
                e.preventDefault();
                break;
            case 'arrowdown':
            case 's':
                this.keys.down = true;
                this.lastDirection = 'down';
                e.preventDefault();
                break;
            case 'b':
                this.openInventory();
                break;
            case 'h':
                if (this.accessibilityMode) {
                    this.accessibilityManager.provideRouteToNearestItem();
                }
                break;
        }
    }
    
    handleKeyUp(e) {
        switch (e.key.toLowerCase()) {
            case 'arrowleft':
            case 'a':
                this.keys.left = false;
                break;
            case 'arrowright':
            case 'd':
                this.keys.right = false;
                break;
            case 'arrowup':
            case 'w':
                this.keys.up = false;
                break;
            case 'arrowdown':
            case 's':
                this.keys.down = false;
                break;
        }
    }
    
    updatePlayer() {
        if (this.movementPaused || !this.gameRunning) return;
        
        const speed = this.speedBoost ? this.playerSpeed * 2 : this.playerSpeed;
        let moved = false;
        const playerEl = this.player.element;
        
        playerEl.classList.remove('moving-left', 'moving-right', 'moving-up', 'moving-down');
        
        if (this.keys.left && this.player.x > 5) {
            this.player.x -= speed;
            playerEl.classList.add('moving-left');
            moved = true;
        }
        if (this.keys.right && this.player.x < this.canvas.offsetWidth - 45) {
            this.player.x += speed;
            playerEl.classList.add('moving-right');
            moved = true;
        }
        if (this.keys.up && this.player.y > 5) {
            this.player.y -= speed;
            playerEl.classList.add('moving-up');
            moved = true;
        }
        if (this.keys.down && this.player.y < this.canvas.offsetHeight - 45) {
            this.player.y += speed;
            playerEl.classList.add('moving-down');
            moved = true;
        }
        
        if (moved) {
            playerEl.style.left = this.player.x + 'px';
            playerEl.style.top = this.player.y + 'px';
            
            if (Math.random() < 0.1) {
                this.createParticle(this.player.x + 20, this.player.y + 20);
            }
        }
    }
    
    createParticle(x, y) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = x + 'px';
        particle.style.top = y + 'px';
        particle.textContent = '✨';
        document.getElementById('effects-container').appendChild(particle);
        
        setTimeout(() => particle.remove(), 2000);
    }
    
    spawnNewsItems() {
        const container = document.getElementById('news-items');
        container.innerHTML = '';
        this.newsItems = [];
        
        const currentRoomId = this.shuffledRooms[this.currentRoomIndex].id;
        const roomQuestions = this.roomData[`room${currentRoomId}`];
        
        if (roomQuestions) {
            roomQuestions.forEach((question, index) => {
                this.spawnNewsItem(question, index);
            });
        }
    }
    
    spawnNewsItem(questionData, index) {
        const container = document.getElementById('news-items');
        const newsItem = document.createElement('div');
        newsItem.className = 'news-item';
        
        let pos, tentativas = 0, sobrepoe;
        do {
            pos = {
                x: 10 + Math.random() * 70,
                y: 10 + Math.random() * 70
            };
            sobrepoe = false;
            
            for (const item of this.newsItems) {
                const dx = pos.x - item.xPercent;
                const dy = pos.y - item.yPercent;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 15) {
                    sobrepoe = true;
                    break;
                }
            }
            tentativas++;
        } while (sobrepoe && tentativas < 50);
        
        newsItem.style.left = pos.x + '%';
        newsItem.style.top = pos.y + '%';
        newsItem.dataset.questionId = questionData.id;
        
        container.appendChild(newsItem);
        
        this.newsItems.push({
            element: newsItem,
            xPercent: pos.x,
            yPercent: pos.y,
            questionData: questionData,
            collected: false
        });
    }
    
    spawnPowerUps() {
        const container = document.getElementById('power-ups');
        container.innerHTML = '';
        this.powerUps = [];
        
        const numPowerUps = Math.floor(Math.random() * 2) + 1;
        const powerUpTypes = ['time', 'hint', 'shield', 'speed', 'radar'];
        
        for (let i = 0; i < numPowerUps; i++) {
            const type = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
            this.spawnPowerUp(type);
        }
    }
    
    spawnPowerUp(type) {
        const container = document.getElementById('power-ups');
        const powerUp = document.createElement('div');
        powerUp.className = `power-up ${type}`;
        
        const pos = {
            x: 20 + Math.random() * 60,
            y: 20 + Math.random() * 60
        };
        
        powerUp.style.left = pos.x + '%';
        powerUp.style.top = pos.y + '%';
        
        container.appendChild(powerUp);
        
        this.powerUps.push({
            element: powerUp,
            xPercent: pos.x,
            yPercent: pos.y,
            type: type,
            collected: false
        });
    }
    
    checkCollisions() {
        if (this.movementPaused) return;
        
        this.newsItems.forEach((item, index) => {
            if (item.collected) return;
            
            const itemPixelX = (item.xPercent / 100) * this.canvas.offsetWidth;
            const itemPixelY = (item.yPercent / 100) * this.canvas.offsetHeight;
            
            const distance = Math.sqrt(
                Math.pow(this.player.x + 20 - (itemPixelX + 15), 2) +
                Math.pow(this.player.y + 20 - (itemPixelY + 15), 2)
            );
            
            if (distance < 30) {
                this.soundManager.play('collect');
                this.showNewsModal(item.questionData, index);
            }
        });
        
        this.powerUps.forEach((powerUp, index) => {
            if (powerUp.collected) return;
            
            const powerUpPixelX = (powerUp.xPercent / 100) * this.canvas.offsetWidth;
            const powerUpPixelY = (powerUp.yPercent / 100) * this.canvas.offsetHeight;
            
            const distance = Math.sqrt(
                Math.pow(this.player.x + 20 - (powerUpPixelX + 17), 2) +
                Math.pow(this.player.y + 20 - (powerUpPixelY + 17), 2)
            );
            
            if (distance < 30) {
                this.collectPowerUp(powerUp);
            }
        });
    }
    
    collectPowerUp(powerUp) {
        powerUp.collected = true;
        powerUp.element.remove();
        this.inventory.addItem(powerUp.type);
        this.soundManager.play('powerup');
        
        const itemInfo = this.inventory.itemInfo[powerUp.type];
        this.showFeedback(`${itemInfo.icon} Coletou ${itemInfo.name}!`, 'correct');
    }
    
    showNewsModal(questionData, itemIndex) {
        this.currentQuestionIndex = itemIndex;
        this.currentQuestion = questionData;
        
        document.getElementById('modal-news').textContent = questionData.text;
        document.getElementById('modal').classList.remove('hidden');
        this.movementPaused = true;
        
        const hintBtn = document.getElementById('use-hint-btn');
        if (this.inventory.items.hint > 0) {
            hintBtn.style.display = 'inline-block';
        } else {
            hintBtn.style.display = 'none';
        }
        
        document.getElementById('hint-section').classList.add('hidden');
        document.getElementById('hint-content').textContent = '';
    }

    useHint() {
        if (this.inventory.items.hint > 0 && this.currentQuestion) {
            this.inventory.items.hint--;
            const hintText = this.currentQuestion.hint || 
                            (this.currentQuestion.isFake ? 
                             "Questione: Isso parece realista ou exagerado?" : 
                             "Isso está alinhado com o conhecimento científico estabelecido.");
            
            document.getElementById('hint-content').textContent = hintText;
            document.getElementById('hint-section').classList.remove('hidden');
            document.getElementById('use-hint-btn').style.display = 'none';
        }
    }
    
    answerQuestion(userSaysFake) {
        const item = this.newsItems[this.currentQuestionIndex];
        const questionData = item.questionData;
        const isCorrect = userSaysFake === questionData.isFake;
        
        if (isCorrect) {
            this.soundManager.play('correct');
            this.score += 10;
            this.addDigitToPassword(questionData.digit);
            item.element.remove();
            item.collected = true;
            this.correctStreak++;
            this.wrongStreak = 0;
            
            let bonus = 0;
            const streakBonuses = [3, 5, 7, 10, 12, 15, 20, 25, 30, 40, 50];
            if (streakBonuses.includes(this.correctStreak)) {
                bonus = this.correctStreak * 5;
                this.score += bonus;
                this.showFeedback(
                    `✅ Correto! +10 pontos\n📍 Número ${questionData.digit} adicionado!\n🔥 Bônus streak x${this.correctStreak}: +${bonus} pontos!`,
                    'correct'
                );
            } else {
                this.showFeedback(
                    `✅ Correto! +10 pontos\n📍 Número ${questionData.digit} adicionado à senha!`,
                    'correct'
                );
            }
        } else {
            this.soundManager.play('wrong');
            this.wrongStreak++;
    
            if (this.shieldActive) {
                this.shieldActive = false;
                document.getElementById('game-canvas').classList.remove('shield-active');
                this.showFeedback(
                    `❌ ${questionData.explanation}\n🛡️ Escudo absorveu a penalidade e protegeu sua sequência!`,
                    'incorrect'
                );
            } else {
                this.correctStreak = 0;
        
                const penalty = Math.min(this.wrongStreak * 5, 20);
                this.timeLeft = Math.max(0, this.timeLeft - penalty);
                this.showFeedback(
                    `❌ ${questionData.explanation}\n⏰ Tempo perdido: -${penalty} segundos!`,
                    'incorrect'
                );
            }
        }
        
        this.updateUI();
        document.getElementById('modal').classList.add('hidden');
        this.movementPaused = false;
    }
    
    addDigitToPassword(digit) {
        if (this.foundDigits < this.passwordLength) {
            this.currentPassword[this.foundDigits] = digit;
            this.foundDigits++;
            this.updatePasswordDisplay();
            
            if (this.foundDigits === this.passwordLength) {
                this.soundManager.play('unlock');
                this.door.classList.add('unlocked');
                document.getElementById('password-hint').textContent = 
                    '🎉 Senha completa! Vá até a porta para avançar!';
            }
        }
    }
    
    updatePasswordDisplay() {
        document.getElementById('password-digits').textContent = this.currentPassword.join(' ');
    }
    
    tryOpenDoor() {
        if (this.isPlayerCollidingWithDoor() && this.foundDigits === this.passwordLength) {
            if (this.currentRoomIndex < this.maxRooms - 1) {
                this.nextRoom();
            } else {
                this.winGame();
            }
        } else if (this.isPlayerCollidingWithDoor()) {
            this.showFeedback('🔒 Você precisa descobrir todos os números da senha primeiro!', 'incorrect');
        }
    }
    
    isPlayerCollidingWithDoor() {
        const playerBounds = this.player.element.getBoundingClientRect();
        const doorBounds = this.door.getBoundingClientRect();
        
        return (
            playerBounds.right > doorBounds.left &&
            playerBounds.left < doorBounds.right &&
            playerBounds.bottom > doorBounds.top &&
            playerBounds.top < doorBounds.bottom
        );
    }
    
    nextRoom() {
        this.resetPlayerPosition();
        this.foundDigits = 0;
        this.timeLeft += 60;
        this.currentRoomIndex++;
        
        if (this.currentRoomIndex >= this.maxRooms) {
            this.winGame();
            return;
        }
        
        this.door.classList.remove('unlocked');
        const nextRoomName = this.shuffledRooms[this.currentRoomIndex].name;
        this.showFeedback(
            `🎊 Parabéns! Você avançou para ${nextRoomName}!\n⏰ +1 minuto no cronômetro!`,
            'correct'
        );
        
        setTimeout(() => {
            this.initializeRoom();
        }, 1500);
    }
    
    togglePause() {
        this.gameRunning = !this.gameRunning;
        this.movementPaused = !this.gameRunning;
        const pauseBtn = document.getElementById('pause-btn');
        if (pauseBtn) {
            pauseBtn.textContent = this.gameRunning ? '⏸️ Pausar' : '▶️ Retomar';
        }
        
        if (!this.gameRunning) {
            this.soundManager.sounds.background?.pause();
        } else {
            this.soundManager.sounds.background?.play();
        }
        
        this.showFeedback(
            this.gameRunning ? '▶️ Jogo retomado!' : '⏸️ Jogo pausado!',
            this.gameRunning ? 'correct' : 'incorrect'
        );
    }
    
    openInventory() {
        this.movementPaused = true;
        this.inventory.render();
        document.getElementById('mochila-modal').classList.remove('hidden');
    }
    
    closeInventory() {
        this.movementPaused = false;
        document.getElementById('mochila-modal').classList.add('hidden');
    }
    
    showFeedback(message, type) {
        const oldFeedback = document.querySelector('.feedback');
        if (oldFeedback) {
            oldFeedback.remove();
        }
        
        const feedback = document.createElement('div');
        feedback.className = `feedback ${type}`;
        feedback.innerHTML = message.replace(/\n/g, '<br>');
        document.body.appendChild(feedback);
        
        setTimeout(() => {
            if (document.body.contains(feedback)) {
                feedback.remove();
            }
        }, 4000);
    }
    
    updateUI() {
        document.getElementById('score').textContent = `Pontos: ${this.score}`;
        document.getElementById('streak-info').textContent = `Sequência: ${this.correctStreak}`;
    }
    
    startTimer() {
        this.timerInterval = setInterval(() => {
            if (!this.gameRunning) return;
            
            if (!this.accessibilityMode) {
                this.timeLeft--;
            }
            
            const minutes = Math.floor(this.timeLeft / 60);
            const seconds = this.timeLeft % 60;
            const timerEl = document.getElementById('timer');
            
            timerEl.textContent = `Tempo: ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            
            if (!this.accessibilityMode) {
                if (this.timeLeft <= 60) {
                    timerEl.style.color = '#ff6b6b';
                    timerEl.style.animation = 'pulse-timer 0.5s infinite';
                } else if (this.timeLeft <= 180) {
                    timerEl.style.color = '#ffa500';
                }
                
                if (this.timeLeft <= 0) {
                    this.endGame('⏰ Tempo esgotado!');
                }
            }
        }, 1000);
    }
    
    endGame(reason) {
        this.gameRunning = false;
        clearInterval(this.timerInterval);
        this.soundManager.sounds.background?.pause();
        
        const gameOver = document.createElement('div');
        gameOver.className = 'game-over';
        gameOver.innerHTML = `
            <h2>🎮 Fim de Jogo!</h2>
            <p><strong>${reason}</strong></p>
            <p>📊 Pontuação Final: ${this.score} pontos</p>
            <p>🚪 Chegou até: ${this.shuffledRooms[this.currentRoomIndex]?.name || 'Sala ' + (this.currentRoomIndex + 1)}</p>
            <p>🔥 Maior sequência: ${this.correctStreak} acertos</p>
            <button class="restart-btn" onclick="location.reload()">🔄 Tentar Novamente</button>
        `;
        document.body.appendChild(gameOver);
    }
    
    winGame() {
        this.gameRunning = false;
        clearInterval(this.timerInterval);
        this.soundManager.sounds.background?.pause();
        
        let timeBonus = Math.floor(this.timeLeft / 2);
        if (timeBonus > 0) {
            this.score += timeBonus;
        }
        
        const previousHighScore = getLocalHighScore();
        let rankingMsg = '';
        if (this.score > previousHighScore) {
            setLocalHighScore(this.score);
            rankingMsg = `<p>🏆 NOVO RECORDE! Pontuação máxima: ${this.score}</p>`;
        } else {
            rankingMsg = `<p>🏆 Sua melhor pontuação: ${previousHighScore}</p>`;
        }
        
        const gameWin = document.createElement('div');
        gameWin.className = 'game-over';
        gameWin.innerHTML = `
            <h2>🎉 PARABÉNS!</h2>
            <p>🎊 Você escapou de todas as salas!</p>
            <p>📊 Pontuação Final: ${this.score} pontos</p>
            <p>⏰ Tempo restante: ${Math.floor(this.timeLeft / 60)}:${(this.timeLeft % 60).toString().padStart(2, '0')}</p>
            ${timeBonus > 0 ? `<p>⭐ Bônus por tempo: +${timeBonus} pontos!</p>` : ''}
            ${rankingMsg}
            <p>🕵️ Você é um verdadeiro detetive de fake news!</p>
            <button class="restart-btn" onclick="location.reload()">🎮 Jogar Novamente</button>
        `;
        document.body.appendChild(gameWin);
    }
    
    gameLoop() {
        if (this.gameRunning) {
            this.updatePlayer();
            this.checkCollisions();
            this.tryOpenDoor();
        }
        requestAnimationFrame(() => this.gameLoop());
    }
}

export function startGame() {
    new EscapeRoomGame();
}
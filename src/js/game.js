import rooms from './rooms.js';

class EscapeRoomGame {
    constructor() {
        this.player = {
            x: 40,
            y: 40,
            element: document.getElementById('player')
        };

        this.currentRoom = 1; // Sala inicial
        this.maxRooms = rooms.length; // Número total de salas baseado no rooms.js
        this.foundDigits = 0; // Dígitos encontrados
        this.passwordLength = 5; // Comprimento da senha
        this.score = 0;
        this.timeLeft = 600; // 10 minutos
        this.gameRunning = true;
        this.roomData = {};
        this.currentPassword = [];
        this.newsItems = [];

        this.canvas = document.getElementById('game-canvas');
        this.door = document.getElementById('door');

        this.keys = {
            left: false,
            right: false,
            up: false,
            down: false
        };
        
        this.init();
    }
    
    async init() {
        await this.loadRoomData();
        this.setupEventListeners();
        this.initializeRoom();
        this.startTimer();
        this.gameLoop();
    }
    
    async loadRoomData() {
        try {
            const response = await fetch('data/questions.json');
            this.roomData = await response.json();
        } catch (error) {
            console.error('Erro ao carregar dados das salas:', error);
        }
    }
    
    initializeRoom() {
        this.currentPassword = Array(this.passwordLength).fill('_');
        this.foundDigits = 0;
        this.updatePasswordDisplay();
        this.spawnNewsItems();
        this.updateRoomInfo();
        this.resetPlayerPosition();
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
        
        document.getElementById('fake-btn').addEventListener('click', () => this.answerQuestion(true));
        document.getElementById('real-btn').addEventListener('click', () => this.answerQuestion(false));
        
        this.door.addEventListener('click', () => this.tryOpenDoor());
    }
    
    handleKeyDown(e) {
        switch(e.key) {
            case 'ArrowLeft':
                this.keys.left = true;
                e.preventDefault();
                break;
            case 'ArrowRight':
                this.keys.right = true;
                e.preventDefault();
                break;
            case 'ArrowUp':
                this.keys.up = true;
                e.preventDefault();
                break;
            case 'ArrowDown':
                this.keys.down = true;
                e.preventDefault();
                break;
        }
    }
    
    handleKeyUp(e) {
        switch(e.key) {
            case 'ArrowLeft':
                this.keys.left = false;
                break;
            case 'ArrowRight':
                this.keys.right = false;
                break;
            case 'ArrowUp':
                this.keys.up = false;
                break;
            case 'ArrowDown':
                this.keys.down = false;
                break;
        }
    }
    
    updatePlayer() {
        const speed = 4; // Aumentei a velocidade
        let moved = false;
        
        // Movimento mais suave e responsivo
        if (this.keys.left && this.player.x > 5) {
            this.player.x -= speed;
            moved = true;
        }
        if (this.keys.right && this.player.x < this.canvas.offsetWidth - 85) { // Ajustei para o novo tamanho
            this.player.x += speed;
            moved = true;
        }
        if (this.keys.up && this.player.y > 5) {
            this.player.y -= speed;
            moved = true;
        }
        if (this.keys.down && this.player.y < this.canvas.offsetHeight - 45) { // Ajustei para o novo tamanho
            this.player.y += speed;
            moved = true;
        }
        
        // Atualizar posição imediatamente, sem transição CSS
        if (moved) {
            this.player.element.style.left = this.player.x + 'px';
            this.player.element.style.top = this.player.y + 'px';
        }
    }
    
    spawnNewsItems() {
        const container = document.getElementById('news-items');
        container.innerHTML = '';
        this.newsItems = [];
        
        const roomKey = `room${this.currentRoom}`;
        const roomQuestions = this.roomData[roomKey];
        
        if (!roomQuestions) return;
        
        // Embaralhar as perguntas e pegar apenas 5
        const shuffled = [...roomQuestions].sort(() => Math.random() - 0.5).slice(0, 5);
        
        shuffled.forEach((question, index) => {
            this.spawnNewsItem(question, index);
        });
    }
    
    spawnNewsItem(questionData, index) {
        const container = document.getElementById('news-items');
        const newsItem = document.createElement('div');
        newsItem.className = 'news-item';
        
        // Posições otimizadas para tela menor
        const positions = [
            { x: 80, y: 60 },
            { x: 250, y: 100 },
            { x: 120, y: 200 },
            { x: 350, y: 180 },
            { x: 200, y: 280 }
        ];
        
        const pos = positions[index] || { 
            x: 60 + Math.random() * (this.canvas.offsetWidth - 140), 
            y: 40 + Math.random() * (this.canvas.offsetHeight - 80) 
        };
        
        newsItem.style.left = pos.x + 'px';
        newsItem.style.top = pos.y + 'px';
        newsItem.dataset.questionId = questionData.id;
        
        container.appendChild(newsItem);
        
        this.newsItems.push({
            element: newsItem,
            x: pos.x,
            y: pos.y,
            questionData: questionData,
            collected: false
        });
    }
    
    checkCollisions() {
        this.newsItems.forEach((item, index) => {
            if (item.collected) return;
            
            // Distância de colisão otimizada
            const distance = Math.sqrt(
                Math.pow(this.player.x - item.x, 2) + 
                Math.pow(this.player.y - item.y, 2)
            );
            
            if (distance < 30) { // Distância menor para colisão mais precisa
                this.showNewsModal(item.questionData, index);
            }
        });
        
        // Verificar colisão com a porta (ajustado para novo tamanho)
        const doorDistance = Math.sqrt(
            Math.pow(this.player.x - (this.canvas.offsetWidth - 60), 2) + 
            Math.pow(this.player.y - (this.canvas.offsetHeight / 2), 2)
        );
        
        if (doorDistance < 40) {
            if (this.foundDigits === this.passwordLength) {
                // Verifique explicitamente se o jogador está na última sala
                if (this.currentRoom < this.maxRooms) {
                    this.nextRoom(); // Avance para a próxima sala
                } else {
                    this.winGame(); // Finalize o jogo
                }
            } else {
                this.showFeedback('Você precisa descobrir todos os números da senha primeiro!', 'incorrect');
            }
        }
    }
    
    showNewsModal(questionData, itemIndex) {
        this.currentQuestionIndex = itemIndex;
        document.getElementById('modal-news').textContent = questionData.text;
        document.getElementById('modal').classList.remove('hidden');
        this.gameRunning = false;
    }
    
    answerQuestion(userSaysFake) {
        const item = this.newsItems[this.currentQuestionIndex];
        const questionData = item.questionData;
        const isCorrect = userSaysFake === questionData.isFake;
        
        if (isCorrect) {
            this.score += 10;
            this.addDigitToPassword(questionData.digit);
            this.showFeedback(`Correto! +10 pontos. Número ${questionData.digit} adicionado à senha!`, 'correct');
            
            // Remover o item coletado
            item.element.remove();
            item.collected = true;
            
        } else {
            this.showFeedback(questionData.explanation, 'incorrect');
        }
        
        this.updateUI();
        document.getElementById('modal').classList.add('hidden');
        this.gameRunning = true;
    }
    
    addDigitToPassword(digit) {
        if (this.foundDigits < this.passwordLength) {
            this.currentPassword[this.foundDigits] = digit;
            this.foundDigits++;
            this.updatePasswordDisplay();
            
            if (this.foundDigits === this.passwordLength) {
                this.door.classList.add('unlocked');
                document.getElementById('password-hint').textContent = 'Senha completa! Vá até a porta para avançar!';
            }
        }
    }
    
    updatePasswordDisplay() {
        const display = document.getElementById('password-digits');
        display.textContent = this.currentPassword.join(' ');
    }
    
    tryOpenDoor() {
        if (this.foundDigits === this.passwordLength) {
            if (this.currentRoom < this.maxRooms) {
                this.nextRoom();
            } else {
                this.winGame();
            }
        } else {
            this.showFeedback('Você precisa descobrir todos os números da senha primeiro!', 'incorrect');
        }
    }
    
    nextRoom() {
        this.currentRoom++;

        // Verifique se o jogador está na última sala
        if (this.currentRoom > this.maxRooms) {
            this.winGame();
            return;
        }

        // Reposicione o jogador no canto esquerdo da sala
        this.player.x = 40; // Posição inicial no eixo X
        this.player.y = 40; // Posição inicial no eixo Y
        this.updatePlayerPosition();

        this.door.classList.remove('unlocked');
        this.showFeedback(`Parabéns! Você passou para a Sala ${this.currentRoom}!`, 'correct');
        
        setTimeout(() => {
            this.initializeRoom();
        }, 2000);
    }

    updatePlayerPosition() {
        // Atualize a posição do elemento do jogador no DOM
        this.player.element.style.left = `${this.player.x}px`;
        this.player.element.style.top = `${this.player.y}px`;
    }
    
    winGame() {
        this.gameRunning = false;
        clearInterval(this.timerInterval);
        
        const gameWin = document.createElement('div');
        gameWin.className = 'game-over';
        gameWin.innerHTML = `
            <h2>🎉 PARABÉNS!</h2>
            <p>Você escapou de todas as salas!</p>
            <p>Pontuação Final: ${this.score} pontos</p>
            <p>Tempo restante: ${Math.floor(this.timeLeft / 60)}:${(this.timeLeft % 60).toString().padStart(2, '0')}</p>
            <p>Você é um verdadeiro detetive de fake news!</p>
            <button class="restart-btn" onclick="location.reload()">Jogar Novamente</button>
        `;
        
        document.body.appendChild(gameWin);
    }
    
    showFeedback(message, type) {
        const feedback = document.createElement('div');
        feedback.className = `feedback ${type}`;
        feedback.style.position = 'fixed';
        feedback.style.top = '20px';
        feedback.style.left = '50%';
        feedback.style.transform = 'translateX(-50%)';
        feedback.style.padding = '15px 25px';
        feedback.style.borderRadius = '8px';
        feedback.style.zIndex = '1002';
        feedback.style.fontSize = '1.1em';
        feedback.style.fontWeight = 'bold';
        feedback.style.maxWidth = '80%';
        feedback.style.textAlign = 'center';
        feedback.textContent = message;
        
        if (type === 'correct') {
            feedback.style.background = 'linear-gradient(45deg, #00b894, #00cec9)';
        } else {
            feedback.style.background = 'linear-gradient(45deg, #e17055, #d63031)';
        }
        
        document.body.appendChild(feedback);
        
        setTimeout(() => {
            if (document.body.contains(feedback)) {
                document.body.removeChild(feedback);
            }
        }, 4000);
    }
    
    updateUI() {
        document.getElementById('score').textContent = `Pontos: ${this.score}`;
    }
    
    updateRoomInfo() {
        document.getElementById('room-info').textContent = `Sala ${this.currentRoom}`;
    }
    
    startTimer() {
        this.timerInterval = setInterval(() => {
            this.timeLeft--;
            
            const minutes = Math.floor(this.timeLeft / 60);
            const seconds = this.timeLeft % 60;
            
            document.getElementById('timer').textContent = 
                `Tempo: ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            
            if (this.timeLeft <= 0) {
                this.endGame('Tempo esgotado!');
            }
        }, 1000);
    }
    
    endGame(reason) {
        this.gameRunning = false;
        clearInterval(this.timerInterval);
        
        const gameOver = document.createElement('div');
        gameOver.className = 'game-over';
        gameOver.innerHTML = `
            <h2>⏰ Fim de Jogo!</h2>
            <p><strong>${reason}</strong></p>
            <p>Pontuação Final: ${this.score} pontos</p>
            <p>Chegou até a Sala ${this.currentRoom}</p>
            <button class="restart-btn" onclick="location.reload()">Tentar Novamente</button>
        `;
        
        document.body.appendChild(gameOver);
    }
    
    gameLoop() {
        if (this.gameRunning) {
            this.updatePlayer();
            this.checkCollisions();
            this.handlePlayerCollisionWithDoor();
        }
        
        requestAnimationFrame(() => this.gameLoop());
    }

    handlePlayerCollisionWithDoor() {
        // Verifique se o jogador encontrou a porta
        if (this.isPlayerCollidingWithDoor()) {
            // Em vez de chamar winGame() diretamente, chame tryOpenDoor()
            this.tryOpenDoor();
        }
    }

    isPlayerCollidingWithDoor() {
        // Lógica para verificar se o jogador está colidindo com a porta
        // Retorne true se houver colisão, false caso contrário
        // Exemplo básico:
        const playerBounds = this.player.element.getBoundingClientRect();
        const doorBounds = this.door.getBoundingClientRect();
        return (
            playerBounds.right > doorBounds.left &&
            playerBounds.left < doorBounds.right &&
            playerBounds.bottom > doorBounds.top &&
            playerBounds.top < doorBounds.bottom
        );
    }
}

export function startGame() {
    new EscapeRoomGame();
}
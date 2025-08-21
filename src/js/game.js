import rooms from './rooms.js';

class EscapeRoomGame {
    correctStreak = 0;
    wrongStreak = 0;
    movementPaused = false;
    constructor() {
        this.player = {
            x: 40,
            y: 40,
            element: document.getElementById('player'),
        };

        this.currentRoom = 1;
        this.maxRooms = rooms.length;
        this.foundDigits = 0;
        this.passwordLength = 5;
        this.score = 0;
        this.timeLeft = 600;
        this.gameRunning = true;
        this.roomData = {};
        this.currentPassword = [];
        this.newsItems = [];

        // CORREÇÃO 1: Usando o seletor correto para o ID 'room-title'
        this.h1Title = document.getElementById('room-title');
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

    // CORREÇÃO 2: Mantida a versão correta da função e removida a duplicada
    updateRoomInfo() {
        const currentRoomData = rooms.find(room => room.id === this.currentRoom);
        const roomName = currentRoomData ? currentRoomData.name : `Sala ${this.currentRoom}`;

        // Atualiza o título H1 e a informação da sala
        if (this.h1Title) {
            this.h1Title.textContent = `Escape Room - ${roomName}`;
        }
        document.getElementById('room-info').textContent = roomName;
    }

    initializeRoom() {
        this.currentPassword = Array(this.passwordLength).fill('_');
        this.foundDigits = 0;
        this.updatePasswordDisplay();
        this.spawnNewsItems(); // Esta função agora existe
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
        switch (e.key) {
            case 'ArrowLeft': this.keys.left = true; e.preventDefault(); break;
            case 'ArrowRight': this.keys.right = true; e.preventDefault(); break;
            case 'ArrowUp': this.keys.up = true; e.preventDefault(); break;
            case 'ArrowDown': this.keys.down = true; e.preventDefault(); break;
        }
    }

    handleKeyUp(e) {
        switch (e.key) {
            case 'ArrowLeft': this.keys.left = false; break;
            case 'ArrowRight': this.keys.right = false; break;
            case 'ArrowUp': this.keys.up = false; break;
            case 'ArrowDown': this.keys.down = false; break;
        }
    }

    updatePlayer() {
        if (this.movementPaused) return;
        const speed = 4;
        let moved = false;

        if (this.keys.left && this.player.x > 5) { this.player.x -= speed; moved = true; }
        if (this.keys.right && this.player.x < this.canvas.offsetWidth - 85) { this.player.x += speed; moved = true; }
        if (this.keys.up && this.player.y > 5) { this.player.y -= speed; moved = true; }
        if (this.keys.down && this.player.y < this.canvas.offsetHeight - 45) { this.player.y += speed; moved = true; }

        if (moved) {
            this.player.element.style.left = this.player.x + 'px';
            this.player.element.style.top = this.player.y + 'px';
        }
    }

    // CORREÇÃO 3: Função que faltava foi adicionada
    spawnNewsItems() {
        const container = document.getElementById('news-items');
        container.innerHTML = ''; // Limpa itens antigos
        this.newsItems = [];

        const roomQuestions = this.roomData[`room${this.currentRoom}`];
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

        // Lógica de spawn aleatório em PORCENTAGEM para TODOS os itens
        // Gera um valor entre 10% e 90% para não nascer colado nas bordas
        const pos = {
            x: 10 + Math.random() * 60,
            y: 10 + Math.random() * 70
        };

        // Aplica o estilo usando a unidade de porcentagem '%'
        newsItem.style.left = pos.x + '%';
        newsItem.style.top = pos.y + '%';
        newsItem.dataset.questionId = questionData.id;

        container.appendChild(newsItem);

        // Armazena a posição em porcentagem para o cálculo de colisão
        this.newsItems.push({
            element: newsItem,
            xPercent: pos.x,
            yPercent: pos.y,
            questionData: questionData,
            collected: false
        });
    }

    checkCollisions() {
        this.newsItems.forEach((item, index) => {
            if (item.collected) return;

            // Dimensões dos elementos (do CSS)
            const playerWidth = 35;
            const playerHeight = 35;
            const itemWidth = 25;
            const itemHeight = 25;

            // Calcula a posição do item em pixels no momento da colisão
            const itemPixelX = (item.xPercent / 100) * this.canvas.offsetWidth;
            const itemPixelY = (item.yPercent / 100) * this.canvas.offsetHeight;

            // Calcula a coordenada do CENTRO do jogador
            const playerCenterX = this.player.x + playerWidth / 2;
            const playerCenterY = this.player.y + playerHeight / 2;

            // Calcula a coordenada do CENTRO do item de notícia
            const itemCenterX = itemPixelX + itemWidth / 2;
            const itemCenterY = itemPixelY + itemHeight / 2;

            // Calcula a distância entre os dois PONTOS CENTRAIS
            const distance = Math.sqrt(
                Math.pow(playerCenterX - itemCenterX, 2) +
                Math.pow(playerCenterY - itemCenterY, 2)
            );

            // Define a distância mínima para colisão (soma dos raios dos dois objetos)
            const collisionThreshold = (playerWidth / 2) + (itemWidth / 2); // Aprox. 30

            if (distance < collisionThreshold) {
                this.showNewsModal(item.questionData, index);
            }
        });
    }


    showNewsModal(questionData, itemIndex) {
        this.currentQuestionIndex = itemIndex;
        document.getElementById('modal-news').textContent = questionData.text;
        document.getElementById('modal').classList.remove('hidden');
        this.movementPaused = true;
    }

    answerQuestion(userSaysFake) {
        const item = this.newsItems[this.currentQuestionIndex];
        const questionData = item.questionData;
        const isCorrect = userSaysFake === questionData.isFake;

        if (isCorrect) {
            this.score += 10;
            this.addDigitToPassword(questionData.digit);
            item.element.remove();
            item.collected = true;
            this.correctStreak = (this.correctStreak || 0) + 1;
            let bonus = 0;
            // Bônus para streaks maiores
            const streakBonuses = [3,5,7,10,12,15,20,25,30,40,50];
            if (streakBonuses.includes(this.correctStreak)) {
                bonus = this.correctStreak * 5;
                this.score += bonus;
                this.showFeedback(`Correto! +10 pontos. Número ${questionData.digit} adicionado à senha!\nBônus de streak: +${bonus} pontos!`, 'correct');
            } else {
                this.showFeedback(`Correto! +10 pontos. Número ${questionData.digit} adicionado à senha!`, 'correct');
            }
        } else {
            this.wrongStreak = (this.wrongStreak || 0) + 1;
            this.correctStreak = 0;
            const penalty = this.wrongStreak * 5;
            this.timeLeft = Math.max(0, this.timeLeft - penalty);
            this.showFeedback(`${questionData.explanation}\nTempo perdido: -${penalty} segundos!`, 'incorrect');
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
                this.door.classList.add('unlocked');
                document.getElementById('password-hint').textContent = 'Senha completa! Vá até a porta para avançar!';
            }
        }
    }

    updatePasswordDisplay() {
        document.getElementById('password-digits').textContent = this.currentPassword.join(' ');
    }

    tryOpenDoor() {
        if (this.isPlayerCollidingWithDoor() && this.foundDigits === this.passwordLength) {
            if (this.currentRoom < this.maxRooms) {
                this.nextRoom();
            } else {
                this.winGame();
            }
        } else if (this.isPlayerCollidingWithDoor()) {
            this.showFeedback('Você precisa descobrir todos os números da senha primeiro!', 'incorrect');
        }
    }

    nextRoom() {
        // CORREÇÃO: Mover o jogador e resetar a senha IMEDIATAMENTE
        // Isso evita que o jogo entre em um loop de passar de fase.
        this.resetPlayerPosition();
    this.foundDigits = 0; // Essencial para invalidar a condição da porta na próxima checagem
    // Não zera mais o streak de penalidade ao mudar de sala

        this.currentRoom++;

        if (this.currentRoom > this.maxRooms) {
            this.winGame();
            return;
        }
        
        this.door.classList.remove('unlocked');
        this.showFeedback(`Parabéns! Você passou para a Sala ${this.currentRoom}!`, 'correct');

        // O resto da inicialização da sala pode acontecer após o atraso
        setTimeout(() => {
            this.initializeRoom();
        }, 1500);
    }

    winGame() {
        this.gameRunning = false;
        clearInterval(this.timerInterval);
        // Bônus por tempo restante: 1 ponto para cada 2 segundos restantes
        let timeBonus = Math.floor(this.timeLeft / 2);
        if (timeBonus > 0) {
            this.score += timeBonus;
        }
        const gameWin = document.createElement('div');
        gameWin.className = 'game-over';
        gameWin.innerHTML = `
            <h2>🎉 PARABÉNS!</h2>
            <p>Você escapou de todas as salas!</p>
            <p>Pontuação Final: ${this.score} pontos</p>
            <p>Tempo restante: ${Math.floor(this.timeLeft / 60)}:${(this.timeLeft % 60).toString().padStart(2, '0')}</p>
            ${timeBonus > 0 ? `<p>Bônus por tempo restante: +${timeBonus} pontos!</p>` : ''}
            <p>Você é um verdadeiro detetive de fake news!</p>
            <button class="restart-btn" onclick="location.reload()">Jogar Novamente</button>
        `;
        document.body.appendChild(gameWin);
    }

    showFeedback(message, type) {
        // ... (seu código de feedback, sem alterações)
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

    startTimer() {
        this.timerInterval = setInterval(() => {
            if (!this.gameRunning) return;
            this.timeLeft--;
            const minutes = Math.floor(this.timeLeft / 60);
            const seconds = this.timeLeft % 60;
            document.getElementById('timer').textContent = `Tempo: ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            if (this.timeLeft <= 0) this.endGame('Tempo esgotado!');
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
    
    isPlayerCollidingWithDoor() {
        const playerBounds = this.player.element.getBoundingClientRect();
        const doorBounds = this.door.getBoundingClientRect();
        return (
            playerBounds.right > doorBounds.left && playerBounds.left < doorBounds.right &&
            playerBounds.bottom > doorBounds.top && playerBounds.top < doorBounds.bottom
        );
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
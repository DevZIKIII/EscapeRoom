# 🎮 Escape Room - Caçador de Fake News v2.0

## 📋 Estrutura de Arquivos

```
escape-room/
│
├── index.html
├── css/
│   └── styles.css
├── js/
│   ├── main.js
│   ├── game.js
│   └── rooms.js
├── data/
│   └── questions.json
└── sounds/
    ├── collect.mp3
    ├── correct.mp3
    ├── wrong.mp3
    ├── powerup.mp3
    ├── unlock.mp3
    └── background.mp3
```

## 🔧 Melhorias Implementadas

### ✅ Correções Realizadas
1. **UTF-8 Corrigido**: Todos os caracteres especiais agora aparecem corretamente
2. **Sistema de Som**: Feedback sonoro para todas as ações
3. **Tutorial Inicial**: Explicação completa das mecânicas ao iniciar
4. **Animações do Personagem**: Indicadores visuais de direção do movimento
5. **Dificuldade Progressiva**: Cada sala fica mais desafiadora

### 🎒 Sistema de Mochila (Novo!)
- **5 tipos de itens colecionáveis**:
  - ⏰ Relógio: +30 segundos
  - 💡 Lupa: Revela dicas nas perguntas
  - 🛡️ Escudo: Protege de 1 penalidade
  - ⚡ Velocidade: Movimento 2x mais rápido
  - 🎯 Radar: Mostra todos os itens

### 🌟 Novas Funcionalidades
- **Power-ups espalhados pelas salas**
- **Sistema de streaks com bônus**
- **Efeitos visuais e partículas**
- **Barra de dificuldade visual**
- **Pausar com ESC**
- **Mutar som com M**
- **Indicador de sequência de acertos**

## 🚀 Como Implementar

### Passo 1: Criar os Arquivos de Som
Como os arquivos de áudio não podem ser criados via código, você precisa:

1. **Opção A - Usar sons gratuitos**:
   ```javascript
   // Adicione estes links no HTML como fontes alternativas
   const soundUrls = {
     collect: "https://www.soundjay.com/misc/bell-ringing-05.wav",
     correct: "https://www.soundjay.com/misc/bell-ringing-01.wav",
     wrong: "https://www.soundjay.com/misc/fail-buzzer-02.wav"
   };
   ```

2. **Opção B - Criar sons simples com Web Audio API**:
   ```javascript
   // Adicione este código no SoundManager
   createSimpleSound(frequency, duration) {
     const audioContext = new (window.AudioContext || window.webkitAudioContext)();
     const oscillator = audioContext.createOscillator();
     const gainNode = audioContext.createGain();
     
     oscillator.connect(gainNode);
     gainNode.connect(audioContext.destination);
     
     oscillator.frequency.value = frequency;
     oscillator.type = 'sine';
     
     gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
     gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
     
     oscillator.start(audioContext.currentTime);
     oscillator.stop(audioContext.currentTime + duration);
   }
   ```

### Passo 2: Configurar o Servidor Local
```bash
# Python 3
python -m http.server 8000

# Node.js
npx http-server

# Acesse: http://localhost:8000
```

## 🎯 Funcionalidades Futuras Sugeridas

### 📊 Sistema de Ranking Online
```javascript
class OnlineRanking {
  async saveScore(playerName, score, roomsCompleted) {
    const data = {
      name: playerName,
      score: score,
      rooms: roomsCompleted,
      date: new Date().toISOString()
    };
    
    // Enviar para API
    await fetch('https://sua-api/ranking', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
  
  async getTopScores() {
    const response = await fetch('https://sua-api/ranking/top10');
    return await response.json();
  }
}
```

### 🎨 Sistema de Skins/Avatares
```javascript
class AvatarSystem {
  avatars = {
    detective: { emoji: '🕵️', unlocked: true },
    scientist: { emoji: '👨‍🔬', unlocked: false, requirement: 'Complete 3 salas' },
    professor: { emoji: '👨‍🏫', unlocked: false, requirement: 'Score 500+' },
    ninja: { emoji: '🥷', unlocked: false, requirement: 'Sem erros em 1 sala' },
    robot: { emoji: '🤖', unlocked: false, requirement: 'Colete 10 power-ups' }
  };
  
  unlock(avatarId) {
    if (this.checkRequirement(avatarId)) {
      this.avatars[avatarId].unlocked = true;
      localStorage.setItem('unlockedAvatars', JSON.stringify(this.avatars));
    }
  }
}
```

### 🏆 Sistema de Conquistas
```javascript
class AchievementSystem {
  achievements = [
    { id: 'first_room', name: 'Primeira Porta', icon: '🚪', condition: 'Complete 1 sala' },
    { id: 'speed_run', name: 'Velocista', icon: '⚡', condition: 'Complete sala em < 1 min' },
    { id: 'perfect', name: 'Perfeito', icon: '💯', condition: '100% acertos em uma sala' },
    { id: 'collector', name: 'Colecionador', icon: '🎒', condition: 'Colete 20 itens' },
    { id: 'survivor', name: 'Sobrevivente', icon: '🛡️', condition: 'Complete com < 10s' }
  ];
  
  checkAchievements(gameState) {
    this.achievements.forEach(achievement => {
      if (!achievement.unlocked && this.checkCondition(achievement, gameState)) {
        this.unlock(achievement);
        this.showNotification(achievement);
      }
    });
  }
}
```

### 🌐 Modo Multiplayer Local
```javascript
class MultiplayerMode {
  constructor() {
    this.players = [
      { id: 1, score: 0, position: {x: 40, y: 40}, controls: 'arrows' },
      { id: 2, score: 0, position: {x: 100, y: 40}, controls: 'wasd' }
    ];
  }
  
  handleControls(event) {
    // Player 1: Arrows
    // Player 2: WASD
    // Competição ou cooperação
  }
}
```

### 📱 Controles Touch para Mobile
```javascript
class TouchControls {
  constructor(game) {
    this.game = game;
    this.joystick = this.createJoystick();
    this.setupTouchEvents();
  }
  
  createJoystick() {
    const joystick = document.createElement('div');
    joystick.className = 'touch-joystick';
    joystick.innerHTML = `
      <div class="joystick-base">
        <div class="joystick-stick"></div>
      </div>
    `;
    document.body.appendChild(joystick);
    return joystick;
  }
  
  setupTouchEvents() {
    this.joystick.addEventListener('touchmove', (e) => {
      const touch = e.touches[0];
      const rect = this.joystick.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      const deltaX = touch.clientX - centerX;
      const deltaY = touch.clientY - centerY;
      
      // Converter para movimento do jogador
      this.game.keys.left = deltaX < -20;
      this.game.keys.right = deltaX > 20;
      this.game.keys.up = deltaY < -20;
      this.game.keys.down = deltaY > 20;
    });
  }
}
```

### 🎲 Modo Desafio Diário
```javascript
class DailyChallenge {
  constructor() {
    this.today = new Date().toDateString();
    this.seed = this.generateSeed(this.today);
  }
  
  generateSeed(dateString) {
    // Gerar seed baseado na data para todos terem o mesmo desafio
    return dateString.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  }
  
  getDailyRooms() {
    // Usar seed para gerar sequência única de salas
    const rng = new SeededRandom(this.seed);
    return rooms.sort(() => rng.next() - 0.5).slice(0, 5);
  }
}
```

### 🎵 Sistema de Música Dinâmica
```javascript
class DynamicMusic {
  constructor() {
    this.tracks = {
      menu: 'menu-theme.mp3',
      gameplay: ['room1.mp3', 'room2.mp3'],
      danger: 'low-time.mp3',
      victory: 'win.mp3'
    };
  }
  
  updateMusic(gameState) {
    if (gameState.timeLeft < 60) {
      this.playTrack('danger');
    } else {
      const roomTrack = this.tracks.gameplay[gameState.currentRoom % this.tracks.gameplay.length];
      this.playTrack(roomTrack);
    }
  }
}
```

### 💾 Sistema de Save/Load
```javascript
class SaveSystem {
  saveGame(gameState) {
    const saveData = {
      room: gameState.currentRoomIndex,
      score: gameState.score,
      time: gameState.timeLeft,
      inventory: gameState.inventory.items,
      password: gameState.currentPassword,
      timestamp: Date.now()
    };
    
    localStorage.setItem('escapeRoomSave', JSON.stringify(saveData));
  }
  
  loadGame() {
    const saveData = localStorage.getItem('escapeRoomSave');
    if (saveData) {
      return JSON.parse(saveData);
    }
    return null;
  }
  
  autoSave(gameState) {
    setInterval(() => this.saveGame(gameState), 30000); // Auto-save cada 30s
  }
}
```

### 🌍 Modo História com Narrativa
```javascript
class StoryMode {
  chapters = [
    {
      id: 1,
      title: "O Início da Investigação",
      intro: "Você é um detetive digital contratado para investigar uma rede de fake news...",
      rooms: ['Biologia', 'Química'],
      boss: { name: 'Dr. Desinformação', health: 100, questions: 10 }
    },
    {
      id: 2,
      title: "A Conspiração se Aprofunda",
      intro: "As pistas levam a uma organização maior...",
      rooms: ['História', 'Geografia'],
      boss: { name: 'Baronesa das Mentiras', health: 150, questions: 15 }
    }
  ];
  
  showCutscene(chapter) {
    // Mostrar narrativa entre capítulos
    const cutscene = document.createElement('div');
    cutscene.className = 'cutscene';
    cutscene.innerHTML = `
      <h2>${chapter.title}</h2>
      <p>${chapter.intro}</p>
      <button onclick="this.startChapter(${chapter.id})">Continuar</button>
    `;
  }
}
```

## 📝 Notas de Implementação

1. **Performance**: O jogo usa `requestAnimationFrame` para animações suaves
2. **Responsividade**: CSS adaptado para telas menores
3. **Acessibilidade**: Suporte para teclado e futuro suporte para leitores de tela
4. **Modularidade**: Código organizado em classes para fácil manutenção

## 🐛 Solução de Problemas Comuns

### Problema: Caracteres especiais aparecem errados
**Solução**: Certifique-se de que todos os arquivos estão salvos em UTF-8

### Problema: Sons não tocam
**Solução**: Navegadores modernos bloqueiam autoplay. O usuário precisa interagir primeiro

### Problema: Jogo não carrega
**Solução**: Verifique se está rodando em servidor local (não file:///)

## 📄 Licença
Este projeto é educacional e open source. Sinta-se livre para modificar e distribuir!

## 👨‍💻 Créditos
Desenvolvido como projeto educacional para conscientização sobre fake news.

---
**Versão**: 2.0
**Última Atualização**: 2024
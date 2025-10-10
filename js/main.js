import { EscapeRoomGame } from './game.js';

document.addEventListener('DOMContentLoaded', () => {
    console.log('🎮 Escape Room - Caçador de Fake News');
    
    const startMenu = document.getElementById('start-menu');
    const menuContent = document.querySelector('.menu-content');
    const countdownScreen = document.getElementById('countdown-screen');
    const gameRoot = document.getElementById('game-root');
    const normalModeBtn = document.getElementById('normal-mode-btn');
    const accessibilityModeBtn = document.getElementById('accessibility-mode-btn');

    const initializeGame = (options) => {
        startMenu.classList.add('hidden');
        gameRoot.classList.remove('hidden');
        try {
            new EscapeRoomGame(options);
            console.log(`✅ Jogo iniciado em modo ${options.accessibility ? 'Acessibilidade' : 'Normal'}!`);
        } catch (error)
        {
            console.error('❌ Erro ao iniciar o jogo:', error);
        }
    };

    normalModeBtn.addEventListener('click', () => {
        initializeGame({ accessibility: false });
    });

    // --- LÓGICA ATUALIZADA PARA O BOTÃO DE ACESSIBILIDADE ---
    accessibilityModeBtn.addEventListener('click', () => {
        // Esconde o menu principal e mostra a tela de contagem
        if (menuContent) menuContent.classList.add('hidden');
        if (countdownScreen) countdownScreen.classList.remove('hidden');

        let countdown = 10;
        const countdownTimerElement = document.getElementById('countdown-timer');

        // Atualiza o número na tela a cada segundo
        const interval = setInterval(() => {
            countdown--;
            if (countdownTimerElement) {
                countdownTimerElement.textContent = countdown;
            }
            if (countdown <= 0) {
                clearInterval(interval);
            }
        }, 1000);

        // Inicia o jogo após 10 segundos
        setTimeout(() => {
            initializeGame({ accessibility: true });
        }, 10000);
    });
});
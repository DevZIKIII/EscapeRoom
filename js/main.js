// main.js - Arquivo principal do Escape Room
import { startGame } from './game.js';

// Aguardar o carregamento completo do DOM
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎮 Escape Room - Caçador de Fake News');
    console.log('📚 Versão 2.0 - Com sistema de mochila e power-ups');
    console.log('🕵️ Iniciando jogo...');
    
    // Verificar suporte do navegador
    if (!checkBrowserSupport()) {
        alert('Seu navegador pode não suportar todos os recursos do jogo. Recomendamos usar Chrome, Firefox ou Edge atualizados.');
    }
    
    // Inicializar o jogo
    try {
        startGame();
        console.log('✅ Jogo iniciado com sucesso!');
    } catch (error) {
        console.error('❌ Erro ao iniciar o jogo:', error);
        showErrorMessage();
    }
});

// Verificar suporte do navegador
function checkBrowserSupport() {
    // Verificar suporte para ES6
    try {
        eval('"use strict"; class Test {}');
        eval('"use strict"; const test = () => {};');
    } catch (e) {
        return false;
    }
    
    // Verificar LocalStorage
    try {
        const test = 'test';
        localStorage.setItem(test, test);
        localStorage.removeItem(test);
    } catch (e) {
        return false;
    }
    
    return true;
}

// Mostrar mensagem de erro
function showErrorMessage() {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, #e74c3c, #c0392b);
        color: white;
        padding: 30px;
        border-radius: 15px;
        text-align: center;
        z-index: 10000;
        box-shadow: 0 10px 40px rgba(0,0,0,0.5);
    `;
    
    errorDiv.innerHTML = `
        <h2>⚠️ Erro ao Carregar o Jogo</h2>
        <p>Ocorreu um problema ao iniciar o jogo.</p>
        <p>Por favor, verifique:</p>
        <ul style="text-align: left; margin: 15px 0;">
            <li>Se todos os arquivos foram carregados corretamente</li>
            <li>Se o arquivo questions.json está na pasta data/</li>
            <li>Se seu navegador está atualizado</li>
        </ul>
        <button onclick="location.reload()" style="
            padding: 10px 20px;
            background: white;
            color: #e74c3c;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-weight: bold;
            margin-top: 10px;
        ">Tentar Novamente</button>
    `;
    
    document.body.appendChild(errorDiv);
}

// Adicionar listener para erros não capturados
window.addEventListener('error', (event) => {
    console.error('Erro global capturado:', event.error);
});

// Prevenir que o jogo continue rodando quando a aba não está ativa
document.addEventListener('visibilitychange', () => {
    if (window.currentGame) {
        if (document.hidden) {
            // Pausar automaticamente quando a aba perde o foco
            if (window.currentGame.gameRunning) {
                window.currentGame.togglePause();
                console.log('🔸 Jogo pausado automaticamente (aba inativa)');
            }
        }
    }
});

// Adicionar atalhos de teclado globais
document.addEventListener('keydown', (e) => {
    if (!window.currentGame) return;
    
    // ESC para pausar/retomar
    if (e.key === 'Escape') {
        window.currentGame.togglePause();
    }
    
    // M para mutar/desmutar som
    if (e.key.toLowerCase() === 'm') {
        const soundBtn = document.getElementById('sound-btn');
        soundBtn?.click();
    }
});

console.log('📁 Arquivo main.js carregado com sucesso');
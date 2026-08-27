/**
 * MAIN.JS
 * Inicialização e orquestração do sistema
 */

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Iniciando Pesquisa de Preço...');
    
    // Garante que o loading está escondido inicialmente
    const loadingSpinner = document.getElementById('loadingSpinner');
    if (loadingSpinner) {
        loadingSpinner.style.display = 'none';
    }
    
    // VERIFICA AUTENTICAÇÃO
    if (!auth.estaAutenticado()) {
        console.log('Usuário não autenticado, mostrando login...');
        uiLogin.mostrar();
        return;
    }
    
    console.log('Usuário autenticado, carregando aplicação...');
    
    // Mostra elementos da aplicação
    document.getElementById('appHeader').style.display = 'block';
    document.getElementById('appMain').style.display = 'block';
    
    // Adiciona evento de logout
    document.getElementById('btnLogout').addEventListener('click', () => {
        if (confirm('Deseja sair do sistema?')) {
            auth.logout();
        }
    });
    
    try {
        // Inicializa a UI
        ui.initialize();
        
        // Carrega dados dos produtos
        await ui.carregarDados();
        
        // Garante que o loading está escondido
        ui.showLoading(false);
        
        // Foca no input de código APENAS UMA VEZ
        const inputCodigo = document.getElementById('inputCodigo');
        if (inputCodigo) {
            inputCodigo.focus({ preventScroll: true });
        }
        
        console.log('Sistema iniciado com sucesso!');
        
        // Mostra mensagem de boas-vindas
        setTimeout(() => {
            ui.showToast('Bem-vindo, PriceFribal!', 'success');
        }, 500);
        
    } catch (error) {
        console.error('Erro ao inicializar sistema:', error);
        ui.showLoading(false);
        ui.showToast('Erro ao inicializar sistema!', 'error');
    }
});

// Tratamento global de erros
window.addEventListener('error', (event) => {
    console.error('Erro global:', event.error);
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) {
        spinner.style.display = 'none';
    }
});

// Tratamento de promessas não capturadas
window.addEventListener('unhandledrejection', (event) => {
    console.error('Promessa não capturada:', event.reason);
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) {
        spinner.style.display = 'none';
    }
});

// Previne zoom em inputs no iOS
document.addEventListener('touchstart', (e) => {
    if (e.target.tagName === 'INPUT' && e.target.type === 'text') {
        e.target.style.fontSize = '16px';
    }
}, { passive: true });

// Fallback: esconde loading após 5 segundos
setTimeout(() => {
    const spinner = document.getElementById('loadingSpinner');
    if (spinner && spinner.style.display !== 'none') {
        console.warn('Forçando esconder loading após timeout');
        spinner.style.display = 'none';
    }
}, 5000);

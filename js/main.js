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
        // Inicializa a UI (sem carregar dados)
        ui.initialize();
        
        // Foca no input de código
        const inputCodigo = document.getElementById('inputCodigo');
        if (inputCodigo) {
            inputCodigo.focus({ preventScroll: true });
        }
        
        console.log('Sistema iniciado com sucesso!');
        
        setTimeout(() => {
            ui.showToast('Bem-vindo, PriceFribal!', 'success');
        }, 500);
        
    } catch (error) {
        console.error('Erro ao inicializar sistema:', error);
        ui.showToast('Erro ao inicializar sistema!', 'error');
    }
});

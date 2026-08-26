/**
 * MAIN.JS
 * Inicialização e orquestração do sistema
 */

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Iniciando Pesquisa de Preço...');
    
    try {
        // Inicializa a UI
        ui.initialize();
        
        // Carrega dados dos produtos
        await ui.carregarDados();
        
        // Foca no input de código
        document.getElementById('inputCodigo').focus();
        
        // Configura autofocus contínuo
        document.addEventListener('click', () => {
            const inputCodigo = document.getElementById('inputCodigo');
            const inputBusca = document.getElementById('inputBusca');
            
            // Se não está editando, foca no input de código
            if (!ui.isEditando && 
                document.activeElement !== inputBusca &&
                !document.querySelector('.editable-input:not(.hidden)')) {
                inputCodigo.focus();
            }
        });
        
        console.log('Sistema iniciado com sucesso!');
        
        // Mostra mensagem de boas-vindas
        setTimeout(() => {
            ui.showToast('Sistema pronto para uso!', 'info');
        }, 1000);
        
    } catch (error) {
        console.error('Erro ao inicializar sistema:', error);
        ui.showToast('Erro ao inicializar sistema!', 'error');
    }
});

// Tratamento global de erros
window.addEventListener('error', (event) => {
    console.error('Erro global:', event.error);
});

// Tratamento de promessas não capturadas
window.addEventListener('unhandledrejection', (event) => {
    console.error('Promessa não capturada:', event.reason);
});

// Previne zoom em inputs no iOS
document.addEventListener('touchstart', (e) => {
    if (e.target.tagName === 'INPUT' && e.target.type === 'text') {
        e.target.style.fontSize = '16px';
    }
}, { passive: true });
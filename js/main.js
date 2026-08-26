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
        
        // Garante que o loading está escondido
        ui.showLoading(false);
        
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
            ui.showToast('Sistema pronto para uso!', 'success');
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
    // Garante que o loading é escondido em caso de erro
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) {
        spinner.classList.add('hidden');
    }
});

// Tratamento de promessas não capturadas
window.addEventListener('unhandledrejection', (event) => {
    console.error('Promessa não capturada:', event.reason);
    // Garante que o loading é escondido
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) {
        spinner.classList.add('hidden');
    }
});

// Previne zoom em inputs no iOS
document.addEventListener('touchstart', (e) => {
    if (e.target.tagName === 'INPUT' && e.target.type === 'text') {
        e.target.style.fontSize = '16px';
    }
}, { passive: true });
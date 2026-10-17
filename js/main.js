/**
 * MAIN.JS
 * Inicialização do sistema
 */

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Iniciando Pesquisa de Preço...');
    
    // Esconde o loading inicial
    const loadingSpinner = document.getElementById('loadingSpinner');
    if (loadingSpinner) loadingSpinner.style.display = 'none';
    
    // Verifica se o Auth está carregado
    if (typeof auth === 'undefined' || !auth) {
        console.error('❌ Auth não definido.');
        return;
    }

    // VERIFICA AUTENTICAÇÃO
    if (!auth.estaAutenticado()) {
        console.log('🔒 Usuário não autenticado. Abrindo tela de login...');
        uiLogin.mostrar();
        return;
    }
    
    console.log('✅ Usuário autenticado. Carregando aplicação...');
    
    try {
        // Mostra a aplicação
        document.getElementById('appHeader').style.display = 'block';
        document.getElementById('appMain').style.display = 'block';
        
        // Inicializa UI (vincula eventos e carrega histórico local)
        ui.initialize();
        
        // Adiciona evento de logout
        const btnLogout = document.getElementById('btnLogout');
        if (btnLogout) {
            btnLogout.addEventListener('click', () => {
                if (confirm('Deseja sair do sistema?')) auth.logout();
            });
        }

        // Pré-carrega as bibliotecas do Google (para escrita rápida)
        // Não trava o carregamento da tela se falhar
        api.initAuth().then(() => {
            console.log('☁️ Google APIs prontas para uso.');
        }).catch(err => {
            console.warn('⚠️ Aviso: Não foi possível pré-carregar as APIs do Google.', err);
        });

        // Foca no input de código
        const inputCodigo = document.getElementById('inputCodigo');
        if (inputCodigo) inputCodigo.focus({ preventScroll: true });
        
        console.log('🎉 Sistema iniciado com sucesso!');
        
        setTimeout(() => {
            ui.showToast('Bem-vindo, PriceFribal!', 'success');
        }, 500);
        
    } catch (error) {
        console.error('❌ Erro ao inicializar sistema:', error);
        ui.showToast('Erro ao inicializar sistema!', 'error');
    }
});

/**
 * UI-LOGIN.JS
 * Interface de login
 */

class UILogin {
    constructor() {
        this.loginOverlay = null;
        this.usuarioInput = null;
        this.senhaInput = null;
    }

    /**
     * Cria overlay de login
     */
    criarOverlay() {
        // Remove overlay existente
        const overlayExistente = document.getElementById('loginOverlay');
        if (overlayExistente) {
            overlayExistente.remove();
        }

        // Cria novo overlay
        const overlay = document.createElement('div');
        overlay.id = 'loginOverlay';
        overlay.className = 'login-overlay';
        overlay.innerHTML = `
            <div class="login-container">
                <div class="login-header">
                    <i class="fas fa-lock"></i>
                    <h2>Área Restrita</h2>
                    <p>Faça login para continuar</p>
                </div>
                
                <form id="loginForm" class="login-form">
                    <div class="form-group">
                        <label for="loginUsuario">
                            <i class="fas fa-user"></i>
                            Usuário
                        </label>
                        <input 
                            type="text" 
                            id="loginUsuario" 
                            class="login-input" 
                            placeholder="Digite seu usuário"
                            autocomplete="username"
                            required
                        >
                    </div>
                    
                    <div class="form-group">
                        <label for="loginSenha">
                            <i class="fas fa-key"></i>
                            Senha
                        </label>
                        <input 
                            type="password" 
                            id="loginSenha" 
                            class="login-input" 
                            placeholder="Digite sua senha"
                            autocomplete="current-password"
                            required
                        >
                    </div>
                    
                    <button type="submit" class="login-button">
                        <i class="fas fa-sign-in-alt"></i>
                        Entrar
                    </button>
                    
                    <div id="loginError" class="login-error hidden"></div>
                </form>
            </div>
        `;

        document.body.appendChild(overlay);
        
        this.loginOverlay = overlay;
        this.usuarioInput = document.getElementById('loginUsuario');
        this.senhaInput = document.getElementById('loginSenha');
        
        // Adiciona evento de submit
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.fazerLogin();
        });
        
        // Foca no campo de usuário
        setTimeout(() => this.usuarioInput.focus(), 100);
    }

    /**
     * Mostra overlay de login
     */
    mostrar() {
        if (!this.loginOverlay) {
            this.criarOverlay();
        }
        this.loginOverlay.style.display = 'flex';
    }

    /**
     * Esconde overlay de login
     */
    esconder() {
        if (this.loginOverlay) {
            this.loginOverlay.style.display = 'none';
        }
    }

    /**
     * Faz login
     */
    async fazerLogin() {
        try {
            const usuario = auth.sanitizarInput(this.usuarioInput.value);
            const senha = this.senhaInput.value;
            
            if (!usuario || !senha) {
                this.mostrarErro('Preencha todos os campos!');
                return;
            }
            
            // Desabilita botão durante verificação
            const botao = document.querySelector('.login-button');
            botao.disabled = true;
            botao.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando...';
            
            // Faz login
            await auth.login(usuario, senha);
            
            // Login bem-sucedido
            this.esconder();
            ui.showToast('Login realizado com sucesso!', 'success');
            
            // Inicializa aplicação
            await ui.carregarDados();
            
        } catch (error) {
            this.mostrarErro(error.message);
            
            // Verifica bloqueio
            const tempoBloqueio = auth.obterTempoBloqueio();
            if (tempoBloqueio > 0) {
                const minutos = Math.ceil(tempoBloqueio / 60000);
                this.mostrarErro(`Muitas tentativas. Aguarde ${minutos} minutos.`);
            }
            
            // Reabilita botão
            const botao = document.querySelector('.login-button');
            botao.disabled = false;
            botao.innerHTML = '<i class="fas fa-sign-in-alt"></i> Entrar';
        }
    }

    /**
     * Mostra erro de login
     * @param {string} mensagem - Mensagem de erro
     */
    mostrarErro(mensagem) {
        const erroElement = document.getElementById('loginError');
        erroElement.textContent = mensagem;
        erroElement.classList.remove('hidden');
        
        // Esconde após 3 segundos
        setTimeout(() => {
            erroElement.classList.add('hidden');
        }, 3000);
    }
}

// Instância global de login
const uiLogin = new UILogin();

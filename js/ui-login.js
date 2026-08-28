/**
 * UI-LOGIN.JS
 * Interface de login e autenticação
 */

class UILogin {
    constructor() {
        this.loginOverlay = null;
        this.usuarioInput = null;
        this.senhaInput = null;
        this.isLoggingIn = false;
    }

    /**
     * Cria overlay de login
     */
    criarOverlay() {
        const overlayExistente = document.getElementById('loginOverlay');
        if (overlayExistente) {
            overlayExistente.remove();
        }

        const overlay = document.createElement('div');
        overlay.id = 'loginOverlay';
        overlay.className = 'login-overlay';
        overlay.innerHTML = `
            <div class="login-container">
                <div class="login-header">
                    <div class="login-logo">
                        <i class="fas fa-barcode"></i>
                    </div>
                    <h2>Pesquisa de Preço</h2>
                    <p>Área Restrita - Acesso Autorizado</p>
                </div>
                
                <form id="loginForm" class="login-form" autocomplete="off">
                    <div class="form-group">
                        <label for="loginUsuario">
                            <i class="fas fa-user"></i>
                            Usuário
                        </label>
                        <div class="input-wrapper">
                            <i class="fas fa-user input-icon"></i>
                            <input 
                                type="text" 
                                id="loginUsuario" 
                                class="login-input" 
                                placeholder="Digite seu usuário"
                                autocomplete="username"
                                required
                            >
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="loginSenha">
                            <i class="fas fa-key"></i>
                            Senha
                        </label>
                        <div class="input-wrapper">
                            <i class="fas fa-lock input-icon"></i>
                            <input 
                                type="password" 
                                id="loginSenha" 
                                class="login-input" 
                                placeholder="Digite sua senha"
                                autocomplete="current-password"
                                required
                            >
                            <button type="button" class="toggle-password" id="togglePassword">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                    </div>
                    
                    <button type="submit" class="login-button" id="loginButton">
                        <i class="fas fa-sign-in-alt"></i>
                        Entrar
                    </button>
                    
                    <div id="loginError" class="login-error hidden"></div>
                </form>
                
                <div class="login-footer">
                    <p>
                        <i class="fas fa-shield-alt"></i>
                        Conexão segura
                    </p>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        
        this.loginOverlay = overlay;
        this.usuarioInput = document.getElementById('loginUsuario');
        this.senhaInput = document.getElementById('loginSenha');
        
        this.bindEvents();
        
        setTimeout(() => {
            if (this.usuarioInput) {
                this.usuarioInput.focus({ preventScroll: true });
            }
        }, 300);
    }

    /**
     * Liga eventos do formulário de login
     */
    bindEvents() {
        const form = document.getElementById('loginForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.fazerLogin();
            });
        }

        const togglePassword = document.getElementById('togglePassword');
        if (togglePassword) {
            togglePassword.addEventListener('click', () => {
                this.toggleSenha();
            });
        }

        if (this.usuarioInput) {
            this.usuarioInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    if (this.senhaInput) this.senhaInput.focus({ preventScroll: true });
                }
            });
        }

        if (this.senhaInput) {
            this.senhaInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.fazerLogin();
                }
            });
        }
    }

    /**
     * Mostra overlay de login
     */
    mostrar() {
        if (!this.loginOverlay) {
            this.criarOverlay();
        }
        
        this.loginOverlay.style.display = 'flex';
        
        setTimeout(() => {
            if (this.usuarioInput) {
                this.usuarioInput.focus({ preventScroll: true });
            }
        }, 300);
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
     * Alterna visibilidade da senha
     */
    toggleSenha() {
        const senhaInput = this.senhaInput;
        const toggleIcon = document.querySelector('#togglePassword i');
        
        if (senhaInput && toggleIcon) {
            if (senhaInput.type === 'password') {
                senhaInput.type = 'text';
                toggleIcon.className = 'fas fa-eye-slash';
            } else {
                senhaInput.type = 'password';
                toggleIcon.className = 'fas fa-eye';
            }
        }
    }

    /**
     * Faz login
     */
    async fazerLogin() {
        try {
            if (this.isLoggingIn) return;
            
            const usuario = auth.sanitizarInput(this.usuarioInput.value);
            const senha = this.senhaInput.value;
            
            if (!usuario) {
                this.mostrarErro('Digite o usuário!');
                this.usuarioInput.focus({ preventScroll: true });
                return;
            }
            
            if (!senha) {
                this.mostrarErro('Digite a senha!');
                this.senhaInput.focus({ preventScroll: true });
                return;
            }
            
            if (auth.estaBloqueado()) {
                const tempoBloqueio = auth.obterTempoBloqueio();
                const minutos = Math.ceil(tempoBloqueio / 60000);
                this.mostrarErro(`Muitas tentativas! Aguarde ${minutos} minutos.`);
                return;
            }
            
            this.isLoggingIn = true;
            const botao = document.getElementById('loginButton');
            botao.disabled = true;
            botao.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando...';
            
            await auth.login(usuario, senha);
            
            // Login bem-sucedido
            this.isLoggingIn = false;
            this.esconder();
            this.limparCampos();
            
            // Mostra aplicação
            this.mostrarAplicacao();
            
            // Inicializa UI com pré-carregamento
            this.inicializarAplicacao();
            
            ui.showToast('Login realizado com sucesso!', 'success');
            
        } catch (error) {
            console.error('Erro no login:', error);
            
            this.isLoggingIn = false;
            
            if (auth.estaBloqueado()) {
                const tempoBloqueio = auth.obterTempoBloqueio();
                const minutos = Math.ceil(tempoBloqueio / 60000);
                this.mostrarErro(`Muitas tentativas! Aguarde ${minutos} minutos.`);
            } else {
                this.mostrarErro(error.message || 'Erro ao fazer login');
            }
            
            const botao = document.getElementById('loginButton');
            if (botao) {
                botao.disabled = false;
                botao.innerHTML = '<i class="fas fa-sign-in-alt"></i> Entrar';
            }
            
            if (this.senhaInput) {
                this.senhaInput.value = '';
                this.senhaInput.focus({ preventScroll: true });
            }
        }
    }

    /**
     * Mostra aplicação após login
     */
    mostrarAplicacao() {
        const appHeader = document.getElementById('appHeader');
        const appMain = document.getElementById('appMain');
        
        if (appHeader) appHeader.style.display = 'block';
        if (appMain) appMain.style.display = 'block';
        
        const btnLogout = document.getElementById('btnLogout');
        if (btnLogout) {
            btnLogout.addEventListener('click', () => {
                this.confirmarLogout();
            });
        }
    }

    /**
     * Inicializa aplicação após login COM PRÉ-CARREGAMENTO
     */
    inicializarAplicacao() {
        try {
            // Inicializa a UI
            ui.initialize();
            
            // Mostra loading enquanto carrega os dados
            ui.showLoading(true);
            
            // PRÉ-CARREGA OS DADOS EM BACKGROUND
            api.preCarregar()
                .then(() => {
                    console.log('✅ Dados carregados em background com sucesso!');
                    ui.showLoading(false);
                    ui.showToast('Dados carregados!', 'success');
                })
                .catch((err) => {
                    console.warn('⚠️ Erro ao pré-carregar dados:', err);
                    ui.showLoading(false);
                    ui.showToast('Dados carregados parcialmente', 'warning');
                });
            
            // Foca no input de código
            const inputCodigo = document.getElementById('inputCodigo');
            if (inputCodigo) {
                inputCodigo.focus({ preventScroll: true });
            }
            
            console.log('Aplicação inicializada com sucesso!');
            
        } catch (error) {
            console.error('Erro ao inicializar aplicação:', error);
            ui.showLoading(false);
            ui.showToast('Erro ao inicializar!', 'error');
        }
    }

    /**
     * Confirma logout
     */
    confirmarLogout() {
        if (confirm('Deseja sair do sistema?')) {
            auth.logout();
        }
    }

    /**
     * Limpa campos do formulário
     */
    limparCampos() {
        if (this.usuarioInput) this.usuarioInput.value = '';
        if (this.senhaInput) {
            this.senhaInput.value = '';
            this.senhaInput.type = 'password';
        }
        
        const toggleIcon = document.querySelector('#togglePassword i');
        if (toggleIcon) toggleIcon.className = 'fas fa-eye';
    }

    /**
     * Mostra erro de login
     */
    mostrarErro(mensagem) {
        const erroElement = document.getElementById('loginError');
        
        if (!erroElement) return;
        
        erroElement.textContent = mensagem;
        erroElement.classList.remove('hidden');
        
        erroElement.style.animation = 'none';
        erroElement.offsetHeight;
        erroElement.style.animation = 'shake 0.3s ease';
        
        setTimeout(() => {
            erroElement.classList.add('hidden');
        }, 5000);
    }
}

// Instância global de login
const uiLogin = new UILogin();

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
                                autofocus
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
        
        // Adiciona eventos
        this.bindEvents();
        
        // Foca no campo de usuário
        setTimeout(() => {
            if (this.usuarioInput) {
                this.usuarioInput.focus();
            }
        }, 300);
    }

    /**
     * Liga eventos do formulário de login
     */
    bindEvents() {
        // Evento de submit do formulário
        const form = document.getElementById('loginForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.fazerLogin();
            });
        }

        // Evento de toggle de senha
        const togglePassword = document.getElementById('togglePassword');
        if (togglePassword) {
            togglePassword.addEventListener('click', () => {
                this.toggleSenha();
            });
        }

        // Evento de Enter nos campos
        if (this.usuarioInput) {
            this.usuarioInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.senhaInput.focus();
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

        // Previne clique fora do container
        this.loginOverlay.addEventListener('click', (e) => {
            if (e.target === this.loginOverlay) {
                // Não faz nada (mantém overlay aberto)
                this.mostrarErro('Faça login para continuar');
            }
        });
    }

    /**
     * Mostra overlay de login
     */
    mostrar() {
        if (!this.loginOverlay) {
            this.criarOverlay();
        }
        
        this.loginOverlay.style.display = 'flex';
        
        // Foca no campo de usuário
        setTimeout(() => {
            if (this.usuarioInput) {
                this.usuarioInput.focus();
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
        
        if (senhaInput.type === 'password') {
            senhaInput.type = 'text';
            toggleIcon.className = 'fas fa-eye-slash';
        } else {
            senhaInput.type = 'password';
            toggleIcon.className = 'fas fa-eye';
        }
    }

    /**
     * Faz login
     */
    async fazerLogin() {
        try {
            // Verifica se já está fazendo login
            if (this.isLoggingIn) {
                return;
            }
            
            const usuario = auth.sanitizarInput(this.usuarioInput.value);
            const senha = this.senhaInput.value;
            
            // Validações básicas
            if (!usuario) {
                this.mostrarErro('Digite o usuário!');
                this.usuarioInput.focus();
                return;
            }
            
            if (!senha) {
                this.mostrarErro('Digite a senha!');
                this.senhaInput.focus();
                return;
            }
            
            if (senha.length < 4) {
                this.mostrarErro('Senha muito curta!');
                this.senhaInput.focus();
                return;
            }
            
            // Verifica se está bloqueado
            if (auth.estaBloqueado()) {
                const tempoBloqueio = auth.obterTempoBloqueio();
                const minutos = Math.ceil(tempoBloqueio / 60000);
                this.mostrarErro(`Muitas tentativas! Aguarde ${minutos} minutos.`);
                return;
            }
            
            // Ativa estado de carregamento
            this.isLoggingIn = true;
            const botao = document.getElementById('loginButton');
            botao.disabled = true;
            botao.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando...';
            
            // Faz login
            await auth.login(usuario, senha);
            
            // Login bem-sucedido
            this.isLoggingIn = false;
            this.esconder();
            this.limparCampos();
            
            // Mostra aplicação
            this.mostrarAplicacao();
            
            // Inicializa UI e carrega dados
            await this.inicializarAplicacao();
            
            // Mostra toast de boas-vindas
            ui.showToast('Login realizado com sucesso!', 'success');
            
        } catch (error) {
            console.error('Erro no login:', error);
            
            this.isLoggingIn = false;
            
            // Verifica bloqueio
            if (auth.estaBloqueado()) {
                const tempoBloqueio = auth.obterTempoBloqueio();
                const minutos = Math.ceil(tempoBloqueio / 60000);
                this.mostrarErro(`Muitas tentativas! Aguarde ${minutos} minutos.`);
            } else {
                this.mostrarErro(error.message || 'Erro ao fazer login');
            }
            
            // Reabilita botão
            const botao = document.getElementById('loginButton');
            botao.disabled = false;
            botao.innerHTML = '<i class="fas fa-sign-in-alt"></i> Entrar';
            
            // Limpa senha
            this.senhaInput.value = '';
            this.senhaInput.focus();
        }
    }

    /**
     * Mostra aplicação após login
     */
    mostrarAplicacao() {
        const appHeader = document.getElementById('appHeader');
        const appMain = document.getElementById('appMain');
        
        if (appHeader) {
            appHeader.style.display = 'block';
        }
        
        if (appMain) {
            appMain.style.display = 'block';
        }
        
        // Adiciona evento de logout
        const btnLogout = document.getElementById('btnLogout');
        if (btnLogout) {
            btnLogout.addEventListener('click', () => {
                this.confirmarLogout();
            });
        }
    }

    /**
     * Inicializa aplicação após login
     */
    async inicializarAplicacao() {
        try {
            // Inicializa a UI
            ui.initialize();
            
            // Carrega dados
            await ui.carregarDados();
            
            // Garante que loading está escondido
            ui.showLoading(false);
            
            // Foca no input de código
            const inputCodigo = document.getElementById('inputCodigo');
            if (inputCodigo) {
                inputCodigo.focus({ preventScroll: true });
            }
            
            console.log('Aplicação inicializada com sucesso!');
            
        } catch (error) {
            console.error('Erro ao inicializar aplicação:', error);
            ui.showLoading(false);
            ui.showToast('Erro ao carregar dados!', 'error');
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
        if (this.usuarioInput) {
            this.usuarioInput.value = '';
        }
        if (this.senhaInput) {
            this.senhaInput.value = '';
            this.senhaInput.type = 'password';
        }
        
        // Reseta ícone de toggle
        const toggleIcon = document.querySelector('#togglePassword i');
        if (toggleIcon) {
            toggleIcon.className = 'fas fa-eye';
        }
    }

    /**
     * Mostra erro de login
     * @param {string} mensagem - Mensagem de erro
     */
    mostrarErro(mensagem) {
        const erroElement = document.getElementById('loginError');
        
        if (!erroElement) {
            console.error('Elemento loginError não encontrado');
            return;
        }
        
        erroElement.textContent = mensagem;
        erroElement.classList.remove('hidden');
        
        // Adiciona animação de shake
        erroElement.style.animation = 'none';
        erroElement.offsetHeight; // Força reflow
        erroElement.style.animation = 'shake 0.3s ease';
        
        // Esconde após 5 segundos
        setTimeout(() => {
            erroElement.classList.add('hidden');
        }, 5000);
    }

    /**
     * Esconde erro
     */
    esconderErro() {
        const erroElement = document.getElementById('loginError');
        if (erroElement) {
            erroElement.classList.add('hidden');
        }
    }
}

// Instância global de login
const uiLogin = new UILogin();

// Exporta para uso em outros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UILogin;
}

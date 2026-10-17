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

    criarOverlay() {
        const overlayExistente = document.getElementById('loginOverlay');
        if (overlayExistente) overlayExistente.remove();

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
                        <label for="loginUsuario"><i class="fas fa-user"></i> Usuário</label>
                        <div class="input-wrapper">
                            <i class="fas fa-user input-icon"></i>
                            <input type="text" id="loginUsuario" class="login-input" placeholder="Digite seu usuário" required>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="loginSenha"><i class="fas fa-key"></i> Senha</label>
                        <div class="input-wrapper">
                            <i class="fas fa-lock input-icon"></i>
                            <input type="password" id="loginSenha" class="login-input" placeholder="Digite sua senha" required>
                            <button type="button" class="toggle-password" id="togglePassword">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                    </div>
                    
                    <button type="submit" class="login-button" id="loginButton">
                        <i class="fas fa-sign-in-alt"></i> Entrar
                    </button>
                    
                    <div id="loginError" class="login-error hidden"></div>
                </form>
                
                <div class="login-footer">
                    <p><i class="fas fa-shield-alt"></i> Conexão segura</p>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        
        this.loginOverlay = overlay;
        this.usuarioInput = document.getElementById('loginUsuario');
        this.senhaInput = document.getElementById('loginSenha');
        
        this.bindEvents();
        
        setTimeout(() => {
            if (this.usuarioInput) this.usuarioInput.focus({ preventScroll: true });
        }, 300);
    }

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
                const tipo = this.senhaInput.type === 'password' ? 'text' : 'password';
                this.senhaInput.type = tipo;
                togglePassword.innerHTML = tipo === 'text' ? '<i class="fas fa-eye-slash"></i>' : '<i class="fas fa-eye"></i>';
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
    }

    mostrar() {
        if (!this.loginOverlay) this.criarOverlay();
        this.loginOverlay.style.display = 'flex';
        setTimeout(() => {
            if (this.usuarioInput) this.usuarioInput.focus({ preventScroll: true });
        }, 300);
    }

    esconder() {
        if (this.loginOverlay) this.loginOverlay.style.display = 'none';
    }

    async fazerLogin() {
        try {
            if (this.isLoggingIn) return;
            
            const usuario = auth.sanitizarInput(this.usuarioInput.value);
            const senha = this.senhaInput.value;
            
            if (!usuario) return this.mostrarErro('Digite o usuário!');
            if (!senha) return this.mostrarErro('Digite a senha!');
            
            if (auth.estaBloqueado()) {
                const minutos = Math.ceil(auth.obterTempoBloqueio() / 60000);
                return this.mostrarErro(`Muitas tentativas! Aguarde ${minutos} minutos.`);
            }
            
            this.isLoggingIn = true;
            const botao = document.getElementById('loginButton');
            botao.disabled = true;
            botao.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando...';
            
            await auth.login(usuario, senha);
            
            // Login OK
            this.isLoggingIn = false;
            this.esconder();
            this.limparCampos();
            
            // Mostra a aplicação
            document.getElementById('appHeader').style.display = 'block';
            document.getElementById('appMain').style.display = 'block';
            
            // Inicializa a UI
            ui.initialize();
            
            // Configura o botão de logout
            const btnLogout = document.getElementById('btnLogout');
            if (btnLogout) {
                btnLogout.onclick = () => {
                    if (confirm('Deseja sair do sistema?')) auth.logout();
                };
            }

            // Inicializa as bibliotecas do Google em segundo plano
            api.initAuth().catch(console.warn);
            
            const inputCodigo = document.getElementById('inputCodigo');
            if (inputCodigo) inputCodigo.focus({ preventScroll: true });
            
            ui.showToast('Login realizado com sucesso!', 'success');
            
        } catch (error) {
            this.isLoggingIn = false;
            
            if (auth.estaBloqueado()) {
                const minutos = Math.ceil(auth.obterTempoBloqueio() / 60000);
                this.mostrarErro(`Muitas tentativas! Aguarde ${minutos} minutos.`);
            } else {
                this.mostrarErro(error.message || 'Usuário ou senha incorretos');
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

    limparCampos() {
        if (this.usuarioInput) this.usuarioInput.value = '';
        if (this.senhaInput) {
            this.senhaInput.value = '';
            this.senhaInput.type = 'password';
        }
        const toggleIcon = document.querySelector('#togglePassword i');
        if (toggleIcon) toggleIcon.className = 'fas fa-eye';
    }

    mostrarErro(mensagem) {
        const erroElement = document.getElementById('loginError');
        if (!erroElement) return;
        
        erroElement.textContent = mensagem;
        erroElement.classList.remove('hidden');
        
        erroElement.style.animation = 'none';
        erroElement.offsetHeight; // Trigger reflow
        erroElement.style.animation = 'shake 0.3s ease';
        
        setTimeout(() => {
            erroElement.classList.add('hidden');
        }, 5000);
    }
}

const uiLogin = new UILogin();
window.uiLogin = uiLogin;

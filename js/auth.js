class Auth {
    constructor() {
        if (typeof CONFIG === 'undefined') {
            window.CONFIG = { AUTH: { SESSION_KEY: 'pesquisa_preco_session', ATTEMPTS_KEY: 'pesquisa_preco_attempts' } };
        }
        
        // Usuários e Senhas permitidos
        this.usuariosValidos = {
            'JOAOPRICE': this.gerarHash('FR1B4L'),
            'KAUAPRICE': this.gerarHash('FR1B4L')
        };

        this.sessionKey = CONFIG.AUTH.SESSION_KEY || 'pesquisa_preco_session';
        this.attemptsKey = CONFIG.AUTH.ATTEMPTS_KEY || 'pesquisa_preco_attempts';
    }

    gerarHash(texto) {
        let hash = 0;
        for (let i = 0; i < texto.length; i++) {
            hash = ((hash << 5) - hash) + texto.charCodeAt(i);
            hash = hash & hash;
        }
        return Math.abs(hash).toString(16).padStart(8, '0');
    }

    async login(usuario, senha) {
        try {
            const userUpper = usuario.trim().toUpperCase();
            const passHash = this.gerarHash(senha);

            if (this.usuariosValidos[userUpper] && this.usuariosValidos[userUpper] === passHash) {
                this.criarSessao(userUpper);
                return true;
            } else {
                throw new Error('Usuário ou senha incorretos');
            }
        } catch (error) {
            throw error;
        }
    }

    criarSessao(usuario) {
        const sessao = {
            usuario: usuario,
            loginTime: Date.now(),
            expiraEm: Date.now() + (8 * 60 * 60 * 1000) // 8 horas
        };
        sessionStorage.setItem(this.sessionKey, JSON.stringify(sessao));
    }

    estaAutenticado() {
        const sessaoJSON = sessionStorage.getItem(this.sessionKey);
        if (!sessaoJSON) return false;
        const sessao = JSON.parse(sessaoJSON);
        return Date.now() < sessao.expiraEm;
    }

    logout() {
        sessionStorage.removeItem(this.sessionKey);
        window.location.reload();
    }

    sanitizarInput(input) {
        return String(input || '').replace(/[<>]/g, '').trim();
    }
}

const auth = new Auth();

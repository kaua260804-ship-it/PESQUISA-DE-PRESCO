/**
 * UI-CORE.JS
 * Núcleo da interface do usuário
 */

class UI {
    constructor() {
        this.dadosProdutos = [];
        this.historico = [];
        this.produtoAtual = null;
        this.isEditando = false;
        this.scannerAtivo = false;
        this.buscaTimeout = null;
        this.isLoading = false;
    }

    /**
     * Inicializa a interface
     */
    initialize() {
        this.carregarHistorico();
        this.bindEvents();
        console.log('UI inicializada');
    }

    /**
     * Liga os eventos aos elementos HTML
     */
    bindEvents() {
        // Input de código
        const inputCodigo = document.getElementById('inputCodigo');
        if (inputCodigo) {
            inputCodigo.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && inputCodigo.value.trim()) {
                    this.processarCodigo(inputCodigo.value.trim());
                }
            });
        }

        // Botão de escanear
        const btnScan = document.getElementById('btnScan');
        if (btnScan) {
            btnScan.addEventListener('click', () => this.toggleScanner());
        }

        // Botão de parar scanner
        const btnStopScan = document.getElementById('btnStopScan');
        if (btnStopScan) {
            btnStopScan.addEventListener('click', () => this.stopScanner());
        }

        // Busca com debounce
        const inputBusca = document.getElementById('inputBusca');
        if (inputBusca) {
            inputBusca.addEventListener('input', (e) => {
                clearTimeout(this.buscaTimeout);
                const termo = e.target.value;
                this.buscaTimeout = setTimeout(() => this.buscarProdutos(termo), 300);
            });
            
            inputBusca.addEventListener('focus', () => {
                if (inputBusca.value.trim()) {
                    this.buscarProdutos(inputBusca.value.trim());
                }
            });
        }
        
        // Fecha resultados da busca quando clica fora
        document.addEventListener('click', (e) => {
            const searchResults = document.getElementById('resultadosBusca');
            const inputBusca = document.getElementById('inputBusca');
            if (searchResults && inputBusca && 
                e.target !== inputBusca && !searchResults.contains(e.target)) {
                searchResults.classList.add('hidden');
            }
        });

        // Fechar card
        const btnFecharCard = document.getElementById('btnFecharCard');
        if (btnFecharCard) {
            btnFecharCard.addEventListener('click', () => this.fecharCard());
        }

        // Botões de edição
        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', () => this.iniciarEdicao(btn.dataset.campo));
        });

        // Botões de salvar
        document.querySelectorAll('.btn-save').forEach(btn => {
            btn.addEventListener('click', () => this.salvarEdicao(btn.dataset.campo));
        });

        // Botões de cancelar
        document.querySelectorAll('.btn-cancel').forEach(btn => {
            btn.addEventListener('click', () => this.cancelarEdicao(btn.dataset.campo));
        });

        // Histórico
        const btnLimparHistorico = document.getElementById('btnLimparHistorico');
        if (btnLimparHistorico) {
            btnLimparHistorico.addEventListener('click', () => this.limparHistorico());
        }

        const btnExportarCSV = document.getElementById('btnExportarCSV');
        if (btnExportarCSV) {
            btnExportarCSV.addEventListener('click', () => this.exportarCSV());
        }

        const btnExportarPDF = document.getElementById('btnExportarPDF');
        if (btnExportarPDF) {
            btnExportarPDF.addEventListener('click', () => this.exportarPDF());
        }

        // Botão de refresh (apenas mostra toast)
        const btnRefresh = document.getElementById('btnRefresh');
        if (btnRefresh) {
            btnRefresh.addEventListener('click', () => {
                this.showToast('Dados sempre atualizados da planilha!', 'info');
            });
        }

        console.log('Eventos vinculados');
    }

    /**
     * Mostra/esconde loading
     */
    showLoading(show) {
        const spinner = document.getElementById('loadingSpinner');
        if (!spinner) return;
        
        this.isLoading = show;
        spinner.style.display = show ? 'flex' : 'none';
    }

    /**
     * Mostra toast notification
     */
    showToast(mensagem, tipo = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) return;
        
        const toast = document.createElement('div');
        toast.className = `toast toast-${tipo}`;
        
        const icone = document.createElement('i');
        icone.className = this.getToastIcon(tipo);
        
        const texto = document.createElement('span');
        texto.textContent = mensagem;
        
        toast.appendChild(icone);
        toast.appendChild(texto);
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => {
                if (toast.parentNode) container.removeChild(toast);
            }, 300);
        }, CONFIG.TOAST_DURATION);
    }

    /**
     * Retorna ícone para toast
     */
    getToastIcon(tipo) {
        const icones = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };
        return icones[tipo] || icones.info;
    }

    /**
     * Capitaliza primeira letra
     */
    capitalizar(texto) {
        if (!texto) return texto;
        return texto.charAt(0).toUpperCase() + texto.slice(1);
    }
}

// Instância global da UI
const ui = new UI();

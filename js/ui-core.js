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
        
        // Armazena alterações pendentes
        this.alteracoesPendentes = [];
        this.produtosAlterados = {};
    }

    /**
     * Inicializa a interface
     */
    initialize() {
        console.log('🔄 Inicializando UI...');
        
        // Carrega histórico se o método existir
        if (typeof this.carregarHistorico === 'function') {
            this.carregarHistorico();
        } else {
            console.log('⏳ Aguardando carregamento do histórico...');
            // Tenta carregar novamente após um pequeno delay
            setTimeout(() => {
                if (typeof this.carregarHistorico === 'function') {
                    this.carregarHistorico();
                }
            }, 100);
        }
        
        // Carrega alterações pendentes
        this.carregarAlteracoesPendentes();
        
        // Liga os eventos
        this.bindEvents();
        
        console.log('✅ UI inicializada');
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

        // Botões de salvar (agora salvam localmente)
        document.querySelectorAll('.btn-save').forEach(btn => {
            btn.addEventListener('click', () => {
                const campo = btn.dataset.campo;
                // Salva localmente primeiro
                this.salvarEdicaoLocal(campo);
            });
        });

        // Botões de cancelar
        document.querySelectorAll('.btn-cancel').forEach(btn => {
            btn.addEventListener('click', () => this.cancelarEdicao(btn.dataset.campo));
        });

        // Botão de enviar todas alterações
        const btnEnviar = document.getElementById('btnEnviarAlteracoes');
        if (btnEnviar) {
            btnEnviar.addEventListener('click', () => this.enviarTodasAlteracoes());
        }

        // Histórico - verifica se os métodos existem
        const btnLimparHistorico = document.getElementById('btnLimparHistorico');
        if (btnLimparHistorico && typeof this.limparHistorico === 'function') {
            btnLimparHistorico.addEventListener('click', () => this.limparHistorico());
        }

        const btnExportarCSV = document.getElementById('btnExportarCSV');
        if (btnExportarCSV && typeof this.exportarCSV === 'function') {
            btnExportarCSV.addEventListener('click', () => this.exportarCSV());
        }

        const btnExportarPDF = document.getElementById('btnExportarPDF');
        if (btnExportarPDF && typeof this.exportarPDF === 'function') {
            btnExportarPDF.addEventListener('click', () => this.exportarPDF());
        }

        // Botão de refresh
        const btnRefresh = document.getElementById('btnRefresh');
        if (btnRefresh) {
            btnRefresh.addEventListener('click', () => {
                this.showToast('Dados sempre atualizados da planilha!', 'info');
            });
        }

        console.log('✅ Eventos vinculados');
    }

    /**
     * Carrega alterações pendentes do localStorage
     */
    carregarAlteracoesPendentes() {
        try {
            const saved = localStorage.getItem('alteracoes_pendentes');
            if (saved) {
                this.produtosAlterados = JSON.parse(saved);
                const total = Object.values(this.produtosAlterados).reduce((acc, arr) => acc + arr.length, 0);
                console.log(`📝 ${total} alterações pendentes carregadas`);
                this.atualizarBotaoEnviar();
            } else {
                this.produtosAlterados = {};
            }
        } catch (error) {
            console.error('Erro ao carregar alterações:', error);
            this.produtosAlterados = {};
        }
    }

    /**
     * Salva alterações pendentes no localStorage
     */
    salvarAlteracoesPendentes() {
        try {
            localStorage.setItem('alteracoes_pendentes', JSON.stringify(this.produtosAlterados));
            this.atualizarBotaoEnviar();
        } catch (error) {
            console.error('Erro ao salvar alterações:', error);
        }
    }

    /**
     * Atualiza o botão de enviar alterações
     */
    atualizarBotaoEnviar() {
        const total = Object.values(this.produtosAlterados).reduce((acc, arr) => acc + arr.length, 0);
        const btn = document.getElementById('btnEnviarAlteracoes');
        const badge = document.getElementById('badgeAlteracoes');
        
        if (btn) {
            if (total > 0) {
                btn.disabled = false;
                btn.style.display = 'flex';
                btn.innerHTML = `<i class="fas fa-upload"></i> Enviar Alterações <span class="badge" id="badgeAlteracoes">${total}</span>`;
            } else {
                btn.disabled = true;
                btn.style.display = 'none';
            }
        }
    }

    /**
     * Salva edição LOCALMENTE (não envia para API)
     */
    salvarEdicaoLocal(campo) {
        if (!this.produtoAtual) {
            this.showToast('Nenhum produto selecionado!', 'warning');
            return;
        }

        const inputElement = document.getElementById(`input${this.capitalizar(campo)}`);
        if (!inputElement) return;
        
        const novoValor = inputElement.value.trim();
        const seqProd = this.produtoAtual.seqProd;
        const valorAntigo = this.produtoAtual[campo] || '';
        
        // Se o valor não mudou, não faz nada
        if (novoValor === valorAntigo) {
            this.finalizarEdicao(campo);
            this.showToast('Nenhuma alteração detectada.', 'info');
            return;
        }
        
        // Adiciona ou atualiza alteração pendente
        if (!this.produtosAlterados[seqProd]) {
            this.produtosAlterados[seqProd] = [];
        }
        
        const pendentes = this.produtosAlterados[seqProd];
        const existente = pendentes.find(p => p.campo === campo);
        
        if (existente) {
            existente.valor = novoValor;
        } else {
            pendentes.push({
                campo: campo,
                valor: novoValor,
                valorAntigo: valorAntigo
            });
        }
        
        // Remove se estiver vazio
        if (novoValor === '') {
            const index = pendentes.findIndex(p => p.campo === campo);
            if (index > -1) {
                pendentes.splice(index, 1);
            }
        }
        
        this.salvarAlteracoesPendentes();
        this.finalizarEdicao(campo);
        this.atualizarDisplayEditaveis(this.produtoAtual);
        this.atualizarBotaoEnviar();
        
        this.showToast('✅ Alteração salva localmente! Envie para salvar na planilha.', 'success');
    }

    /**
     * Envia TODAS as alterações pendentes para a API
     */
    async enviarTodasAlteracoes() {
        const total = Object.values(this.produtosAlterados).reduce((acc, arr) => acc + arr.length, 0);
        
        if (total === 0) {
            this.showToast('Nenhuma alteração pendente!', 'warning');
            return;
        }
        
        if (!confirm(`Deseja enviar ${total} alteração(ões) para a planilha?`)) {
            return;
        }
        
        const btn = document.getElementById('btnEnviarAlteracoes');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
        
        let sucessos = 0;
        let erros = 0;
        
        const sequencias = Object.keys(this.produtosAlterados);
        
        for (const seqProd of sequencias) {
            const alteracoes = this.produtosAlterados[seqProd];
            
            for (const alteracao of alteracoes) {
                try {
                    await api.atualizarCampo(seqProd, alteracao.campo, alteracao.valor);
                    sucessos++;
                    
                    // Atualiza o produto atual se for o mesmo
                    if (this.produtoAtual && this.produtoAtual.seqProd === seqProd) {
                        this.produtoAtual[alteracao.campo] = alteracao.valor;
                    }
                } catch (error) {
                    console.error('Erro ao enviar alteração:', error);
                    erros++;
                }
            }
        }
        
        // Limpa alterações pendentes
        this.produtosAlterados = {};
        this.salvarAlteracoesPendentes();
        
        // Atualiza UI
        if (this.produtoAtual) {
            this.atualizarDisplayEditaveis(this.produtoAtual);
        }
        
        this.atualizarBotaoEnviar();
        
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-upload"></i> Enviar Alterações <span class="badge" id="badgeAlteracoes">0</span>';
        
        if (erros === 0) {
            this.showToast(`✅ ${sucessos} alteração(ões) enviadas com sucesso!`, 'success');
        } else {
            this.showToast(`⚠️ ${sucessos} enviadas, ${erros} falhas.`, 'warning');
        }
    }

    /**
     * Atualiza display dos campos editáveis
     */
    atualizarDisplayEditaveis(produto) {
        if (!produto) return;
        
        const seqProd = produto.seqProd;
        const pendentes = this.produtosAlterados[seqProd] || [];
        
        // Busca valor pendente ou valor atual
        const getValor = (campo) => {
            const pendente = pendentes.find(p => p.campo === campo);
            if (pendente) return pendente.valor;
            return produto[campo] || '';
        };
        
        const nossoPreco = getValor('nossoPreco');
        const precoConcorrente = getValor('precoConcorrente');
        const observacao = getValor('observacao');
        
        const displayNosso = document.getElementById('displayNossoPreco');
        if (displayNosso) {
            displayNosso.textContent = nossoPreco ? `R$ ${parseFloat(nossoPreco).toFixed(2)}` : 'Não informado';
        }
        
        const displayConcorrente = document.getElementById('displayPrecoConcorrente');
        if (displayConcorrente) {
            displayConcorrente.textContent = precoConcorrente ? `R$ ${parseFloat(precoConcorrente).toFixed(2)}` : 'Não informado';
        }
        
        const displayObs = document.getElementById('displayObservacao');
        if (displayObs) {
            displayObs.textContent = observacao || 'Sem observações';
        }
        
        // Marca campos com alteração pendente
        ['nossoPreco', 'precoConcorrente', 'observacao'].forEach(campo => {
            const item = document.querySelector(`.editable-item[data-campo="${campo}"]`);
            if (item) {
                const temPendente = pendentes.some(p => p.campo === campo);
                item.classList.toggle('pending', temPendente);
            }
        });
    }

    /**
     * Inicia edição de um campo
     */
    iniciarEdicao(campo) {
        if (this.isEditando) {
            this.showToast('Finalize a edição atual primeiro!', 'warning');
            return;
        }
        
        if (!this.produtoAtual) {
            this.showToast('Nenhum produto selecionado!', 'warning');
            return;
        }
        
        this.isEditando = true;
        const seqProd = this.produtoAtual.seqProd;
        const pendentes = this.produtosAlterados[seqProd] || [];
        const pendente = pendentes.find(p => p.campo === campo);
        
        const displayElement = document.getElementById(`display${this.capitalizar(campo)}`);
        if (displayElement) displayElement.classList.add('hidden');
        
        const inputElement = document.getElementById(`input${this.capitalizar(campo)}`);
        if (inputElement) {
            const container = inputElement.closest('.editable-input');
            if (container) {
                container.classList.remove('hidden');
                // Usa valor pendente ou atual
                inputElement.value = pendente ? pendente.valor : (this.produtoAtual[campo] || '');
                inputElement.focus({ preventScroll: true });
                inputElement.select();
            }
        }
    }

    /**
     * Cancela edição de um campo
     */
    cancelarEdicao(campo) {
        this.finalizarEdicao(campo);
        this.showToast('Edição cancelada', 'info');
    }

    /**
     * Finaliza edição de um campo
     */
    finalizarEdicao(campo) {
        this.isEditando = false;
        
        const displayElement = document.getElementById(`display${this.capitalizar(campo)}`);
        if (displayElement) displayElement.classList.remove('hidden');
        
        const inputElement = document.getElementById(`input${this.capitalizar(campo)}`);
        if (inputElement) {
            const container = inputElement.closest('.editable-input');
            if (container) container.classList.add('hidden');
        }
    }

    /**
     * Fecha o card do produto
     */
    fecharCard() {
        const card = document.getElementById('produtoCard');
        if (card) card.classList.add('hidden');
        this.produtoAtual = null;
        this.isEditando = false;
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
        }, CONFIG.TOAST_DURATION || 3000);
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

// Exporta para uso global
window.ui = ui;

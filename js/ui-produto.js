/**
 * UI-PRODUTO.JS
 * Gerenciamento de produtos e edição com salvamento local
 */

Object.assign(UI.prototype, {
    // Armazena alterações pendentes
    alteracoesPendentes: [],
    produtosAlterados: {},

    /**
     * Processa um código de barras (EAN ou SEQ)
     */
    async processarCodigo(codigo) {
        try {
            this.showLoading(true);
            
            const codigoLimpo = codigo.trim();
            console.log('Processando código:', codigoLimpo);
            
            // Tenta buscar por EAN primeiro
            let produto = await api.buscarPorEAN(codigoLimpo);
            
            // Se não encontrou por EAN, tenta por SEQ
            if (!produto) {
                console.log('Não encontrado por EAN, tentando por SEQ...');
                produto = await api.buscarPorSeq(codigoLimpo);
            }
            
            this.showLoading(false);
            
            if (produto) {
                console.log('Produto encontrado:', produto);
                this.exibirProduto(produto);
                this.adicionarHistorico(produto);
                this.showToast('Produto encontrado!', 'success');
                
                const inputCodigo = document.getElementById('inputCodigo');
                if (inputCodigo) inputCodigo.value = '';
            } else {
                console.log('Produto não encontrado');
                this.showToast('Produto não encontrado!', 'warning');
            }
        } catch (error) {
            this.showLoading(false);
            console.error('Erro ao processar código:', error);
            this.showToast('Erro ao processar código!', 'error');
        }
    },

    /**
     * Exibe um produto no card
     */
    exibirProduto(produto) {
        this.produtoAtual = produto;
        
        // Preenche informações básicas
        document.getElementById('produtoCodigo').textContent = produto.seqProd || 'N/A';
        document.getElementById('produtoDescricao').textContent = produto.desc || 'N/A';
        document.getElementById('produtoComprador').textContent = produto.comprador || 'N/A';
        document.getElementById('produtoCategoria').textContent = produto.categoria || 'N/A';
        document.getElementById('produtoGrupo').textContent = produto.grupo || 'N/A';
        document.getElementById('produtoSubgrupo').textContent = produto.subgrupo || 'N/A';
        document.getElementById('produtoTipoCodigo').textContent = produto.tipoCodigo || 'N/A';
        document.getElementById('produtoCodAcesso').textContent = produto.codAcesso || 'N/A';
        
        // Verifica se há alterações pendentes para este produto
        this.carregarAlteracoesPendentes(produto.seqProd);
        
        this.atualizarDisplayEditaveis(produto);
        
        const card = document.getElementById('produtoCard');
        card.classList.remove('hidden');
        
        // Atualiza botão de enviar alterações
        this.atualizarBotaoEnviar();
    },

    /**
     * Carrega alterações pendentes do localStorage
     */
    carregarAlteracoesPendentes(seqProd) {
        try {
            const saved = localStorage.getItem('alteracoes_pendentes');
            if (saved) {
                const todas = JSON.parse(saved);
                this.alteracoesPendentes = todas[seqProd] || [];
                this.produtosAlterados = todas;
            } else {
                this.alteracoesPendentes = [];
                this.produtosAlterados = {};
            }
        } catch (error) {
            console.error('Erro ao carregar alterações:', error);
            this.alteracoesPendentes = [];
            this.produtosAlterados = {};
        }
    },

    /**
     * Salva alterações pendentes no localStorage
     */
    salvarAlteracoesPendentes() {
        try {
            localStorage.setItem('alteracoes_pendentes', JSON.stringify(this.produtosAlterados));
        } catch (error) {
            console.error('Erro ao salvar alterações:', error);
        }
    },

    /**
     * Atualiza display dos campos editáveis
     */
    atualizarDisplayEditaveis(produto) {
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
        
        document.getElementById('displayNossoPreco').textContent = 
            nossoPreco ? `R$ ${parseFloat(nossoPreco).toFixed(2)}` : 'Não informado';
        
        document.getElementById('displayPrecoConcorrente').textContent = 
            precoConcorrente ? `R$ ${parseFloat(precoConcorrente).toFixed(2)}` : 'Não informado';
        
        document.getElementById('displayObservacao').textContent = 
            observacao || 'Sem observações';
        
        // Marca campos com alteração pendente
        ['nossoPreco', 'precoConcorrente', 'observacao'].forEach(campo => {
            const item = document.querySelector(`.editable-item[data-campo="${campo}"]`);
            if (item) {
                const temPendente = pendentes.some(p => p.campo === campo);
                item.classList.toggle('pending', temPendente);
            }
        });
    },

    /**
     * Inicia edição de um campo
     */
    iniciarEdicao(campo) {
        if (this.isEditando) {
            this.showToast('Finalize a edição atual primeiro!', 'warning');
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
            }
        }
    },

    /**
     * Salva edição LOCALMENTE (não envia para API)
     */
    sal

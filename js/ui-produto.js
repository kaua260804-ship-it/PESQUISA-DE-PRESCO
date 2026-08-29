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
    salvarEdicaoLocal(campo) {
        const inputElement = document.getElementById(`input${this.capitalizar(campo)}`);
        const novoValor = inputElement.value.trim();
        const seqProd = this.produtoAtual.seqProd;
        
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
                valorAntigo: this.produtoAtual[campo] || ''
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
        
        this.showToast('Alteração salva localmente! Envie para salvar na planilha.', 'info');
    },

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
            } else {
                btn.disabled = true;
                btn.style.display = 'none';
            }
        }
        
        if (badge) {
            badge.textContent = total;
            badge.style.display = total > 0 ? 'inline' : 'none';
        }
    },

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
            await api.carregarArvore(true);
            const produtoAtualizado = await api.buscarPorSeq(this.produtoAtual.seqProd);
            if (produtoAtualizado) {
                this.exibirProduto(produtoAtualizado);
            }
        }
        
        this.atualizarBotaoEnviar();
        
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-upload"></i> Enviar Alterações <span class="badge" id="badgeAlteracoes">0</span>';
        
        if (erros === 0) {
            this.showToast(`✅ ${sucessos} alteração(ões) enviadas com sucesso!`, 'success');
        } else {
            this.showToast(`⚠️ ${sucessos} enviadas, ${erros} falhas.`, 'warning');
        }
    },

    /**
     * Cancela edição de um campo
     */
    cancelarEdicao(campo) {
        this.finalizarEdicao(campo);
        this.showToast('Edição cancelada', 'info');
    },

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
    },

    /**
     * Fecha o card do produto
     */
    fecharCard() {
        document.getElementById('produtoCard').classList.add('hidden');
        this.produtoAtual = null;
        this.isEditando = false;
    },

    /**
     * Busca produtos por descrição
     */
    async buscarProdutos(termo) {
        if (!termo || termo.length < 2) {
            const container = document.getElementById('resultadosBusca');
            if (container) container.classList.add('hidden');
            return;
        }
        
        this.showLoading(true);
        const resultados = await api.buscarPorDescricao(termo);
        this.showLoading(false);
        
        this.exibirResultadosBusca(resultados);
    },

    /**
     * Exibe resultados da busca
     */
    exibirResultadosBusca(resultados) {
        const container = document.getElementById('resultadosBusca');
        if (!container) return;
        
        if (resultados.length === 0) {
            container.innerHTML = '<div class="search-result-item">Nenhum produto encontrado</div>';
        } else {
            container.innerHTML = resultados.map(produto => `
                <div class="search-result-item" data-seqprod="${produto.seqProd || ''}">
                    <strong>${produto.seqProd || 'N/A'}</strong> - ${produto.desc || 'Sem descrição'}
                    <div style="font-size: 0.9rem; color: #666;">
                        ${produto.comprador ? 'Comprador: ' + produto.comprador : ''}
                    </div>
                </div>
            `).join('');
            
            container.querySelectorAll('.search-result-item[data-seqprod]').forEach(item => {
                item.addEventListener('click', () => {
                    this.processarCodigo(item.dataset.seqprod);
                    container.classList.add('hidden');
                    document.getElementById('inputBusca').value = '';
                });
            });
        }
        
        container.classList.remove('hidden');
    },

    /**
     * Ativa/desativa o scanner
     */
    async toggleScanner() {
        const scannerArea = document.getElementById('scannerArea');
        
        if (scannerArea.classList.contains('hidden')) {
            try {
                const temCamera = await scanner.hasCamera();
                if (!temCamera) {
                    this.showToast('Dispositivo não possui câmera!', 'error');
                    return;
                }
                
                scannerArea.classList.remove('hidden');
                this.scannerAtivo = true;
                
                await scanner.initialize('qr-reader');
                await scanner.start((codigo) => this.processarCodigo(codigo));
                
                this.showToast('Scanner ativado!', 'info');
            } catch (error) {
                this.showToast('Erro ao ativar scanner!', 'error');
                scannerArea.classList.add('hidden');
                this.scannerAtivo = false;
            }
        } else {
            await this.stopScanner();
        }
    },

    /**
     * Para o scanner
     */
    async stopScanner() {
        try {
            await scanner.stop();
            document.getElementById('scannerArea').classList.add('hidden');
            this.scannerAtivo = false;
            this.showToast('Scanner desativado', 'info');
        } catch (error) {
            console.error('Erro ao parar scanner:', error);
        }
    }
});

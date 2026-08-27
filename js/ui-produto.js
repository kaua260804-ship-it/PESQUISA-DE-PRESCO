/**
 * UI-PRODUTO.JS
 * Gerenciamento de produtos e edição
 */

Object.assign(UI.prototype, {
    /**
     * Processa um código de barras (EAN ou SEQ)
     */
    async processarCodigo(codigo) {
        try {
            this.showLoading(true);
            
            const codigoLimpo = codigo.trim();
            
            // Tenta buscar por EAN primeiro
            let produto = await api.buscarPorEAN(codigoLimpo);
            
            // Se não encontrou por EAN, tenta por SEQ
            if (!produto) {
                produto = await api.buscarPorSeq(codigoLimpo);
            }
            
            this.showLoading(false);
            
            if (produto) {
                this.exibirProduto(produto);
                this.adicionarHistorico(produto);
                this.showToast('Produto encontrado!', 'success');
                
                document.getElementById('inputCodigo').value = '';
            } else {
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
        
        document.getElementById('produtoCodigo').textContent = produto.seqProd || 'N/A';
        document.getElementById('produtoDescricao').textContent = produto.desc || produto.descricao || 'N/A';
        document.getElementById('produtoComprador').textContent = produto.comprador || 'N/A';
        document.getElementById('produtoCategoria').textContent = produto.categoria || 'N/A';
        document.getElementById('produtoGrupo').textContent = produto.grupo || 'N/A';
        document.getElementById('produtoSubgrupo').textContent = produto.divisao || 'N/A';
        document.getElementById('produtoTipoCodigo').textContent = produto.tipoCodigo || 'N/A';
        document.getElementById('produtoCodAcesso').textContent = produto.codAcesso || 'N/A';
        
        // Mostra SEQ FML se existir
        const seqFmlElement = document.getElementById('produtoSeqFml');
        if (seqFmlElement) {
            seqFmlElement.textContent = produto.seqFml || 'N/A';
        }
        
        this.atualizarDisplayEditaveis(produto);
        
        const card = document.getElementById('produtoCard');
        card.classList.remove('hidden');
    },

    /**
     * Atualiza display dos campos editáveis
     */
    atualizarDisplayEditaveis(produto) {
        document.getElementById('displayNossoPreco').textContent = 
            produto.nossoPreco ? `R$ ${parseFloat(produto.nossoPreco).toFixed(2)}` : 'Não informado';
        
        document.getElementById('displayPrecoConcorrente').textContent = 
            produto.precoConcorrente ? `R$ ${parseFloat(produto.precoConcorrente).toFixed(2)}` : 'Não informado';
        
        document.getElementById('displayObservacao').textContent = 
            produto.observacao || 'Sem observações';
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
        
        const displayElement = document.getElementById(`display${this.capitalizar(campo)}`);
        if (displayElement) displayElement.classList.add('hidden');
        
        const inputElement = document.getElementById(`input${this.capitalizar(campo)}`);
        if (inputElement) {
            const container = inputElement.closest('.editable-input');
            if (container) {
                container.classList.remove('hidden');
                inputElement.value = this.produtoAtual[campo] || '';
                inputElement.focus({ preventScroll: true });
            }
        }
    },

    /**
     * Salva edição de um campo
     */
    async salvarEdicao(campo) {
        try {
            const inputElement = document.getElementById(`input${this.capitalizar(campo)}`);
            const novoValor = inputElement.value.trim();
            const valorAntigo = this.produtoAtual[campo] || '';
            
            if (!this.produtoAtual) {
                throw new Error('Nenhum produto selecionado');
            }
            
            this.showLoading(true);
            
            await api.atualizarCampo(this.produtoAtual.seqProd, campo, novoValor);
            
            this.produtoAtual[campo] = novoValor;
            this.atualizarDisplayEditaveis(this.produtoAtual);
            
            this.registrarAlteracao(campo, valorAntigo, novoValor);
            
            this.finalizarEdicao(campo);
            
            this.showLoading(false);
            this.showToast('Alteração salva com sucesso!', 'success');
        } catch (error) {
            this.showLoading(false);
            this.showToast('Erro ao salvar alteração!', 'error');
            console.error('Erro ao salvar:', error);
        }
    },

    /**
     * Registra alteração no histórico
     */
    registrarAlteracao(campo, valorAntigo, novoValor) {
        const campos = {
            'nossoPreco': 'Nosso Preço',
            'precoConcorrente': 'Preço Concorrente',
            'observacao': 'Observação'
        };
        
        const alteracao = {
            campo: campos[campo] || campo,
            valorAntigo: valorAntigo || 'Vazio',
            valorNovo: novoValor || 'Vazio',
            timestamp: new Date().toISOString()
        };
        
        if (!this.produtoAtual.alteracoes) {
            this.produtoAtual.alteracoes = [];
        }
        this.produtoAtual.alteracoes.push(alteracao);
        
        if (this.historico.length > 0) {
            this.historico[0].alteracoes = this.produtoAtual.alteracoes;
            this.salvarHistorico();
            this.renderizarHistorico();
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
        
        const resultados = await api.buscarPorDescricao(termo);
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
                        ${produto.codAcesso ? 'EAN: ' + produto.codAcesso : ''}
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

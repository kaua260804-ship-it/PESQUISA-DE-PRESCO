// Substitua o método processarCodigo
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
     * Busca produtos por termo (descrição)
     */
    async buscarProdutos(termo) {
        if (!termo || termo.length < 2) {
            document.getElementById('resultadosBusca').classList.add('hidden');
            return;
        }
        
        const resultados = await api.buscarPorDescricao(termo);
        this.exibirResultadosBusca(resultados);
    }
});

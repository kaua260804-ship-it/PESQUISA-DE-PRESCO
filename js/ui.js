/**
 * UI.JS
 * Renderização da interface do usuário
 * Otimizado para grandes volumes de dados
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
        inputCodigo.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && inputCodigo.value.trim()) {
                this.processarCodigo(inputCodigo.value.trim());
            }
        });

        // Botão de escanear
        const btnScan = document.getElementById('btnScan');
        btnScan.addEventListener('click', () => this.toggleScanner());

        // Botão de parar scanner
        const btnStopScan = document.getElementById('btnStopScan');
        btnStopScan.addEventListener('click', () => this.stopScanner());

        // Busca com debounce
        const inputBusca = document.getElementById('inputBusca');
        inputBusca.addEventListener('input', (e) => {
            clearTimeout(this.buscaTimeout);
            const termo = e.target.value;
            
            this.buscaTimeout = setTimeout(() => {
                this.buscarProdutos(termo);
            }, 300);
        });
        
        inputBusca.addEventListener('focus', () => {
            if (inputBusca.value.trim()) {
                this.buscarProdutos(inputBusca.value.trim());
            }
        });
        
        // Fecha resultados da busca quando clica fora
        document.addEventListener('click', (e) => {
            const searchResults = document.getElementById('resultadosBusca');
            const inputBusca = document.getElementById('inputBusca');
            
            if (searchResults && inputBusca && 
                e.target !== inputBusca && 
                !searchResults.contains(e.target)) {
                searchResults.classList.add('hidden');
            }
        });

        // Fechar card
        const btnFecharCard = document.getElementById('btnFecharCard');
        btnFecharCard.addEventListener('click', () => this.fecharCard());

        // Botões de edição
        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', () => {
                const campo = btn.dataset.campo;
                this.iniciarEdicao(campo);
            });
        });

        // Botões de salvar
        document.querySelectorAll('.btn-save').forEach(btn => {
            btn.addEventListener('click', () => {
                const campo = btn.dataset.campo;
                this.salvarEdicao(campo);
            });
        });

        // Botões de cancelar
        document.querySelectorAll('.btn-cancel').forEach(btn => {
            btn.addEventListener('click', () => {
                const campo = btn.dataset.campo;
                this.cancelarEdicao(campo);
            });
        });

        // Histórico
        document.getElementById('btnLimparHistorico').addEventListener('click', () => this.limparHistorico());
        document.getElementById('btnExportarCSV').addEventListener('click', () => this.exportarCSV());
        document.getElementById('btnExportarPDF').addEventListener('click', () => this.exportarPDF());
        document.getElementById('btnRefresh').addEventListener('click', () => this.refreshDados());

        console.log('Eventos vinculados');
    }

    /**
     * Carrega dados dos produtos
     */
    async carregarDados() {
        try {
            this.showLoading(true);
            console.time('Carregamento total');
            
            const produtos = await api.buscarTodosProdutos();
            
            console.timeEnd('Carregamento total');
            
            // Verifica se os dados são válidos
            if (Array.isArray(produtos)) {
                this.dadosProdutos = produtos;
                console.log(`${this.dadosProdutos.length} produtos carregados`);
                
                this.showLoading(false);
                this.showToast(`${this.dadosProdutos.length} produtos carregados!`, 'success');
            } else {
                console.error('Dados inválidos recebidos:', produtos);
                this.dadosProdutos = [];
                this.showLoading(false);
                this.showToast('Erro: dados inválidos!', 'error');
            }
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            this.dadosProdutos = [];
            this.showLoading(false);
            this.showToast('Erro ao carregar dados!', 'error');
        }
    }

    /**
     * Processa um código de barras
     * @param {string} codigo - Código a ser processado
     */
    async processarCodigo(codigo) {
        try {
            console.time('Processamento do código');
            
            // Busca local primeiro (muito rápido)
            let produto = api.buscarProdutoLocal(codigo);
            
            console.timeEnd('Processamento do código');
            
            if (produto) {
                this.exibirProduto(produto);
                this.adicionarHistorico(produto);
                this.showToast('Produto encontrado!', 'success');
                
                // Limpa o input para próxima leitura (sem scroll)
                const inputCodigo = document.getElementById('inputCodigo');
                inputCodigo.value = '';
                // NÃO foca automaticamente para evitar scroll
            } else {
                this.showToast('Produto não encontrado!', 'warning');
            }
        } catch (error) {
            console.error('Erro ao processar código:', error);
            this.showToast('Erro ao processar código!', 'error');
        }
    }

    /**
     * Exibe um produto no card (SEM SCROLL AUTOMÁTICO)
     * @param {Object} produto - Dados do produto
     */
    exibirProduto(produto) {
        this.produtoAtual = produto;
        
        // Preenche informações básicas
        document.getElementById('produtoCodigo').textContent = produto.seqProd || 'N/A';
        document.getElementById('produtoDescricao').textContent = produto.descricao || 'N/A';
        document.getElementById('produtoComprador').textContent = produto.comprador || 'N/A';
        document.getElementById('produtoCategoria').textContent = produto.categoria || 'N/A';
        document.getElementById('produtoGrupo').textContent = produto.grupo || 'N/A';
        document.getElementById('produtoSubgrupo').textContent = produto.subgrupo || 'N/A';
        document.getElementById('produtoTipoCodigo').textContent = produto.tipoCodigo || 'N/A';
        document.getElementById('produtoCodAcesso').textContent = produto.codAcesso || 'N/A';
        
        // Preenche campos editáveis
        this.atualizarDisplayEditaveis(produto);
        
        // Mostra o card SEM scroll automático
        const card = document.getElementById('produtoCard');
        card.classList.remove('hidden');
        
        // REMOVIDO: Scroll automático que causava problemas
    }

    /**
     * Atualiza display dos campos editáveis
     * @param {Object} produto - Dados do produto
     */
    atualizarDisplayEditaveis(produto) {
        // Nosso Preço
        const displayNossoPreco = document.getElementById('displayNossoPreco');
        displayNossoPreco.textContent = produto.nossoPreco 
            ? `R$ ${parseFloat(produto.nossoPreco).toFixed(2)}` 
            : 'Não informado';
        
        // Preço Concorrente
        const displayPrecoConcorrente = document.getElementById('displayPrecoConcorrente');
        displayPrecoConcorrente.textContent = produto.precoConcorrente 
            ? `R$ ${parseFloat(produto.precoConcorrente).toFixed(2)}` 
            : 'Não informado';
        
        // Observação
        const displayObservacao = document.getElementById('displayObservacao');
        displayObservacao.textContent = produto.observacao || 'Sem observações';
    }

    /**
     * Inicia edição de um campo
     * @param {string} campo - Nome do campo
     */
    iniciarEdicao(campo) {
        if (this.isEditando) {
            this.showToast('Finalize a edição atual primeiro!', 'warning');
            return;
        }
        
        this.isEditando = true;
        
        // Esconde o display
        const displayElement = document.getElementById(`display${this.capitalizar(campo)}`);
        if (displayElement) {
            displayElement.classList.add('hidden');
        }
        
        // Mostra o input
        const inputElement = document.getElementById(`input${this.capitalizar(campo)}`);
        if (inputElement) {
            const container = inputElement.closest('.editable-input');
            if (container) {
                container.classList.remove('hidden');
                
                // Preenche com valor atual
                const valorAtual = this.produtoAtual[campo];
                inputElement.value = valorAtual || '';
                
                // Foca no elemento (com preventScroll)
                inputElement.focus({ preventScroll: true });
            }
        }
    }

    /**
     * Salva edição de um campo
     * @param {string} campo - Nome do campo
     */
    async salvarEdicao(campo) {
        try {
            const inputElement = document.getElementById(`input${this.capitalizar(campo)}`);
            const novoValor = inputElement.value.trim();
            
            if (!this.produtoAtual) {
                throw new Error('Nenhum produto selecionado');
            }
            
            this.showLoading(true);
            
            // Chama API para salvar
            await api.atualizarCampo(
                this.produtoAtual.seqProd,
                campo,
                novoValor
            );
            
            // Atualiza o produto atual
            this.produtoAtual[campo] = novoValor;
            
            // Atualiza display
            this.atualizarDisplayEditaveis(this.produtoAtual);
            
            // Finaliza edição
            this.finalizarEdicao(campo);
            
            this.showLoading(false);
            this.showToast('Alteração salva com sucesso!', 'success');
        } catch (error) {
            this.showLoading(false);
            this.showToast('Erro ao salvar alteração!', 'error');
            console.error('Erro ao salvar:', error);
        }
    }

    /**
     * Cancela edição de um campo
     * @param {string} campo - Nome do campo
     */
    cancelarEdicao(campo) {
        this.finalizarEdicao(campo);
        this.showToast('Edição cancelada', 'info');
    }

    /**
     * Finaliza edição de um campo
     * @param {string} campo - Nome do campo
     */
    finalizarEdicao(campo) {
        this.isEditando = false;
        
        // Mostra o display
        const displayElement = document.getElementById(`display${this.capitalizar(campo)}`);
        if (displayElement) {
            displayElement.classList.remove('hidden');
        }
        
        // Esconde o input
        const inputElement = document.getElementById(`input${this.capitalizar(campo)}`);
        if (inputElement) {
            const container = inputElement.closest('.editable-input');
            if (container) {
                container.classList.add('hidden');
            }
        }
    }

    /**
     * Fecha o card do produto
     */
    fecharCard() {
        document.getElementById('produtoCard').classList.add('hidden');
        this.produtoAtual = null;
        this.isEditando = false;
        
        // NÃO foca automaticamente para evitar scroll
    }

    /**
     * Ativa/desativa o scanner
     */
    async toggleScanner() {
        const scannerArea = document.getElementById('scannerArea');
        
        if (scannerArea.classList.contains('hidden')) {
            try {
                // Verifica se tem câmera
                const temCamera = await scanner.hasCamera();
                if (!temCamera) {
                    this.showToast('Dispositivo não possui câmera!', 'error');
                    return;
                }
                
                // Mostra área do scanner
                scannerArea.classList.remove('hidden');
                this.scannerAtivo = true;
                
                // Inicializa scanner
                await scanner.initialize('qr-reader');
                await scanner.start((codigo) => {
                    this.processarCodigo(codigo);
                });
                
                this.showToast('Scanner ativado!', 'info');
            } catch (error) {
                this.showToast('Erro ao ativar scanner!', 'error');
                console.error('Erro ao ativar scanner:', error);
                scannerArea.classList.add('hidden');
                this.scannerAtivo = false;
            }
        } else {
            await this.stopScanner();
        }
    }

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

    /**
     * Busca produtos (com debounce)
     * @param {string} termo - Termo de busca
     */
    buscarProdutos(termo) {
        if (!termo || termo.length < 2) {
            const container = document.getElementById('resultadosBusca');
            if (container) {
                container.classList.add('hidden');
            }
            return;
        }
        
        console.time('Busca');
        
        // Usa busca local otimizada
        const resultados = api.buscarProdutosLocal(termo, CONFIG.LIMITE_BUSCA);
        
        console.timeEnd('Busca');
        console.log(`Encontrados: ${resultados.length} resultados para "${termo}"`);
        
        this.exibirResultadosBusca(resultados);
    }

    /**
     * Exibe resultados da busca
     * @param {Array} resultados - Lista de produtos encontrados
     */
    exibirResultadosBusca(resultados) {
        const container = document.getElementById('resultadosBusca');
        
        if (!container) return;
        
        if (resultados.length === 0) {
            container.innerHTML = '<div class="search-result-item">Nenhum produto encontrado</div>';
        } else {
            const html = resultados.map(produto => {
                const seqProd = produto.seqProd || '';
                
                return `
                    <div class="search-result-item" data-seqprod="${seqProd}">
                        <strong>${produto.seqProd || 'N/A'}</strong> - ${produto.descricao || 'Sem descrição'}
                        <div style="font-size: 0.9rem; color: #666;">
                            ${produto.codAcesso ? 'Cód: ' + produto.codAcesso : 'Sem código'}
                        </div>
                    </div>
                `;
            }).join('');
            
            container.innerHTML = html;
            
            // Adiciona event listeners
            container.querySelectorAll('.search-result-item[data-seqprod]').forEach(item => {
                item.addEventListener('click', () => {
                    const seqProd = item.dataset.seqprod;
                    this.processarCodigo(seqProd);
                    container.classList.add('hidden');
                    document.getElementById('inputBusca').value = '';
                });
            });
        }
        
        container.classList.remove('hidden');
    }

    /**
     * Adiciona produto ao histórico
     * @param {Object} produto - Dados do produto
     */
    adicionarHistorico(produto) {
        const itemHistorico = {
            seqProd: produto.seqProd,
            descricao: produto.descricao || 'Sem descrição',
            timestamp: new Date().toISOString(),
            id: Date.now()
        };
        
        // Verifica se o produto já está no histórico (evita duplicatas consecutivas)
        if (this.historico.length > 0 && this.historico[0].seqProd === itemHistorico.seqProd) {
            // Atualiza timestamp se for o mesmo produto
            this.historico[0].timestamp = itemHistorico.timestamp;
        } else {
            this.historico.unshift(itemHistorico);
            
            // Limita histórico a 50 itens
            if (this.historico.length > 50) {
                this.historico.pop();
            }
        }
        
        this.salvarHistorico();
        this.renderizarHistorico();
    }

    /**
     * Renderiza o histórico
     */
    renderizarHistorico() {
        const container = document.getElementById('historicoLista');
        
        if (!container) return;
        
        if (this.historico.length === 0) {
            container.innerHTML = '<div class="historico-item" style="justify-content: center;">Nenhuma leitura registrada</div>';
            return;
        }
        
        container.innerHTML = this.historico.map(item => {
            const data = new Date(item.timestamp);
            const hora = data.toLocaleTimeString('pt-BR');
            const dataFormatada = data.toLocaleDateString('pt-BR');
            
            return `
                <div class="historico-item" data-seqprod="${item.seqProd}">
                    <div class="produto-info">
                        <div class="produto-codigo">${item.seqProd}</div>
                        <div class="produto-descricao">${item.descricao}</div>
                    </div>
                    <div class="produto-hora">${dataFormatada} ${hora}</div>
                </div>
            `;
        }).join('');
        
        // Adiciona event listeners
        container.querySelectorAll('.historico-item[data-seqprod]').forEach(item => {
            item.addEventListener('click', () => {
                const seqProd = item.dataset.seqprod;
                this.processarCodigo(seqProd);
            });
        });
    }

    /**
     * Limpa o histórico
     */
    limparHistorico() {
        if (this.historico.length === 0) {
            this.showToast('Histórico já está vazio!', 'info');
            return;
        }
        
        if (confirm('Deseja limpar o histórico de leituras?')) {
            this.historico = [];
            this.salvarHistorico();
            this.renderizarHistorico();
            this.showToast('Histórico limpo!', 'success');
        }
    }

    /**
     * Salva histórico no localStorage
     */
    salvarHistorico() {
        try {
            localStorage.setItem('historico_leituras', JSON.stringify(this.historico));
        } catch (error) {
            console.error('Erro ao salvar histórico:', error);
        }
    }

    /**
     * Carrega histórico do localStorage
     */
    carregarHistorico() {
        try {
            const historicoSalvo = localStorage.getItem('historico_leituras');
            if (historicoSalvo) {
                this.historico = JSON.parse(historicoSalvo);
                this.renderizarHistorico();
            }
        } catch (error) {
            console.error('Erro ao carregar histórico:', error);
            this.historico = [];
        }
    }

    /**
     * Exporta histórico para CSV
     */
    exportarCSV() {
        if (this.historico.length === 0) {
            this.showToast('Nenhum dado para exportar!', 'warning');
            return;
        }
        
        try {
            let csv = '\uFEFF'; // BOM para UTF-8
            csv += 'Data;Hora;SEQ PROD;Descrição\n';
            
            this.historico.forEach(item => {
                const data = new Date(item.timestamp);
                const linha = `${data.toLocaleDateString('pt-BR')};${data.toLocaleTimeString('pt-BR')};${item.seqProd};${item.descricao}`;
                csv += linha + '\n';
            });
            
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `historico_${new Date().toISOString().split('T')[0]}.csv`;
            link.click();
            URL.revokeObjectURL(link.href);
            
            this.showToast('CSV exportado!', 'success');
        } catch (error) {
            this.showToast('Erro ao exportar CSV!', 'error');
            console.error('Erro ao exportar CSV:', error);
        }
    }

    /**
     * Exporta histórico para PDF (via impressão)
     */
    exportarPDF() {
        if (this.historico.length === 0) {
            this.showToast('Nenhum dado para exportar!', 'warning');
            return;
        }
        
        // Cria uma janela de impressão com o histórico
        const printWindow = window.open('', '_blank', 'width=800,height=600');
        
        if (!printWindow) {
            this.showToast('Pop-up bloqueado! Permita pop-ups para exportar PDF.', 'error');
            return;
        }
        
        const historicoHTML = this.historico.map(item => {
            const data = new Date(item.timestamp);
            return `
                <tr>
                    <td>${data.toLocaleDateString('pt-BR')}</td>
                    <td>${data.toLocaleTimeString('pt-BR')}</td>
                    <td>${item.seqProd}</td>
                    <td>${item.descricao}</td>
                </tr>
            `;
        }).join('');
        
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Histórico de Leituras</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        padding: 20px;
                    }
                    h1 {
                        color: #6C63FF;
                        font-size: 24px;
                        margin-bottom: 20px;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                    }
                    th, td {
                        padding: 8px;
                        text-align: left;
                        border-bottom: 1px solid #ddd;
                    }
                    th {
                        background-color: #f2f2f2;
                        font-weight: bold;
                    }
                    .footer {
                        margin-top: 20px;
                        font-size: 12px;
                        color: #666;
                    }
                </style>
            </head>
            <body>
                <h1>Histórico de Leituras - Pesquisa de Preço</h1>
                <table>
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Hora</th>
                            <th>SEQ PROD</th>
                            <th>Descrição</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${historicoHTML}
                    </tbody>
                </table>
                <div class="footer">
                    Gerado em: ${new Date().toLocaleString('pt-BR')} | 
                    Total de itens: ${this.historico.length}
                </div>
            </body>
            </html>
        `);
        
        printWindow.document.close();
        
        setTimeout(() => {
            printWindow.print();
        }, 500);
        
        this.showToast('PDF enviado para impressão!', 'success');
    }

    /**
     * Atualiza os dados
     */
    async refreshDados() {
        try {
            this.showLoading(true);
            api.cache.clear();
            await this.carregarDados();
            this.showLoading(false);
            this.showToast('Dados atualizados!', 'success');
        } catch (error) {
            this.showLoading(false);
            this.showToast('Erro ao atualizar dados!', 'error');
            console.error('Erro ao atualizar:', error);
        }
    }

    /**
     * Mostra/esconde loading
     * @param {boolean} show - Se deve mostrar
     */
    showLoading(show) {
        const spinner = document.getElementById('loadingSpinner');
        
        if (!spinner) {
            console.error('Elemento loadingSpinner não encontrado');
            return;
        }
        
        this.isLoading = show;
        
        if (show) {
            spinner.style.display = 'flex';
            console.log('Loading mostrado');
        } else {
            spinner.style.display = 'none';
            console.log('Loading escondido');
        }
    }

    /**
     * Mostra toast notification
     * @param {string} mensagem - Mensagem a ser exibida
     * @param {string} tipo - Tipo do toast (success, error, warning, info)
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
        
        // Remove após duração
        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => {
                if (toast.parentNode) {
                    container.removeChild(toast);
                }
            }, 300);
        }, CONFIG.TOAST_DURATION);
    }

    /**
     * Retorna ícone para toast
     * @param {string} tipo - Tipo do toast
     * @returns {string} Classe do ícone
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
     * @param {string} texto - Texto a ser capitalizado
     * @returns {string} Texto capitalizado
     */
    capitalizar(texto) {
        if (!texto) return texto;
        return texto.charAt(0).toUpperCase() + texto.slice(1);
    }
}

// Instância global da UI
const ui = new UI();

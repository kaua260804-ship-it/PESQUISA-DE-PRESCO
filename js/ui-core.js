/**
 * UI-CORE.JS
 * Núcleo da interface do usuário - COMPLETO
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

    // =============================================
    // INICIALIZAÇÃO
    // =============================================

    /**
     * Inicializa a interface
     */
    initialize() {
        console.log('🔄 Inicializando UI...');
        
        // Carrega histórico do localStorage
        this.carregarHistorico();
        
        // Carrega alterações pendentes
        this.carregarAlteracoesPendentes();
        
        // Liga os eventos
        this.bindEvents();
        
        // Renderiza histórico
        this.renderizarHistorico();
        
        console.log('✅ UI inicializada');
    }

    // =============================================
    // EVENTOS
    // =============================================

    /**
     * Liga os eventos aos elementos HTML
     */
    bindEvents() {
        console.log('🔗 Vinculando eventos...');
        
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

        // Botões de salvar (salvam localmente)
        document.querySelectorAll('.btn-save').forEach(btn => {
            btn.addEventListener('click', () => {
                const campo = btn.dataset.campo;
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

        // Botão de refresh
        const btnRefresh = document.getElementById('btnRefresh');
        if (btnRefresh) {
            btnRefresh.addEventListener('click', () => {
                this.showToast('Dados sempre atualizados da planilha!', 'info');
            });
        }

        console.log('✅ Eventos vinculados');
    }

    // =============================================
    // MÉTODOS DO HISTÓRICO
    // =============================================

    /**
     * Carrega histórico do localStorage
     */
    carregarHistorico() {
        try {
            const historicoSalvo = localStorage.getItem('historico_leituras');
            if (historicoSalvo) {
                this.historico = JSON.parse(historicoSalvo);
                console.log(`📚 Histórico carregado: ${this.historico.length} itens`);
            } else {
                this.historico = [];
                console.log('📚 Histórico vazio');
            }
        } catch (error) {
            console.error('Erro ao carregar histórico:', error);
            this.historico = [];
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
     * Adiciona produto ao histórico
     */
    adicionarHistorico(produto) {
        if (!produto || !produto.seqProd) {
            console.warn('Produto inválido para adicionar ao histórico');
            return;
        }

        const itemHistorico = {
            seqProd: produto.seqProd,
            descricao: produto.desc || 'Sem descrição',
            timestamp: new Date().toISOString(),
            id: Date.now(),
            alteracoes: produto.alteracoes || [],
            valoresAtuais: {
                nossoPreco: produto.nossoPreco || '',
                precoConcorrente: produto.precoConcorrente || '',
                observacao: produto.observacao || ''
            }
        };
        
        // Verifica se o produto já está no histórico
        const existenteIndex = this.historico.findIndex(h => h.seqProd === itemHistorico.seqProd);
        if (existenteIndex > -1) {
            this.historico[existenteIndex] = {
                ...this.historico[existenteIndex],
                ...itemHistorico,
                alteracoes: [...this.historico[existenteIndex].alteracoes, ...itemHistorico.alteracoes]
            };
        } else {
            this.historico.unshift(itemHistorico);
            if (this.historico.length > 50) this.historico.pop();
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
            container.innerHTML = `
                <div class="historico-item" style="justify-content: center; color: var(--text-muted);">
                    <i class="fas fa-inbox" style="margin-right: 8px;"></i>
                    Nenhuma leitura registrada
                </div>
            `;
            return;
        }
        
        container.innerHTML = this.historico.map(item => {
            const data = new Date(item.timestamp);
            const hora = data.toLocaleTimeString('pt-BR');
            const dataFormatada = data.toLocaleDateString('pt-BR');
            
            const campoNomes = {
                'nossoPreco': 'Nosso Preço',
                'precoConcorrente': 'Preço Concorrente',
                'observacao': 'Observação'
            };
            
            let alteracoesHTML = '';
            if (item.alteracoes && item.alteracoes.length > 0) {
                const ultimasAlteracoes = item.alteracoes.slice(-3);
                alteracoesHTML = `
                    <div class="alteracoes-lista">
                        ${ultimasAlteracoes.map(alt => `
                            <div class="alteracao-item">
                                <span class="campo-nome">${campoNomes[alt.campo] || alt.campo}:</span>
                                <span class="valor-antigo">${alt.valorAntigo || 'Vazio'}</span>
                                <span class="seta">→</span>
                                <span class="valor-novo">${alt.valor || alt.valorNovo || 'Vazio'}</span>
                            </div>
                        `).join('')}
                        ${item.alteracoes.length > 3 ? `<div style="font-size: 0.7rem; color: #999;">+ ${item.alteracoes.length - 3} mais alterações</div>` : ''}
                    </div>
                `;
            }
            
            let valoresAtuaisHTML = '';
            if (item.valoresAtuais) {
                const v = item.valoresAtuais;
                const partes = [];
                if (v.nossoPreco) partes.push(`💰 Preço: R$ ${parseFloat(v.nossoPreco).toFixed(2)}`);
                if (v.precoConcorrente) partes.push(`🏷️ Concorrente: R$ ${parseFloat(v.precoConcorrente).toFixed(2)}`);
                if (partes.length > 0) {
                    valoresAtuaisHTML = `
                        <div style="font-size: 0.75rem; color: #666; margin-top: 4px;">
                            ${partes.join(' | ')}
                        </div>
                    `;
                }
            }
            
            return `
                <div class="historico-item" data-seqprod="${item.seqProd}">
                    <div class="produto-info">
                        <div class="produto-codigo">${item.seqProd}</div>
                        <div class="produto-descricao">${item.descricao}</div>
                        ${valoresAtuaisHTML}
                        ${alteracoesHTML}
                    </div>
                    <div class="produto-hora">${dataFormatada} ${hora}</div>
                </div>
            `;
        }).join('');
        
        container.querySelectorAll('.historico-item[data-seqprod]').forEach(item => {
            item.addEventListener('click', () => {
                this.processarCodigo(item.dataset.seqprod);
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
     * Exporta histórico para CSV
     */
    exportarCSV() {
        if (this.historico.length === 0) {
            this.showToast('Nenhum dado para exportar!', 'warning');
            return;
        }
        
        try {
            let csv = '\uFEFF';
            csv += 'Data;Hora;SEQ PROD;Descrição;Preço;Concorrente;Observação;Alterações\n';
            
            this.historico.forEach(item => {
                const data = new Date(item.timestamp);
                const v = item.valoresAtuais || {};
                
                let alteracoesStr = '';
                if (item.alteracoes && item.alteracoes.length > 0) {
                    alteracoesStr = item.alteracoes.map(alt => 
                        `${alt.campo}: ${alt.valorAntigo || 'Vazio'} → ${alt.valor || alt.valorNovo || 'Vazio'}`
                    ).join('; ');
                }
                
                csv += `${data.toLocaleDateString('pt-BR')};${data.toLocaleTimeString('pt-BR')};${item.seqProd};${item.descricao};${v.nossoPreco || ''};${v.precoConcorrente || ''};${v.observacao || ''};${alteracoesStr}\n`;
            });
            
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `historico_${new Date().toISOString().split('T')[0]}.csv`;
            link.click();
            URL.revokeObjectURL(link.href);
            
            this.showToast('CSV exportado!', 'success');
        } catch (error) {
            console.error('Erro ao exportar CSV:', error);
            this.showToast('Erro ao exportar CSV!', 'error');
        }
    }

    /**
     * Exporta histórico para PDF
     */
    exportarPDF() {
        if (this.historico.length === 0) {
            this.showToast('Nenhum dado para exportar!', 'warning');
            return;
        }
        
        const printWindow = window.open('', '_blank', 'width=800,height=600');
        if (!printWindow) {
            this.showToast('Pop-up bloqueado! Permita pop-ups para exportar PDF.', 'error');
            return;
        }
        
        const historicoHTML = this.historico.map(item => {
            const data = new Date(item.timestamp);
            const v = item.valoresAtuais || {};
            
            let alteracoesHTML = '';
            if (item.alteracoes && item.alteracoes.length > 0) {
                alteracoesHTML = item.alteracoes.map(alt => `
                    <div style="font-size: 11px; color: #666; margin-top: 3px;">
                        <strong>${alt.campo}:</strong> 
                        <span style="text-decoration: line-through; color: #999;">${alt.valorAntigo || 'Vazio'}</span>
                        → <strong style="color: #00C853;">${alt.valor || alt.valorNovo || 'Vazio'}</strong>
                    </div>
                `).join('');
            }
            
            return `
                <tr>
                    <td>${data.toLocaleDateString('pt-BR')}</td>
                    <td>${data.toLocaleTimeString('pt-BR')}</td>
                    <td>${item.seqProd}</td>
                    <td>${item.descricao}</td>
                    <td>${v.nossoPreco || '-'}</td>
                    <td>${v.precoConcorrente || '-'}</td>
                    <td>${v.observacao || '-'}</td>
                    <td>${alteracoesHTML || '-'}</td>
                </tr>
            `;
        }).join('');
        
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Histórico de Leituras</title>
                <style>
                    * { box-sizing: border-box; }
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    h1 { color: #6C63FF; font-size: 24px; margin-bottom: 10px; }
                    .subtitle { color: #666; font-size: 14px; margin-bottom: 20px; }
                    table { width: 100%; border-collapse: collapse; font-size: 13px; }
                    th, td { padding: 8px 10px; text-align: left; border-bottom: 1px solid #ddd; vertical-align: top; }
                    th { background: #6C63FF; color: white; font-weight: bold; }
                    tr:nth-child(even) { background: #f9f9f9; }
                    .footer { margin-top: 20px; font-size: 12px; color: #666; text-align: center; }
                    @media print {
                        body { padding: 10px; }
                        th { background: #6C63FF !important; color: white !important; }
                    }
                </style>
            </head>
            <body>
                <h1>📊 Histórico de Leituras</h1>
                <div class="subtitle">Pesquisa de Preço - ${new Date().toLocaleString('pt-BR')}</div>
                <table>
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Hora</th>
                            <th>SEQ</th>
                            <th>Descrição</th>
                            <th>Preço</th>
                            <th>Concorrente</th>
                            <th>Observação</th>
                            <th>Alterações</th>
                        </tr>
                    </thead>
                    <tbody>${historicoHTML}</tbody>
                </table>
                <div class="footer">
                    Total de itens: ${this.historico.length} | Gerado em: ${new Date().toLocaleString('pt-BR')}
                </div>
                <script>
                    setTimeout(() => window.print(), 500);
                <\/script>
            </body>
            </html>
        `);
        
        printWindow.document.close();
        this.showToast('PDF enviado para impressão!', 'success');
    }

    // =============================================
    // MÉTODOS DE ALTERAÇÕES PENDENTES
    // =============================================

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
            } else {
                this.produtosAlterados = {};
            }
        } catch (error) {
            console.error('Erro ao carregar alterações:', error);
            this.produtosAlterados = {};
        }
        this.atualizarBotaoEnviar();
    }

    /**
     * Salva alterações pendentes no localStorage
     */
    salvarAlteracoesPendentes() {
        try {
            localStorage.setItem('alteracoes_pendentes', JSON.stringify(this.produtosAlterados));
        } catch (error) {
            console.error('Erro ao salvar alterações:', error);
        }
        this.atualizarBotaoEnviar();
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
                if (badge) badge.textContent = total;
            } else {
                btn.disabled = true;
                btn.style.display = 'none';
            }
        }
    }

    /**
     * Salva edição LOCALMENTE
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
        
        if (novoValor === valorAntigo) {
            this.finalizarEdicao(campo);
            this.showToast('Nenhuma alteração detectada.', 'info');
            return;
        }
        
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
                    
                    if (this.produtoAtual && this.produtoAtual.seqProd === seqProd) {
                        this.produtoAtual[alteracao.campo] = alteracao.valor;
                    }
                } catch (error) {
                    console.error('Erro ao enviar alteração:', error);
                    erros++;
                }
            }
        }
        
        this.produtosAlterados = {};
        this.salvarAlteracoesPendentes();
        
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

    // =============================================
    // MÉTODOS DE BUSCA E PRODUTO
    // =============================================

    /**
     * Processa um código de barras (EAN ou SEQ)
     */
    async processarCodigo(codigo) {
        try {
            this.showLoading(true);
            
            const codigoLimpo = codigo.trim();
            console.log('Processando código:', codigoLimpo);
            
            let produto = await api.buscarPorEAN(codigoLimpo);
            
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
    }

    /**
     * Exibe um produto no card
     */
    exibirProduto(produto) {
        this.produtoAtual = produto;
        
        document.getElementById('produtoCodigo').textContent = produto.seqProd || 'N/A';
        document.getElementById('produtoDescricao').textContent = produto.desc || 'N/A';
        document.getElementById('produtoComprador').textContent = produto.comprador || 'N/A';
        document.getElementById('produtoCategoria').textContent = produto.categoria || 'N/A';
        document.getElementById('produtoGrupo').textContent = produto.grupo || 'N/A';
        document.getElementById('produtoSubgrupo').textContent = produto.subgrupo || 'N/A';
        document.getElementById('produtoTipoCodigo').textContent = produto.tipoCodigo || 'N/A';
        document.getElementById('produtoCodAcesso').textContent = produto.codAcesso || 'N/A';
        
        this.atualizarDisplayEditaveis(produto);
        this.atualizarBotaoEnviar();
        
        const card = document.getElementById('produtoCard');
        card.classList.remove('hidden');
    }

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
    }

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
    }

    // =============================================
    // MÉTODOS DO SCANNER
    // =============================================

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

    // =============================================
    // MÉTODOS AUXILIARES
    // =============================================

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
window.ui = ui;

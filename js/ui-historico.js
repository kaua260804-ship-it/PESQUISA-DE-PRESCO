/**
 * UI-HISTORICO.JS
 * Gerenciamento do histórico de leituras com detalhes das alterações
 */

Object.assign(UI.prototype, {
    /**
     * Adiciona produto ao histórico
     */
    adicionarHistorico(produto) {
        const itemHistorico = {
            seqProd: produto.seqProd,
            descricao: produto.desc || 'Sem descrição',
            timestamp: new Date().toISOString(),
            id: Date.now(),
            alteracoes: produto.alteracoes || [],
            // Salva os valores atuais para comparação futura
            valoresAtuais: {
                nossoPreco: produto.nossoPreco || '',
                precoConcorrente: produto.precoConcorrente || '',
                observacao: produto.observacao || ''
            }
        };
        
        // Verifica se o produto já está no histórico
        const existente = this.historico.find(h => h.seqProd === itemHistorico.seqProd);
        if (existente) {
            // Atualiza o existente com as novas alterações
            existente.alteracoes = itemHistorico.alteracoes;
            existente.valoresAtuais = itemHistorico.valoresAtuais;
            existente.timestamp = itemHistorico.timestamp;
        } else {
            this.historico.unshift(itemHistorico);
            if (this.historico.length > 50) this.historico.pop();
        }
        
        this.salvarHistorico();
        this.renderizarHistorico();
    },

    /**
     * Renderiza o histórico com detalhes das alterações
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
            
            // Mapeia os nomes dos campos para exibição
            const campoNomes = {
                'nossoPreco': 'Nosso Preço',
                'precoConcorrente': 'Preço Concorrente',
                'observacao': 'Observação'
            };
            
            // Gera HTML das alterações
            let alteracoesHTML = '';
            if (item.alteracoes && item.alteracoes.length > 0) {
                alteracoesHTML = `
                    <div class="alteracoes-lista">
                        ${item.alteracoes.map(alt => `
                            <div class="alteracao-item">
                                <span class="campo-nome">${campoNomes[alt.campo] || alt.campo}:</span>
                                <span class="valor-antigo">${alt.valorAntigo || 'Vazio'}</span>
                                <span class="seta">→</span>
                                <span class="valor-novo">${alt.valor || alt.valorNovo || 'Vazio'}</span>
                            </div>
                        `).join('')}
                    </div>
                `;
            }
            
            // Mostra os valores atuais do produto
            let valoresAtuaisHTML = '';
            if (item.valoresAtuais) {
                const v = item.valoresAtuais;
                valoresAtuaisHTML = `
                    <div style="font-size: 0.75rem; color: #666; margin-top: 4px;">
                        <span style="color: #00C853;">💰 Preço: ${v.nossoPreco ? 'R$ ' + parseFloat(v.nossoPreco).toFixed(2) : 'N/I'}</span>
                        <span style="margin-left: 8px; color: #FF6584;">🏷️ Concorrente: ${v.precoConcorrente ? 'R$ ' + parseFloat(v.precoConcorrente).toFixed(2) : 'N/I'}</span>
                    </div>
                `;
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
        
        // Adiciona event listeners
        container.querySelectorAll('.historico-item[data-seqprod]').forEach(item => {
            item.addEventListener('click', () => {
                this.processarCodigo(item.dataset.seqprod);
            });
        });
    },

    // ... resto do código existente (limparHistorico, salvarHistorico, carregarHistorico, exportarCSV, exportarPDF)
});

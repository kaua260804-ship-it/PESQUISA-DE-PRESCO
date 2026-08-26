/**
 * UI-HISTORICO.JS
 * Gerenciamento do histórico de leituras
 */

// Extende a classe UI com métodos de histórico
Object.assign(UI.prototype, {
    /**
     * Adiciona produto ao histórico
     */
    adicionarHistorico(produto) {
        const itemHistorico = {
            seqProd: produto.seqProd,
            descricao: produto.descricao || 'Sem descrição',
            timestamp: new Date().toISOString(),
            id: Date.now(),
            alteracoes: []
        };
        
        // Verifica se o produto já está no histórico
        if (this.historico.length > 0 && this.historico[0].seqProd === itemHistorico.seqProd) {
            this.historico[0].timestamp = itemHistorico.timestamp;
        } else {
            this.historico.unshift(itemHistorico);
            if (this.historico.length > 50) this.historico.pop();
        }
        
        this.salvarHistorico();
        this.renderizarHistorico();
    },

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
            
            // Gera HTML das alterações
            let alteracoesHTML = '';
            if (item.alteracoes && item.alteracoes.length > 0) {
                alteracoesHTML = `
                    <div class="alteracoes-lista" style="margin-top: 8px;">
                        ${item.alteracoes.map(alt => `
                            <div class="alteracao-item" style="font-size: 0.75rem; color: #666; padding: 4px 0;">
                                <i class="fas fa-edit" style="color: #6C63FF;"></i>
                                <strong>${alt.campo}:</strong> 
                                <span style="text-decoration: line-through; color: #999;">${alt.valorAntigo}</span>
                                <i class="fas fa-arrow-right" style="margin: 0 4px;"></i>
                                <strong style="color: #00C853;">${alt.valorNovo}</strong>
                            </div>
                        `).join('')}
                    </div>
                `;
            }
            
            return `
                <div class="historico-item" data-seqprod="${item.seqProd}">
                    <div class="produto-info">
                        <div class="produto-codigo">${item.seqProd}</div>
                        <div class="produto-descricao">${item.descricao}</div>
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
    },

    /**
     * Salva histórico no localStorage
     */
    salvarHistorico() {
        try {
            localStorage.setItem('historico_leituras', JSON.stringify(this.historico));
        } catch (error) {
            console.error('Erro ao salvar histórico:', error);
        }
    },

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
    },

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
            csv += 'Data;Hora;SEQ PROD;Descrição;Campo Alterado;Valor Antigo;Valor Novo\n';
            
            this.historico.forEach(item => {
                const data = new Date(item.timestamp);
                
                if (item.alteracoes && item.alteracoes.length > 0) {
                    item.alteracoes.forEach(alt => {
                        csv += `${data.toLocaleDateString('pt-BR')};${data.toLocaleTimeString('pt-BR')};${item.seqProd};${item.descricao};${alt.campo};${alt.valorAntigo};${alt.valorNovo}\n`;
                    });
                } else {
                    csv += `${data.toLocaleDateString('pt-BR')};${data.toLocaleTimeString('pt-BR')};${item.seqProd};${item.descricao};;;\n`;
                }
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
        }
    },

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
            
            let alteracoesHTML = '';
            if (item.alteracoes && item.alteracoes.length > 0) {
                alteracoesHTML = item.alteracoes.map(alt => `
                    <div style="font-size: 11px; color: #666; margin-top: 5px;">
                        <strong>${alt.campo}:</strong> 
                        <span style="text-decoration: line-through;">${alt.valorAntigo}</span>
                        → <strong style="color: #00C853;">${alt.valorNovo}</strong>
                    </div>
                `).join('');
            }
            
            return `
                <tr>
                    <td>${data.toLocaleDateString('pt-BR')}</td>
                    <td>${data.toLocaleTimeString('pt-BR')}</td>
                    <td>${item.seqProd}</td>
                    <td>${item.descricao}${alteracoesHTML}</td>
                </tr>
            `;
        }).join('');
        
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Histórico de Leituras</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    h1 { color: #6C63FF; font-size: 24px; margin-bottom: 20px; }
                    table { width: 100%; border-collapse: collapse; }
                    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; vertical-align: top; }
                    th { background-color: #f2f2f2; font-weight: bold; }
                    .footer { margin-top: 20px; font-size: 12px; color: #666; }
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
                            <th>Descrição e Alterações</th>
                        </tr>
                    </thead>
                    <tbody>${historicoHTML}</tbody>
                </table>
                <div class="footer">
                    Gerado em: ${new Date().toLocaleString('pt-BR')} | 
                    Total de itens: ${this.historico.length}
                </div>
            </body>
            </html>
        `);
        
        printWindow.document.close();
        
        setTimeout(() => printWindow.print(), 500);
        this.showToast('PDF enviado para impressão!', 'success');
    }
});

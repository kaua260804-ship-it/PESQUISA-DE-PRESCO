class UI {
    constructor() {
        this.historico = [];
        this.produtoAtual = null;
        this.isEditando = false;
        this.produtosAlterados = {};
    }

    initialize() {
        this.carregarHistorico();
        this.carregarAlteracoesPendentes();
        this.bindEvents();
        this.renderizarHistorico();
    }

    bindEvents() {
        const inputCodigo = document.getElementById('inputCodigo');
        if (inputCodigo) {
            inputCodigo.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && inputCodigo.value.trim()) this.processarCodigo(inputCodigo.value.trim());
            });
        }

        const btnScan = document.getElementById('btnScan');
        if (btnScan) btnScan.addEventListener('click', () => this.toggleScanner());

        const btnStopScan = document.getElementById('btnStopScan');
        if (btnStopScan) btnStopScan.addEventListener('click', () => this.fecharScanner());

        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', () => this.iniciarEdicao(btn.dataset.campo));
        });

        document.querySelectorAll('.btn-save').forEach(btn => {
            btn.addEventListener('click', () => this.salvarEdicaoLocal(btn.dataset.campo));
        });

        document.querySelectorAll('.btn-cancel').forEach(btn => {
            btn.addEventListener('click', () => this.finalizarEdicao(btn.dataset.campo));
        });

        const btnEnviar = document.getElementById('btnEnviarAlteracoes');
        if (btnEnviar) btnEnviar.addEventListener('click', () => this.enviarTodasAlteracoes());

        const btnLimparHistorico = document.getElementById('btnLimparHistorico');
        if (btnLimparHistorico) btnLimparHistorico.addEventListener('click', () => this.limparHistorico());

        const btnExportarCSV = document.getElementById('btnExportarCSV');
        if (btnExportarCSV) btnExportarCSV.addEventListener('click', () => this.exportarCSV());

        const btnExportarPDF = document.getElementById('btnExportarPDF');
        if (btnExportarPDF) btnExportarPDF.addEventListener('click', () => this.exportarPDF());

        const btnFecharCard = document.getElementById('btnFecharCard');
        if (btnFecharCard) btnFecharCard.addEventListener('click', () => this.fecharCard());
    }

    // --- HISTÓRICO (CORRIGIDO) ---
    carregarHistorico() {
        try {
            const saved = localStorage.getItem('historico_leituras');
            this.historico = saved ? JSON.parse(saved) : [];
        } catch (e) { this.historico = []; }
    }

    salvarHistorico() {
        localStorage.setItem('historico_leituras', JSON.stringify(this.historico));
    }

    adicionarHistorico(produto) {
        if (!produto || !produto.seqProd) return;
        
        const item = {
            seqProd: produto.seqProd,
            descricao: produto.desc || 'Sem descrição',
            timestamp: new Date().toISOString(),
            valoresAtuais: {
                nossoPreco: produto.nossoPreco || '',
                precoConcorrente: produto.precoConcorrente || '',
                observacao: produto.observacao || ''
            }
        };
        
        const idx = this.historico.findIndex(h => h.seqProd === item.seqProd);
        if (idx > -1) {
            this.historico[idx] = item; // Atualiza os valores atuais se já existir
            // Move para o topo
            this.historico.splice(idx, 1);
            this.historico.unshift(this.historico[idx]);
        } else {
            this.historico.unshift(item);
            if (this.historico.length > 50) this.historico.pop();
        }
        
        this.salvarHistorico();
        this.renderizarHistorico();
    }

    // Atualiza os valores do histórico quando o usuário salva localmente
    atualizarHistoricoLocal(seqProd, campo, valor) {
        const idx = this.historico.findIndex(h => h.seqProd === seqProd);
        if (idx > -1) {
            this.historico[idx].valoresAtuais[campo] = valor;
            this.salvarHistorico();
            this.renderizarHistorico();
        }
    }

    renderizarHistorico() {
        const container = document.getElementById('historicoLista');
        if (!container) return;
        
        if (this.historico.length === 0) {
            container.innerHTML = '<div class="historico-item" style="justify-content: center;">Nenhuma leitura registrada</div>';
            return;
        }
        
        container.innerHTML = this.historico.map(item => {
            const data = new Date(item.timestamp);
            const v = item.valoresAtuais;
            
            let valoresStr = [];
            if (v.nossoPreco) valoresStr.push(`💰 R$ ${v.nossoPreco}`);
            if (v.precoConcorrente) valoresStr.push(`🏷️ R$ ${v.precoConcorrente}`);
            
            return `
                <div class="historico-item" data-seqprod="${item.seqProd}">
                    <div class="produto-info">
                        <div class="produto-codigo">${item.seqProd}</div>
                        <div class="produto-descricao">${item.descricao}</div>
                        <div style="font-size: 0.75rem; color: #666;">${valoresStr.join(' | ')}</div>
                    </div>
                    <div class="produto-hora">${data.toLocaleDateString('pt-BR')} ${data.toLocaleTimeString('pt-BR')}</div>
                </div>
            `;
        }).join('');

        container.querySelectorAll('.historico-item[data-seqprod]').forEach(el => {
            el.addEventListener('click', () => this.processarCodigo(el.dataset.seqprod));
        });
    }

    // --- EDIÇÃO E SALVAMENTO ---
    salvarEdicaoLocal(campo) {
        if (!this.produtoAtual) return;
        const input = document.getElementById(`input${this.capitalizar(campo)}`);
        const novoValor = input.value.trim();
        const seqProd = this.produtoAtual.seqProd;

        if (!this.produtosAlterados[seqProd]) this.produtosAlterados[seqProd] = [];
        
        const pendentes = this.produtosAlterados[seqProd];
        const existente = pendentes.find(p => p.campo === campo);
        if (existente) existente.valor = novoValor;
        else pendentes.push({ campo, valor: novoValor });

        // Atualiza no histórico local para aparecer na exportação corretamente
        this.atualizarHistoricoLocal(seqProd, campo, novoValor);
        this.produtoAtual[campo] = novoValor;

        this.salvarAlteracoesPendentes();
        this.finalizarEdicao(campo);
        this.atualizarDisplayEditaveis(this.produtoAtual);
        this.showToast('✅ Salvo localmente!', 'success');
    }

    async enviarTodasAlteracoes() {
        const seqs = Object.keys(this.produtosAlterados);
        if (seqs.length === 0) return;

        const btn = document.getElementById('btnEnviarAlteracoes');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';

        try {
            // Monta array para o batchUpdate
            const alteracoes = [];
            const arvore = await api.carregarArvore();
            
            for (const seq of seqs) {
                const info = arvore.map[seq];
                if (!info) continue;
                for (const alt of this.produtosAlterados[seq]) {
                    alteracoes.push({ seqProd: seq, campo: alt.campo, valor: alt.valor, linha: info.linha });
                }
            }

            const res = await api.atualizarLote(alteracoes);
            
            this.showToast(`✅ ${res.total} células atualizadas com sucesso!`, 'success');
            this.produtosAlterados = {};
            this.salvarAlteracoesPendentes();
            
        } catch (error) {
            this.showToast(`❌ Erro: ${error.message}`, 'error');
            // Se o usuário cancelar o login do Google, o erro será pego aqui
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-upload"></i> Enviar Alterações';
            this.atualizarBotaoEnviar();
        }
    }

    // --- EXPORTAÇÃO ---
    exportarCSV() {
        if (this.historico.length === 0) return this.showToast('Vazio!', 'warning');
        let csv = '\uFEFFData;Hora;SEQ;Descrição;Preço;Concorrente;Observação\n';
        
        this.historico.forEach(item => {
            const d = new Date(item.timestamp);
            const v = item.valoresAtuais;
            csv += `${d.toLocaleDateString('pt-BR')};${d.toLocaleTimeString('pt-BR')};${item.seqProd};${item.descricao};${v.nossoPreco};${v.precoConcorrente};${v.observacao}\n`;
        });
        
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `historico.csv`;
        link.click();
    }

    exportarPDF() {
        if (this.historico.length === 0) return this.showToast('Vazio!', 'warning');
        const win = window.open('', '_blank');
        
        let html = `<html><head><title>Histórico</title><style>body{font-family:sans-serif;} table{width:100%;border-collapse:collapse;} th,td{border:1px solid #ccc;padding:8px;}</style></head><body>`;
        html += `<h1>Histórico de Leituras</h1><table><tr><th>Data</th><th>SEQ</th><th>Descrição</th><th>Preço</th><th>Concorrente</th><th>Obs</th></tr>`;
        
        this.historico.forEach(item => {
            const d = new Date(item.timestamp);
            const v = item.valoresAtuais;
            html += `<tr><td>${d.toLocaleString('pt-BR')}</td><td>${item.seqProd}</td><td>${item.descricao}</td><td>${v.nossoPreco}</td><td>${v.precoConcorrente}</td><td>${v.observacao}</td></tr>`;
        });
        
        html += `</table><script>window.print();</script></body></html>`;
        win.document.write(html);
        win.document.close();
    }
    
    // ... (Manter métodos auxiliares: carregarAlteracoesPendentes, salvarAlteracoesPendentes, processarCodigo, exibirProduto, iniciarEdicao, finalizarEdicao, atualizarDisplayEditaveis, toggleScanner, fecharScanner, etc.)
    
    capitalizar(t) { return t ? t.charAt(0).toUpperCase() + t.slice(1) : ''; }
    showToast(msg, type) { /* ... */ }
    atualizarBotaoEnviar() { /* ... */ }
}

const ui = new UI();

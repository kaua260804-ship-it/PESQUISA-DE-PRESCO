class UI {
    constructor() {
        this.historico = [];
        this.produtoAtual = null;
        this.isEditando = false;
        this.produtosAlterados = {};
    }

    initialize() {
        this.carregarAlteracoes();
        this.carregarHistorico();
        this.bindEvents();
        this.renderizarHistorico();
        
        if (typeof scanner !== 'undefined') {
            scanner.onStop(() => this.fecharScanner());
        }
    }

    bindEvents() {
        const inputCodigo = document.getElementById('inputCodigo');
        if (inputCodigo) {
            inputCodigo.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && inputCodigo.value.trim()) {
                    this.processarCodigo(inputCodigo.value.trim());
                }
            });
        }

        document.getElementById('btnScan')?.addEventListener('click', () => this.toggleScanner());
        document.getElementById('btnStopScan')?.addEventListener('click', () => this.fecharScanner());
        document.getElementById('btnFecharCard')?.addEventListener('click', () => this.fecharCard());
        document.getElementById('btnEnviarAlteracoes')?.addEventListener('click', () => this.enviarTodasAlteracoes());
        document.getElementById('btnLimparHistorico')?.addEventListener('click', () => this.limparHistorico());
        document.getElementById('btnExportarCSV')?.addEventListener('click', () => this.exportarCSV());
        document.getElementById('btnExportarPDF')?.addEventListener('click', () => this.exportarPDF());
        
        // Botão de Refresh (Força ler os XLSX novamente)
        document.getElementById('btnRefresh')?.addEventListener('click', async () => {
            this.showLoading(true);
            try {
                await api.carregarArvore(true);
                await api.carregarBase();
                this.showToast('Dados recarregados!', 'success');
            } catch(e) {
                this.showToast('Erro ao recarregar.', 'error');
            } finally {
                this.showLoading(false);
            }
        });

        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', () => this.iniciarEdicao(btn.dataset.campo));
        });

        document.querySelectorAll('.btn-save').forEach(btn => {
            btn.addEventListener('click', () => this.salvarEdicaoLocal(btn.dataset.campo));
        });

        const inputBusca = document.getElementById('inputBusca');
        let buscaTimeout;
        if (inputBusca) {
            inputBusca.addEventListener('input', (e) => {
                clearTimeout(buscaTimeout);
                const termo = e.target.value;
                buscaTimeout = setTimeout(() => this.buscarProdutos(termo), 400);
            });
        }
    }

    // --- EDIÇÃO E HISTÓRICO ---
    carregarAlteracoes() {
        const saved = localStorage.getItem('alteracoes_pendentes');
        this.produtosAlterados = saved ? JSON.parse(saved) : {};
        this.atualizarBotaoEnviar();
    }

    salvarAlteracoes() {
        localStorage.setItem('alteracoes_pendentes', JSON.stringify(this.produtosAlterados));
        this.atualizarBotaoEnviar();
    }

    carregarHistorico() {
        const saved = localStorage.getItem('historico_leituras');
        this.historico = saved ? JSON.parse(saved) : [];
    }

    salvarHistorico() {
        localStorage.setItem('historico_leituras', JSON.stringify(this.historico));
    }

    adicionarHistorico(produto) {
        if (!produto) return;
        const item = {
            seqProd: produto.seqProd,
            descricao: produto.desc,
            timestamp: new Date().toISOString(),
            valoresAtuais: {
                nossoPreco: produto.nossoPreco || '',
                precoConcorrente: produto.precoConcorrente || '',
                observacao: produto.observacao || ''
            }
        };
        
        const idx = this.historico.findIndex(h => h.seqProd === item.seqProd);
        if (idx > -1) {
            this.historico[idx] = item;
            this.historico.splice(idx, 1);
        }
        this.historico.unshift(item);
        if (this.historico.length > 50) this.historico.pop();
        
        this.salvarHistorico();
        this.renderizarHistorico();
    }

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
        
        this.salvarAlteracoes();
        this.produtoAtual[campo] = novoValor;
        this.atualizarHistoricoLocal(seqProd, campo, novoValor);
        
        this.finalizarEdicao(campo);
        this.atualizarDisplayEditaveis(this.produtoAtual);
        this.showToast('✅ Salvo localmente!', 'success');
    }

    atualizarHistoricoLocal(seqProd, campo, valor) {
        const idx = this.historico.findIndex(h => h.seqProd === seqProd);
        if (idx > -1) {
            this.historico[idx].valoresAtuais[campo] = valor;
            this.salvarHistorico();
            this.renderizarHistorico();
        }
    }

    // --- ENVIO EM LOTE ---
    async enviarTodasAlteracoes() {
        const seqs = Object.keys(this.produtosAlterados);
        if (seqs.length === 0) return;

        const btn = document.getElementById('btnEnviarAlteracoes');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';

        try {
            const arvore = await api.carregarArvore(); 
            const dadosParaEnviar = [];

            for (const seq of seqs) {
                const info = arvore.map[seq];
                if (!info) continue;
                
                const pendentes = this.produtosAlterados[seq];
                const getVal = (campo) => {
                    const p = pendentes.find(x => x.campo === campo);
                    return p ? p.valor : info[campo];
                };

                dadosParaEnviar.push({
                    seqProd: seq,
                    desc: info.desc,
                    categoria: info.categoria,
                    nossoPreco: getVal('nossoPreco'),
                    precoConcorrente: getVal('precoConcorrente')
                });
            }

            const res = await api.enviarResultadosLote(dadosParaEnviar);
            
            this.showToast(`✅ ${res.total} produtos enviados para a planilha!`, 'success');
            this.produtosAlterados = {};
            this.salvarAlteracoes();
            
            document.querySelectorAll('.editable-item').forEach(el => el.classList.remove('pending'));

        } catch (error) {
            this.showToast(`❌ Erro: ${error.message}`, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = `<i class="fas fa-upload"></i> Enviar Resultados <span class="badge" id="badgeAlteracoes">0</span>`;
            this.atualizarBotaoEnviar();
        }
    }

    atualizarBotaoEnviar() {
        const total = Object.values(this.produtosAlterados).reduce((acc, arr) => acc + arr.length, 0);
        const btn = document.getElementById('btnEnviarAlteracoes');
        const badge = document.getElementById('badgeAlteracoes');
        if (btn && badge) {
            btn.style.display = total > 0 ? 'flex' : 'none';
            badge.textContent = total;
            btn.disabled = total === 0;
        }
    }

    // --- BUSCA E PRODUTO ---
    async processarCodigo(codigo) {
        this.showLoading(true);
        try {
            let produto = await api.buscarPorEAN(codigo) || await api.buscarPorSeq(codigo);
            if (produto) {
                this.exibirProduto(produto);
                this.adicionarHistorico(produto);
                this.scrollParaProduto();
            } else {
                this.showToast('Produto não encontrado.', 'warning');
            }
        } catch (e) {
            console.error(e);
            this.showToast('Erro na busca. Verifique os arquivos XLSX.', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    exibirProduto(produto) {
        this.produtoAtual = produto;
        
        const setTxt = (id, val) => { if(document.getElementById(id)) document.getElementById(id).textContent = val || '-'; };
        setTxt('produtoCodigo', produto.seqProd);
        setTxt('produtoDescricao', produto.desc);
        setTxt('produtoComprador', produto.comprador);
        setTxt('produtoCategoria', produto.categoria);
        setTxt('produtoGrupo', produto.grupo);
        setTxt('produtoSubgrupo', produto.subgrupo);

        this.atualizarDisplayEditaveis(produto);
        document.getElementById('produtoCard').classList.remove('hidden');
    }

    atualizarDisplayEditaveis(produto) {
        const pendentes = this.produtosAlterados[produto.seqProd] || [];
        const getVal = (campo) => {
            const p = pendentes.find(x => x.campo === campo);
            return p ? p.valor : produto[campo];
        };

        const vPreco = getVal('nossoPreco');
        const vConc = getVal('precoConcorrente');
        const vObs = getVal('observacao');

        const setTxt = (id, val) => { if(document.getElementById(id)) document.getElementById(id).textContent = val; };
        
        setTxt('displayNossoPreco', vPreco ? `R$ ${parseFloat(vPreco).toFixed(2)}` : 'Não informado');
        setTxt('displayPrecoConcorrente', vConc ? `R$ ${parseFloat(vConc).toFixed(2)}` : 'Não informado');
        setTxt('displayObservacao', vObs || 'Sem observações');
    }

    // --- HISTÓRICO RENDER & EXPORT ---
    renderizarHistorico() {
        const container = document.getElementById('historicoLista');
        if (!container) return;
        
        if (this.historico.length === 0) {
            container.innerHTML = '<div style="text-align:center; padding: 20px; color: #888;">Nenhum item consultado.</div>';
            return;
        }

        container.innerHTML = this.historico.map(item => {
            const d = new Date(item.timestamp);
            const v = item.valoresAtuais;
            let valoresStr = [];
            if (v.nossoPreco) valoresStr.push(`💰 R$ ${v.nossoPreco}`);
            if (v.precoConcorrente) valoresStr.push(`🏷️ R$ ${v.precoConcorrente}`);
            
            return `
                <div class="historico-item" onclick="ui.processarCodigo('${item.seqProd}')">
                    <div class="produto-info">
                        <div class="produto-codigo">${item.seqProd}</div>
                        <div class="produto-descricao">${item.descricao}</div>
                        <div style="font-size: 0.75rem; color: #666;">${valoresStr.join(' | ')}</div>
                    </div>
                    <div class="produto-hora">${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR')}</div>
                </div>
            `;
        }).join('');
    }

    exportarCSV() {
        if (this.historico.length === 0) return this.showToast('Vazio', 'warning');
        let csv = '\uFEFFData;Hora;SEQ;Descrição;Nosso Preço;Concorrente;Observação\n';
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
        if (this.historico.length === 0) return this.showToast('Vazio', 'warning');
        const win = window.open('', '_blank');
        let html = `<html><head><title>Histórico</title><style>body{font-family:sans-serif;padding:20px;} table{width:100%;border-collapse:collapse;margin-top:20px;} th,td{border:1px solid #ccc;padding:10px;text-align:left;} th{background:#6C63FF;color:white;}</style></head><body>`;
        html += `<h1>Histórico de Consultas</h1><table><tr><th>Data/Hora</th><th>SEQ</th><th>Descrição</th><th>Preço</th><th>Concorrente</th><th>Obs</th></tr>`;
        this.historico.forEach(item => {
            const d = new Date(item.timestamp);
            const v = item.valoresAtuais;
            html += `<tr><td>${d.toLocaleString('pt-BR')}</td><td>${item.seqProd}</td><td>${item.descricao}</td><td>${v.nossoPreco}</td><td>${v.precoConcorrente}</td><td>${v.observacao}</td></tr>`;
        });
        html += `</table><script>window.print();</script></body></html>`;
        win.document.write(html);
        win.document.close();
    }

    limparHistorico() {
        if (confirm('Apagar histórico?')) {
            this.historico = [];
            this.salvarHistorico();
            this.renderizarHistorico();
        }
    }

    // --- AUXILIARES ---
    iniciarEdicao(campo) {
        if (this.isEditando) return;
        this.isEditando = true;
        document.getElementById(`display${this.capitalizar(campo)}`).classList.add('hidden');
        const box = document.querySelector(`.editable-input[data-campo="${campo}"]`);
        box.classList.remove('hidden');
        
        const input = document.getElementById(`input${this.capitalizar(campo)}`);
        input.value = this.produtoAtual[campo] || '';
        input.focus();
    }

    finalizarEdicao(campo) {
        this.isEditando = false;
        document.getElementById(`display${this.capitalizar(campo)}`).classList.remove('hidden');
        document.querySelector(`.editable-input[data-campo="${campo}"]`).classList.add('hidden');
    }

    fecharCard() {
        document.getElementById('produtoCard').classList.add('hidden');
        this.produtoAtual = null;
    }

    scrollParaProduto() {
        setTimeout(() => {
            const el = document.getElementById('produtoCard');
            if (el) window.scrollTo({ top: el.offsetTop - 20, behavior: 'smooth' });
        }, 100);
    }

    async toggleScanner() {
        const area = document.getElementById('scannerArea');
        if (area.classList.contains('hidden')) {
            try {
                if (!await scanner.hasCamera()) return this.showToast('Sem câmera', 'error');
                area.classList.remove('hidden');
                await scanner.initialize('qr-reader');
                await scanner.start((codigo) => this.processarCodigo(codigo));
            } catch (e) {
                area.classList.add('hidden');
                this.showToast('Erro na câmera', 'error');
            }
        } else {
            this.fecharScanner();
        }
    }

    fecharScanner() {
        document.getElementById('scannerArea').classList.add('hidden');
        if(typeof scanner !== 'undefined') scanner.stop();
    }

    showLoading(show) {
        const el = document.getElementById('loadingSpinner');
        if (el) el.style.display = show ? 'flex' : 'none';
    }

    showToast(msg, type) {
        const container = document.getElementById('toastContainer');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check' : 'fa-exclamation'}"></i> <span>${msg}</span>`;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), CONFIG.TOAST_DURATION || 3000);
    }

    capitalizar(t) { return t ? t.charAt(0).toUpperCase() + t.slice(1) : ''; }
    
    async buscarProdutos(termo) {
        if (!termo || termo.length < 2) return document.getElementById('resultadosBusca').classList.add('hidden');
        const res = await api.buscarPorDescricao(termo);
        const container = document.getElementById('resultadosBusca');
        if (res.length === 0) {
            container.innerHTML = '<div style="padding:10px;">Nenhum resultado.</div>';
        } else {
            container.innerHTML = res.map(p => `
                <div class="search-result-item" onclick="ui.processarCodigo('${p.seqProd}')">
                    <strong>${p.seqProd}</strong> - ${p.desc}
                </div>
            `).join('');
        }
        container.classList.remove('hidden');
    }
}

const ui = new UI();
window.ui = ui;

/**
 * SCANNER.JS
 * Lógica do leitor de código de barras
 */

class Scanner {
    constructor() {
        this.html5QrCode = null;
        this.isScanning = false;
        this.onScanCallback = null;
        this.onStopCallback = null;
    }

    /**
     * Inicializa o scanner
     * @param {string} elementId - ID do elemento HTML para o scanner
     */
    async initialize(elementId) {
        try {
            if (typeof Html5Qrcode === 'undefined') {
                throw new Error('Biblioteca Html5Qrcode não carregada');
            }
            
            // Se já existir uma instância, destrói para evitar conflitos
            if (this.html5QrCode) {
                this.html5QrCode = null;
            }

            this.html5QrCode = new Html5Qrcode(elementId);
            console.log('📷 Scanner inicializado');
        } catch (error) {
            console.error('❌ Erro ao inicializar scanner:', error);
            throw error;
        }
    }

    /**
     * Inicia a leitura de código de barras
     * @param {Function} onScanCallback - Callback chamado quando um código é lido
     */
    async start(onScanCallback) {
        try {
            if (!this.html5QrCode) {
                throw new Error('Scanner não inicializado');
            }

            if (this.isScanning) {
                await this.stop();
            }

            this.onScanCallback = onScanCallback;
            this.isScanning = true;

            await this.html5QrCode.start(
                { facingMode: "environment" },
                { fps: 10, qrbox: { width: 250, height: 250 } },
                (decodedText) => {
                    // Código detectado
                    console.log('📷 Código detectado:', decodedText);
                    
                    // Vibração no celular (se suportado)
                    if (navigator.vibrate) navigator.vibrate(200);
                    
                    // Para o scanner imediatamente
                    this.stop();
                    
                    // Executa o callback da UI
                    if (this.onScanCallback) {
                        this.onScanCallback(decodedText);
                    }
                },
                (errorMessage) => {
                    // Ignora erros de leitura contínua (normal acontecer)
                }
            );

        } catch (error) {
            console.error('❌ Erro ao iniciar scanner:', error);
            this.isScanning = false;
            throw error;
        }
    }

    /**
     * Para o scanner e limpa a área
     */
    async stop() {
        try {
            if (this.html5QrCode && this.isScanning) {
                await this.html5QrCode.stop();
                this.isScanning = false;
                console.log('📷 Scanner parado');
                
                // Limpa o elemento HTML
                const element = document.getElementById('qr-reader');
                if (element) element.innerHTML = '';
                
                // Notifica a UI para fechar a caixa do scanner
                if (typeof this.onStopCallback === 'function') {
                    this.onStopCallback();
                }
            }
        } catch (error) {
            console.error('❌ Erro ao parar scanner:', error);
            this.isScanning = false;
        }
    }

    /**
     * Define callback para quando o scanner parar
     */
    onStop(callback) {
        this.onStopCallback = callback;
    }

    /**
     * Verifica se o dispositivo tem câmera
     */
    async hasCamera() {
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                return false;
            }
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            stream.getTracks().forEach(track => track.stop());
            return true;
        } catch (error) {
            console.error('❌ Erro ao verificar câmera:', error);
            return false;
        }
    }
}

// Instância global do scanner
const scanner = new Scanner();

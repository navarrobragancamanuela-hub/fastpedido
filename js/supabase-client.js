// ===== CONFIGURAÇÃO E CONSTANTES =====
const SUPABASE_CONFIG = {
    URL: 'https://zkjljrxmnakwdtjdjgvr.supabase.co',
    ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpramxqcnhtbmFrd2R0amRqZ3ZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1MDg0NTQsImV4cCI6MjA3NTA4NDQ1NH0.YBafYqeWjGSr3qKZidWn3842Ec2bDF_CST3U0EqUr5E',
    OPTIONS: {
        auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true
        },
        realtime: {
            params: {
                eventsPerSecond: 10
            }
        }
    }
};

// ===== VALIDAÇÃO DE CONFIGURAÇÃO =====
/**
 * Valida se as credenciais do Supabase estão configuradas corretamente
 */
function validarConfiguracaoSupabase() {
    const erros = [];

    if (!SUPABASE_CONFIG.URL || SUPABASE_CONFIG.URL === 'https://seu-projeto.supabase.co') {
        erros.push('URL do Supabase não configurada');
    }

    if (!SUPABASE_CONFIG.ANON_KEY || SUPABASE_CONFIG.ANON_KEY.includes('sua-chave-anon-public')) {
        erros.push('Chave anônima do Supabase não configurada');
    }

    if (!SUPABASE_CONFIG.URL.startsWith('https://')) {
        erros.push('URL do Supabase deve usar HTTPS');
    }

    if (SUPABASE_CONFIG.ANON_KEY.length < 20) {
        erros.push('Chave anônima do Supabase parece inválida');
    }

    return erros;
}

// ===== INICIALIZAÇÃO DO CLIENTE =====
/**
 * Inicializa o cliente Supabase com tratamento de erro robusto
 */
function inicializarClienteSupabase() {
    console.group('🔐 Inicializando Supabase Client');

    try {
        // Validar configuração antes de inicializar
        const errosValidacao = validarConfiguracaoSupabase();
        if (errosValidacao.length > 0) {
            throw new Error(`Configuração inválida: ${errosValidacao.join(', ')}`);
        }

        // Verificar se a biblioteca Supabase está carregada
        if (typeof window.supabase === 'undefined') {
            throw new Error('Biblioteca Supabase JS não carregada. Verifique se o script foi incluído.');
        }

        // Criar instância do cliente
        const cliente = window.supabase.createClient(
            SUPABASE_CONFIG.URL, 
            SUPABASE_CONFIG.ANON_KEY, 
            SUPABASE_CONFIG.OPTIONS
        );

        console.log('✅ Cliente Supabase inicializado com sucesso');
        console.log('📊 Configuração:', {
            url: SUPABASE_CONFIG.URL,
            keyLength: SUPABASE_CONFIG.ANON_KEY.length,
            options: SUPABASE_CONFIG.OPTIONS
        });

        return cliente;

    } catch (error) {
        console.error('❌ Falha na inicialização do Supabase:', error);
        
        // Fornecer feedback útil para o usuário
        exibirErroConfiguracao(error);
        
        // Retornar cliente mock para evitar quebra completa
        return criarClienteMock();
    } finally {
        console.groupEnd();
    }
}

// ===== CLIENTE MOCK PARA FALLBACK =====
/**
 * Cria cliente mock para quando o Supabase não está disponível
 */
function criarClienteMock() {
    console.warn('⚠️ Usando cliente mock do Supabase - funcionalidade limitada');

    return {
        from: () => ({
            select: () => ({
                order: () => Promise.resolve({ data: [], error: null })
            }),
            insert: () => Promise.resolve({ data: null, error: new Error('Supabase não configurado') }),
            update: () => Promise.resolve({ data: null, error: new Error('Supabase não configurado') }),
            delete: () => Promise.resolve({ data: null, error: new Error('Supabase não configurado') })
        }),
        storage: {
            from: () => ({
                upload: () => Promise.resolve({ data: null, error: new Error('Storage não disponível') }),
                getPublicUrl: () => ({ data: { publicUrl: '' } })
            })
        },
        auth: {
            onAuthStateChange: () => ({ data: null, error: null })
        }
    };
}

// ===== VERIFICAÇÃO DE CONEXÃO =====
/**
 * Verifica se a conexão com o Supabase está funcionando
 */
async function verificarConexaoSupabase() {
    try {
        console.group('🔍 Verificando conexão com Supabase');

        const { data, error } = await supabase
            .from('produtos')
            .select('count', { count: 'exact', head: true })
            .limit(1);

        if (error) {
            throw new Error(`Falha na consulta: ${error.message}`);
        }

        console.log('✅ Conexão com Supabase verificada com sucesso');
        console.log('📈 Status: Conectado e respondendo');
        
        return {
            conectado: true,
            detalhes: 'Conexão estabelecida com sucesso',
            timestamp: new Date().toISOString()
        };

    } catch (error) {
        console.error('❌ Falha na verificação de conexão:', error);
        
        return {
            conectado: false,
            erro: error.message,
            timestamp: new Date().toISOString(),
            sugestao: 'Verifique sua conexão com a internet e as credenciais do Supabase'
        };
    } finally {
        console.groupEnd();
    }
}

// ===== MONITORAMENTO DE SAÚDE =====
/**
 * Monitora a saúde da conexão com o Supabase
 */
class MonitorSupabase {
    constructor() {
        this.ultimaVerificacao = null;
        this.status = 'desconhecido';
        this.tentativas = 0;
        this.maxTentativas = 3;
    }

    async verificarSaude() {
        this.tentativas++;
        
        try {
            const resultado = await verificarConexaoSupabase();
            this.ultimaVerificacao = new Date();
            this.status = resultado.conectado ? 'saudavel' : 'erro';
            this.tentativas = 0;

            return resultado;

        } catch (error) {
            this.status = 'erro';
            
            if (this.tentativas >= this.maxTentativas) {
                console.error(`🚨 Supabase offline após ${this.tentativas} tentativas`);
                this.notificarDegradacao();
            }

            throw error;
        }
    }

    notificarDegradacao() {
        // Em uma aplicação real, aqui você poderia:
        // - Enviar para um serviço de monitoramento
        // - Mostrar alerta para o usuário
        // - Tentar reconexão automática
        
        console.warn('🚨 Serviço Supabase apresentando degradação');
        
        if (typeof window !== 'undefined') {
            // Opcional: mostrar notificação não intrusiva para o usuário
            setTimeout(() => {
                if (this.status === 'erro') {
                    this.mostrarNotificacaoDegradacao();
                }
            }, 5000);
        }
    }

    mostrarNotificacaoDegradacao() {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #f39c12;
            color: white;
            padding: 12px 16px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            max-width: 300px;
            font-family: system-ui, sans-serif;
        `;
        
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <i class="fas fa-exclamation-triangle"></i>
                <strong>Problema de conexão</strong>
            </div>
            <div style="font-size: 0.9em; margin-top: 4px; opacity: 0.9;">
                Algumas funcionalidades podem estar limitadas.
            </div>
        `;

        document.body.appendChild(notification);

        // Auto-remover após 8 segundos
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.opacity = '0';
                notification.style.transform = 'translateY(10px)';
                setTimeout(() => notification.remove(), 300);
            }
        }, 8000);
    }

    getStatus() {
        return {
            status: this.status,
            ultimaVerificacao: this.ultimaVerificacao,
            tentativas: this.tentativas
        };
    }
}

// ===== TRATAMENTO DE ERROS =====
/**
 * Exibe erro de configuração de forma amigável
 */
function exibirErroConfiguracao(error) {
    if (typeof window === 'undefined') return;

    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: #e74c3c;
        color: white;
        padding: 15px 20px;
        text-align: center;
        z-index: 10000;
        font-family: system-ui, sans-serif;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    `;

    errorDiv.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; gap: 10px;">
            <i class="fas fa-exclamation-triangle"></i>
            <div>
                <strong>Erro de Configuração</strong>
                <div style="font-size: 0.9em; opacity: 0.9;">${error.message}</div>
            </div>
            <button onclick="this.parentElement.parentElement.remove()" 
                    style="background: none; border: none; color: white; cursor: pointer; margin-left: auto;">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;

    document.body.appendChild(errorDiv);
}

/**
 * Utilitário para tratamento consistente de erros do Supabase
 */
class TratadorErrosSupabase {
    static tratarErro(error, contexto = 'Operação do Supabase') {
        console.error(`❌ ${contexto}:`, error);

        // Mapeamento de erros comuns para mensagens amigáveis
        const mensagensErro = {
            'JWT': 'Erro de autenticação. Recarregue a página.',
            'Network': 'Erro de conexão. Verifique sua internet.',
            'duplicate key': 'Já existe um item com estes dados.',
            'violates foreign key': 'Não é possível excluir item vinculado a outros dados.',
            'JSON': 'Dados inválidos no formulário.'
        };

        const mensagemErro = error.message;
        let mensagemAmigavel = 'Erro inesperado. Tente novamente.';

        for (const [chave, mensagem] of Object.entries(mensagensErro)) {
            if (mensagemErro.includes(chave)) {
                mensagemAmigavel = mensagem;
                break;
            }
        }

        return {
            erroOriginal: error,
            mensagemAmigavel,
            contexto,
            timestamp: new Date().toISOString()
        };
    }

    static async executarComRetry(operacao, maxTentativas = 3, delay = 1000) {
        for (let tentativa = 1; tentativa <= maxTentativas; tentativa++) {
            try {
                const resultado = await operacao();
                return resultado;
            } catch (error) {
                console.warn(`⚠️ Tentativa ${tentativa}/${maxTentativas} falhou:`, error);

                if (tentativa === maxTentativas) {
                    throw error;
                }

                // Esperar antes da próxima tentativa (com backoff exponencial)
                await new Promise(resolve => 
                    setTimeout(resolve, delay * Math.pow(2, tentativa - 1))
                );
            }
        }
    }
}

// ===== INICIALIZAÇÃO E EXPORTAÇÕES =====
// Inicializar cliente Supabase
const supabase = inicializarClienteSupabase();

// Inicializar monitor de saúde
const monitorSupabase = new MonitorSupabase();

// Verificação inicial de conexão (não-bloqueante)
setTimeout(async () => {
    try {
        await monitorSupabase.verificarSaude();
        
        // Verificação periódica a cada 2 minutos
        setInterval(() => {
            monitorSupabase.verificarSaude().catch(console.warn);
        }, 120000);
        
    } catch (error) {
        console.warn('⚠️ Verificação inicial de saúde falhou:', error);
    }
}, 2000);

// Exportações para uso global
window.supabase = supabase;
window.monitorSupabase = monitorSupabase;
window.TratadorErrosSupabase = TratadorErrosSupabase;

console.log('🎯 Supabase Client refinado carregado com sucesso!');
console.log('📋 Recursos disponíveis:');
console.log('   • Cliente Supabase: window.supabase');
console.log('   • Monitor de saúde: window.monitorSupabase');
console.log('   • Tratador de erros: window.TratadorErrosSupabase');

// Verificação final
console.log('🔍 Status inicial:', monitorSupabase.getStatus());
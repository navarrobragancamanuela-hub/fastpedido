// ===== CONFIGURAÇÕES E CONSTANTES =====
const CONFIG = {
    MENSAGEM_TIMEOUT: 5000,
    REDIRECT_DELAY: 2000,
    DEBOUNCE_DELAY: 300,
    MAX_QUANTIDADE: 999,
    MIN_QUANTIDADE: 1
};

// ===== ESTADO DA APLICAÇÃO =====
let estadoApp = {
    formPedido: null,
    itensContainer: null,
    messageArea: null,
    submitBtn: null,
    produtosDisponiveis: [],
    pedidoEmProcessamento: false,
    ultimoPedidoCriado: null
};

// ===== INICIALIZAÇÃO =====
document.addEventListener('DOMContentLoaded', async () => {
    await inicializarAplicacao();
});

/**
 * Inicializa toda a aplicação do novo pedido
 */
async function inicializarAplicacao() {
    try {
        console.group('🚀 Inicializando Novo Pedido');
        
        if (!await inicializarElementosDOM()) return;
        if (!await inicializarSupabase()) return;
        
        await carregarProdutos();
        adicionarItem(); // Item inicial
        
        configurarEventListeners();
        
        console.log('✅ Aplicação inicializada com sucesso');
        console.groupEnd();
        
    } catch (error) {
        console.error('❌ Falha na inicialização:', error);
        mostrarMensagem('Erro ao inicializar a aplicação', 'error');
    }
}

/**
 * Inicializa e valida todos os elementos DOM necessários
 */
async function inicializarElementosDOM() {
    const elementos = {
        formPedido: document.getElementById('form-pedido'),
        itensContainer: document.getElementById('itens-container'),
        messageArea: document.getElementById('message-area'),
        submitBtn: document.getElementById('submit-btn')
    };

    // Validar elementos críticos
    const elementosFaltantes = Object.entries(elementos)
        .filter(([_, element]) => !element)
        .map(([name]) => name);

    if (elementosFaltantes.length > 0) {
        console.error('❌ Elementos DOM não encontrados:', elementosFaltantes);
        mostrarMensagem('Erro: Elementos da página não carregados corretamente', 'error');
        return false;
    }

    estadoApp = { ...estadoApp, ...elementos };
    console.log('📦 Elementos DOM inicializados');
    return true;
}

/**
 * Verifica se o Supabase está configurado corretamente
 */
async function inicializarSupabase() {
    if (typeof supabase === 'undefined') {
        console.error('❌ Supabase não está definido');
        mostrarMensagem('Erro de configuração do banco de dados', 'error');
        return false;
    }
    
    try {
        // Teste simples de conexão
        await supabase.from('produtos').select('count', { count: 'exact', head: true });
        console.log('🔗 Conexão Supabase verificada');
        return true;
    } catch (error) {
        console.error('❌ Erro na conexão Supabase:', error);
        mostrarMensagem('Erro de conexão com o banco de dados', 'error');
        return false;
    }
}

// ===== GERENCIAMENTO DE PRODUTOS =====
/**
 * Carrega produtos do Supabase com tratamento de erro robusto
 */
async function carregarProdutos() {
    try {
        console.group('🔄 Carregando produtos');
        
        mostrarEstadoCarregamento(true);
        
        const { data: produtos, error, count } = await supabase
            .from('produtos')
            .select('*', { count: 'exact' })
            .order('nome', { ascending: true });

        if (error) {
            throw new Error(`Supabase: ${error.message}`);
        }

        if (!produtos || produtos.length === 0) {
            console.warn('⚠️ Nenhum produto encontrado');
            mostrarMensagem(
                'Nenhum produto cadastrado. Cadastre produtos antes de criar pedidos.', 
                'warning'
            );
            estadoApp.produtosDisponiveis = [];
            return;
        }

        estadoApp.produtosDisponiveis = produtos;
        console.log(`✅ ${produtos.length} produtos carregados`, produtos);
        
        // Log estatísticas úteis
        const precoMedio = produtos.reduce((sum, p) => sum + p.preco, 0) / produtos.length;
        console.log(`📊 Estatísticas: Preço médio R$ ${precoMedio.toFixed(2)}`);
        
    } catch (error) {
        console.error('❌ Erro ao carregar produtos:', error);
        mostrarMensagem(
            `Falha ao carregar produtos: ${error.message}`, 
            'error'
        );
        estadoApp.produtosDisponiveis = [];
    } finally {
        mostrarEstadoCarregamento(false);
        console.groupEnd();
    }
}

// ===== GERENCIAMENTO DE ITENS DO PEDIDO =====
/**
 * Adiciona um novo item ao pedido com validações
 */
function adicionarItem() {
    console.group('➕ Adicionando item ao pedido');
    
    if (!validarProdutosDisponiveis()) return;

    const itemDiv = criarElementoItem();
    estadoApp.itensContainer.appendChild(itemDiv);

    console.log('✅ Item adicionado com sucesso');
    console.groupEnd();
}

/**
 * Valida se existem produtos disponíveis
 */
function validarProdutosDisponiveis() {
    if (!estadoApp.produtosDisponiveis.length) {
        mostrarMensagem(
            'Nenhum produto disponível. Cadastre produtos primeiro.', 
            'error'
        );
        return false;
    }
    return true;
}

/**
 * Cria o elemento completo de um item do pedido
 */
function criarElementoItem() {
    const itemDiv = document.createElement('div');
    itemDiv.className = 'item-pedido order-item';
    
    const selectProduto = criarSelectProdutos();
    const inputQuantidade = criarInputQuantidade();
    const btnRemover = criarBotaoRemover(itemDiv);

    itemDiv.append(selectProduto, inputQuantidade, btnRemover);
    return itemDiv;
}

/**
 * Cria o select de produtos com options
 */
function criarSelectProdutos() {
    const select = document.createElement('select');
    select.className = 'form-control order-item__select';
    select.required = true;
    select.innerHTML = criarOptionsProdutos();
    
    select.addEventListener('change', () => {
        console.log('🔄 Produto selecionado:', select.value);
    });
    
    return select;
}

/**
 * Gera as options do select baseado nos produtos disponíveis
 */
function criarOptionsProdutos() {
    const options = [
        '<option value="">Selecione um produto</option>'
    ];
    
    estadoApp.produtosDisponiveis.forEach(produto => {
        options.push(
            `<option value="${produto.id}" data-preco="${produto.preco}">
                ${produto.nome} - R$ ${produto.preco.toFixed(2)}
            </option>`
        );
    });
    
    return options.join('');
}

/**
 * Cria input de quantidade com validações
 */
function criarInputQuantidade() {
    const input = document.createElement('input');
    input.type = 'number';
    input.className = 'form-control order-item__input';
    input.min = CONFIG.MIN_QUANTIDADE;
    input.max = CONFIG.MAX_QUANTIDADE;
    input.value = '1';
    input.required = true;
    input.placeholder = 'Qtd';
    
    input.addEventListener('input', debounce((e) => {
        const valor = parseInt(e.target.value);
        if (valor > CONFIG.MAX_QUANTIDADE) {
            e.target.value = CONFIG.MAX_QUANTIDADE;
            mostrarMensagem(`Quantidade máxima: ${CONFIG.MAX_QUANTIDADE}`, 'warning');
        }
    }, CONFIG.DEBOUNCE_DELAY));
    
    return input;
}

/**
 * Cria botão de remover item
 */
function criarBotaoRemover(itemDiv) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn btn-danger remove-item order-item__remove';
    button.innerHTML = '<i class="fas fa-times"></i>';
    button.setAttribute('aria-label', 'Remover item');
    
    button.addEventListener('click', () => removerItem(itemDiv));
    
    return button;
}

/**
 * Remove item do pedido com validação
 */
function removerItem(itemDiv) {
    const totalItens = estadoApp.itensContainer.children.length;
    
    if (totalItens <= 1) {
        mostrarMensagem('O pedido deve ter pelo menos um item.', 'warning');
        return;
    }

    // Animação de saída
    itemDiv.style.transform = 'translateX(100%)';
    itemDiv.style.opacity = '0';
    
    setTimeout(() => {
        if (itemDiv.parentNode) {
            itemDiv.parentNode.removeChild(itemDiv);
            console.log('🗑️ Item removido');
        }
    }, 300);
}

// ===== SUBMISSÃO DO PEDIDO =====
/**
 * Manipula o envio do formulário de pedido
 */
async function handleSubmitPedido(event) {
    event.preventDefault();
    
    if (estadoApp.pedidoEmProcessamento) {
        console.warn('⚠️ Pedido já em processamento');
        return;
    }

    console.group('📦 Processando novo pedido');
    
    try {
        estadoApp.pedidoEmProcessamento = true;
        
        const dadosValidados = validarDadosPedido();
        if (!dadosValidados) return;

        await processarCriacaoPedido(dadosValidados);
        
    } catch (error) {
        console.error('❌ Erro no processamento do pedido:', error);
        mostrarMensagem(`Erro: ${error.message}`, 'error');
    } finally {
        estadoApp.pedidoEmProcessamento = false;
        console.groupEnd();
    }
}

/**
 * Valida todos os dados do pedido antes do envio
 */
function validarDadosPedido() {
    const cliente = document.getElementById('cliente').value.trim();
    const status = document.getElementById('status').value;
    const itens = coletarItensPedido();

    // Validações
    if (!cliente) {
        mostrarMensagem('Por favor, informe o nome do cliente.', 'error');
        return null;
    }

    if (cliente.length < 2) {
        mostrarMensagem('Nome do cliente muito curto.', 'error');
        return null;
    }

    if (!itens || itens.length === 0) {
        mostrarMensagem('O pedido deve ter pelo menos um item.', 'error');
        return null;
    }

    // Verificar itens inválidos
    const itensInvalidos = itens.filter(item => !item.produto_id || !item.quantidade);
    if (itensInvalidos.length > 0) {
        mostrarMensagem('Alguns itens estão incompletos.', 'error');
        return null;
    }

    console.log('✅ Dados validados:', { cliente, status, totalItens: itens.length });
    
    return { cliente, status, itens };
}

/**
 * Coleta e valida todos os itens do pedido
 */
function coletarItensPedido() {
    const itens = [];
    const itensElements = estadoApp.itensContainer.getElementsByClassName('item-pedido');

    for (let itemElement of itensElements) {
        const select = itemElement.querySelector('select');
        const input = itemElement.querySelector('input[type="number"]');

        if (!select.value) {
            mostrarMensagem('Todos os itens devem ter um produto selecionado.', 'error');
            return null;
        }

        itens.push({
            produto_id: parseInt(select.value),
            quantidade: Math.max(CONFIG.MIN_QUANTIDADE, parseInt(input.value) || 1),
            preco_unitario: parseFloat(select.selectedOptions[0]?.dataset.preco || 0)
        });
    }

    return itens;
}

/**
 * Processa a criação do pedido no Supabase
 */
async function processarCriacaoPedido({ cliente, status, itens }) {
    try {
        atualizarInterfaceProcessamento(true);
        
        // 1. Criar pedido principal
        const pedido = await criarPedidoPrincipal(cliente, status);
        if (!pedido) throw new Error('Falha ao criar pedido');

        // 2. Adicionar itens do pedido
        await adicionarItensPedido(pedido.id, itens);

        // 3. Sucesso
        await finalizarPedidoComSucesso(pedido);
        
    } catch (error) {
        throw error;
    } finally {
        atualizarInterfaceProcessamento(false);
    }
}

/**
 * Cria o pedido principal no Supabase
 */
async function criarPedidoPrincipal(cliente, status) {
    console.log('📝 Criando pedido principal...');
    
    const { data: pedido, error } = await supabase
        .from('pedidos')
        .insert([{
            cliente: cliente,
            status: status,
            data: new Date().toISOString()
        }])
        .select()
        .single();

    if (error) {
        throw new Error(`Erro ao criar pedido: ${error.message}`);
    }

    console.log('✅ Pedido criado:', pedido.id);
    return pedido;
}

/**
 * Adiciona os itens do pedido no Supabase
 */
async function adicionarItensPedido(pedidoId, itens) {
    console.log('📦 Adicionando itens do pedido...');
    
    const itensComPedidoId = itens.map(item => ({
        pedido_id: pedidoId,
        produto_id: item.produto_id,
        quantidade: item.quantidade
    }));

    const { error } = await supabase
        .from('item_pedido')
        .insert(itensComPedidoId);

    if (error) {
        throw new Error(`Erro ao adicionar itens: ${error.message}`);
    }

    console.log(`✅ ${itens.length} itens adicionados`);
}

/**
 * Finaliza o processo com feedback de sucesso
 */
async function finalizarPedidoComSucesso(pedido) {
    estadoApp.ultimoPedidoCriado = pedido;
    
    // Calcular total
    const itens = coletarItensPedido();
    const total = itens.reduce((sum, item) => sum + (item.preco_unitario * item.quantidade), 0);
    
    mostrarMensagem(
        `Pedido #${pedido.id} criado com sucesso! Total: R$ ${total.toFixed(2)}`, 
        'success'
    );

    // Limpar e resetar formulário
    await resetarFormulario();
    
    // Redirecionar após delay
    setTimeout(() => {
        window.location.href = 'index.html';
    }, CONFIG.REDIRECT_DELAY);
}

// ===== GERENCIAMENTO DE INTERFACE =====
/**
 * Mostra/esconde estado de carregamento
 */
function mostrarEstadoCarregamento(carregando) {
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
        loadingElement.style.display = carregando ? 'block' : 'none';
    }
}

/**
 * Atualiza interface durante processamento
 */
function atualizarInterfaceProcessamento(processando) {
    if (processando) {
        estadoApp.submitBtn.disabled = true;
        estadoApp.submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processando...';
        estadoApp.submitBtn.classList.add('btn--processing');
    } else {
        estadoApp.submitBtn.disabled = false;
        estadoApp.submitBtn.innerHTML = '<i class="fas fa-save"></i> Criar Pedido';
        estadoApp.submitBtn.classList.remove('btn--processing');
    }
}

/**
 * Reseta o formulário para estado inicial
 */
async function resetarFormulario() {
    // Limpar campos
    estadoApp.formPedido.reset();
    estadoApp.itensContainer.innerHTML = '';
    
    // Recarregar produtos (caso tenham sido atualizados)
    await carregarProdutos();
    
    // Adicionar item inicial
    adicionarItem();
    
    console.log('🔄 Formulário resetado');
}

// ===== SISTEMA DE MENSAGENS =====
/**
 * Sistema avançado de mensagens com diferentes tipos
 */
function mostrarMensagem(mensagem, tipo = 'info') {
    console.log(`📢 ${tipo.toUpperCase()}: ${mensagem}`);
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message message--${tipo} message-fade`;
    
    const icones = {
        error: 'fa-exclamation-circle',
        success: 'fa-check-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    
    messageDiv.innerHTML = `
        <i class="fas ${icones[tipo] || icones.info}"></i>
        <span>${mensagem}</span>
        <button class="message__close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Limpar mensagens anteriores do mesmo tipo
    const mensagensExistentes = estadoApp.messageArea.querySelectorAll(`.message--${tipo}`);
    mensagensExistentes.forEach(msg => msg.remove());
    
    estadoApp.messageArea.appendChild(messageDiv);
    
    // Auto-remover após timeout (exceto se for error crítico)
    if (tipo !== 'error') {
        setTimeout(() => {
            if (messageDiv.parentElement) {
                messageDiv.style.opacity = '0';
                messageDiv.style.transform = 'translateY(-10px)';
                setTimeout(() => messageDiv.remove(), 300);
            }
        }, CONFIG.MENSAGEM_TIMEOUT);
    }
}

// ===== UTILITÁRIOS =====
/**
 * Debounce para otimizar performance
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Formata valor monetário
 */
function formatarMoeda(valor) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(valor);
}

// ===== CONFIGURAÇÃO DE EVENT LISTENERS =====
function configurarEventListeners() {
    estadoApp.formPedido.addEventListener('submit', handleSubmitPedido);
    
    // Prevenir submissão com Enter em inputs individuais
    estadoApp.formPedido.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && e.target.tagName === 'INPUT') {
            e.preventDefault();
        }
    });
    
    console.log('🎯 Event listeners configurados');
}

// ===== EXPORTAÇÕES GLOBAIS =====
window.adicionarItem = adicionarItem;
window.mostrarMensagem = mostrarMensagem;

// Debug helpers (apenas desenvolvimento)
if (process.env.NODE_ENV === 'development') {
    window.estadoApp = estadoApp;
    window.debugPedido = {
        getEstado: () => ({ ...estadoApp }),
        simularErro: () => mostrarMensagem('Mensagem de erro simulada', 'error'),
        simularSucesso: () => mostrarMensagem('Mensagem de sucesso simulada', 'success')
    };
}
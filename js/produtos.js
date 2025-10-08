// ===== CONFIGURAÇÕES E CONSTANTES =====
const PRODUTOS_CONFIG = {
    MENSAGEM_TIMEOUT: 5000,
    DEBOUNCE_DELAY: 300,
    PRECO_MINIMO: 0,
    PRECO_MAXIMO: 9999.99,
    NOME_MAX_LENGTH: 100,
    DESCRICAO_MAX_LENGTH: 500
};

// ===== ESTADO DA APLICAÇÃO =====
const estadoProdutos = {
    container: null,
    loading: null,
    messageArea: null,
    form: null,
    modal: null,
    submitBtn: null,
    produtos: [],
    produtoEditando: null,
    carregando: false,
    salvando: false
};

// ===== INICIALIZAÇÃO =====
document.addEventListener('DOMContentLoaded', async () => {
    await inicializarModuloProdutos();
});

/**
 * Inicializa o módulo de produtos
 */
async function inicializarModuloProdutos() {
    try {
        console.group('🚀 Inicializando Módulo de Produtos');
        
        if (!inicializarElementosProdutos()) return;
        
        configurarEventListenersProdutos();
        await carregarProdutos();
        
        console.log('✅ Módulo de produtos inicializado');
        console.groupEnd();
        
    } catch (error) {
        console.error('❌ Falha na inicialização do módulo:', error);
        mostrarMensagemProdutos('Erro ao inicializar produtos', 'error');
    }
}

/**
 * Inicializa elementos DOM do módulo de produtos
 */
function inicializarElementosProdutos() {
    const elementos = {
        container: document.getElementById('produtos-container'),
        loading: document.getElementById('loading'),
        messageArea: document.getElementById('message-area'),
        form: document.getElementById('form-produto'),
        modal: document.getElementById('modal-produto'),
        submitBtn: document.getElementById('submit-btn')
    };

    const elementosFaltantes = Object.entries(elementos)
        .filter(([_, element]) => !element)
        .map(([name]) => name);

    if (elementosFaltantes.length > 0) {
        console.error('❌ Elementos de produtos não encontrados:', elementosFaltantes);
        return false;
    }

    Object.assign(estadoProdutos, elementos);
    console.log('📦 Elementos de produtos inicializados');
    return true;
}

/**
 * Configura event listeners do módulo
 */
function configurarEventListenersProdutos() {
    estadoProdutos.form.addEventListener('submit', handleSubmitProduto);
    
    // Validação em tempo real
    estadoProdutos.form.addEventListener('input', debounce((e) => {
        if (e.target.name === 'preco') {
            validarPrecoEmTempoReal(e.target);
        }
    }, PRODUTOS_CONFIG.DEBOUNCE_DELAY));
    
    // Fechar modal com ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && estadoProdutos.modal.style.display === 'flex') {
            fecharModalProduto();
        }
    });
    
    console.log('🎯 Event listeners configurados');
}

// ===== CARREGAMENTO DE PRODUTOS =====
/**
 * Carrega produtos do Supabase com tratamento robusto
 */
async function carregarProdutos() {
    if (estadoProdutos.carregando) {
        console.log('⏳ Carregamento já em andamento...');
        return;
    }

    try {
        estadoProdutos.carregando = true;
        mostrarEstadoCarregamentoProdutos(true);
        limparContainerProdutos();

        console.group('🔄 Carregando produtos');
        
        const { data: produtos, error, count } = await supabase
            .from('produtos')
            .select('*')
            .order('nome', { ascending: true });

        if (error) {
            throw new Error(`Supabase: ${error.message}`);
        }

        estadoProdutos.produtos = produtos || [];
        
        if (estadoProdutos.produtos.length === 0) {
            exibirEstadoVazioProdutos();
            console.log('ℹ️ Nenhum produto encontrado');
        } else {
            renderizarProdutos(estadoProdutos.produtos);
            console.log(`✅ ${estadoProdutos.produtos.length} produtos carregados`);
            
            // Log estatísticas
            logEstatisticasProdutos(estadoProdutos.produtos);
        }

    } catch (error) {
        console.error('❌ Erro ao carregar produtos:', error);
        exibirErroCarregamentoProdutos(error);
    } finally {
        estadoProdutos.carregando = false;
        mostrarEstadoCarregamentoProdutos(false);
        console.groupEnd();
    }
}

/**
 * Exibe estatísticas dos produtos carregados
 */
function logEstatisticasProdutos(produtos) {
    const precoMedio = produtos.reduce((sum, p) => sum + p.preco, 0) / produtos.length;
    const precoMaximo = Math.max(...produtos.map(p => p.preco));
    const precoMinimo = Math.min(...produtos.map(p => p.preco));
    const comDescricao = produtos.filter(p => p.descricao && p.descricao.trim()).length;
    
    console.log(`📊 Estatísticas dos produtos:
    • Total: ${produtos.length} produtos
    • Preço médio: ${formatarMoeda(precoMedio)}
    • Faixa de preços: ${formatarMoeda(precoMinimo)} - ${formatarMoeda(precoMaximo)}
    • Com descrição: ${comDescricao} (${Math.round((comDescricao/produtos.length)*100)}%)`);
}

/**
 * Renderiza todos os produtos no container
 */
function renderizarProdutos(produtos) {
    const fragment = document.createDocumentFragment();
    
    produtos.forEach(produto => {
        const card = criarCardProduto(produto);
        fragment.appendChild(card);
    });
    
    estadoProdutos.container.appendChild(fragment);
}

// ===== CRIAÇÃO DE CARDS =====
/**
 * Cria card de produto com dados completos
 */
function criarCardProduto(produto) {
    const card = document.createElement('div');
    card.className = 'produto-card item-card';
    card.dataset.produtoId = produto.id;
    
    const descricao = produto.descricao?.trim() || 'Sem descrição';
    const dataCriacao = produto.created_at ? formatarDataRelativa(produto.created_at) : 'Data não disponível';
    
    card.innerHTML = `
        <div class="item-card__content">
            <h3 class="item-card__title">${escapeHTML(produto.nome)}</h3>
            
            <div class="produto-preco">
                ${formatarMoeda(produto.preco)}
            </div>
            
            <div class="produto-descricao">
                ${escapeHTML(descricao)}
            </div>
            
            <div class="produto-metadata">
                <small class="metadata-item">
                    <i class="fas fa-calendar"></i>
                    ${dataCriacao}
                </small>
                ${produto.descricao ? `
                <small class="metadata-item">
                    <i class="fas fa-file-alt"></i>
                    Com descrição
                </small>
                ` : ''}
            </div>
        </div>

        <div class="actions">
            <button class="btn btn-warning btn--sm" onclick="editarProduto(${produto.id})"
                    aria-label="Editar produto ${produto.nome}">
                <i class="fas fa-edit"></i> Editar
            </button>
            <button class="btn btn-danger btn--sm" onclick="excluirProduto(${produto.id})"
                    aria-label="Excluir produto ${produto.nome}">
                <i class="fas fa-trash"></i> Excluir
            </button>
        </div>
    `;

    // Efeitos de hover
    card.addEventListener('mouseenter', () => card.classList.add('card-hover'));
    card.addEventListener('mouseleave', () => card.classList.remove('card-hover'));

    return card;
}

// ===== GERENCIAMENTO DO MODAL =====
/**
 * Abre modal para criar/editar produto
 */
window.abrirModalProduto = function(produto = null) {
    estadoProdutos.produtoEditando = produto;
    
    const modalTitulo = document.getElementById('modal-titulo');
    const isEditando = !!produto;
    
    // Configurar título e botão
    modalTitulo.innerHTML = isEditando ? 
        '<i class="fas fa-edit"></i> Editar Produto' : 
        '<i class="fas fa-plus"></i> Novo Produto';
    
    estadoProdutos.submitBtn.innerHTML = isEditando ? 
        '<i class="fas fa-save"></i> Atualizar Produto' : 
        '<i class="fas fa-save"></i> Salvar Produto';
    
    // Preencher formulário se estiver editando
    if (isEditando) {
        preencherFormularioProduto(produto);
    } else {
        estadoProdutos.form.reset();
        document.getElementById('produto-id').value = '';
    }
    
    // Mostrar modal com animação
    estadoProdutos.modal.style.display = 'flex';
    setTimeout(() => estadoProdutos.modal.classList.add('modal--active'), 10);
    
    // Foco no primeiro campo
    setTimeout(() => document.getElementById('nome').focus(), 100);
    
    console.log(`📝 ${isEditando ? 'Editando' : 'Criando'} produto`, produto);
};

/**
 * Preenche formulário com dados do produto
 */
function preencherFormularioProduto(produto) {
    document.getElementById('produto-id').value = produto.id;
    document.getElementById('nome').value = produto.nome;
    document.getElementById('preco').value = produto.preco;
    document.getElementById('descricao').value = produto.descricao || '';
}

/**
 * Fecha modal de produto
 */
window.fecharModal = function() {
    estadoProdutos.modal.classList.remove('modal--active');
    
    setTimeout(() => {
        estadoProdutos.modal.style.display = 'none';
        estadoProdutos.form.reset();
        estadoProdutos.produtoEditando = null;
        document.getElementById('produto-id').value = '';
    }, 300);
    
    console.log('❌ Modal fechado');
};

// ===== VALIDAÇÃO DE FORMULÁRIO =====
/**
 * Valida dados do produto antes do envio
 */
function validarDadosProduto(dados) {
    const erros = [];
    
    // Validar nome
    if (!dados.nome || dados.nome.trim().length === 0) {
        erros.push('O nome do produto é obrigatório');
    } else if (dados.nome.length > PRODUTOS_CONFIG.NOME_MAX_LENGTH) {
        erros.push(`O nome deve ter no máximo ${PRODUTOS_CONFIG.NOME_MAX_LENGTH} caracteres`);
    }
    
    // Validar preço
    if (!dados.preco && dados.preco !== 0) {
        erros.push('O preço do produto é obrigatório');
    } else if (dados.preco < PRODUTOS_CONFIG.PRECO_MINIMO) {
        erros.push(`O preço não pode ser menor que ${formatarMoeda(PRODUTOS_CONFIG.PRECO_MINIMO)}`);
    } else if (dados.preco > PRODUTOS_CONFIG.PRECO_MAXIMO) {
        erros.push(`O preço não pode ser maior que ${formatarMoeda(PRODUTOS_CONFIG.PRECO_MAXIMO)}`);
    }
    
    // Validar descrição
    if (dados.descricao && dados.descricao.length > PRODUTOS_CONFIG.DESCRICAO_MAX_LENGTH) {
        erros.push(`A descrição deve ter no máximo ${PRODUTOS_CONFIG.DESCRICAO_MAX_LENGTH} caracteres`);
    }
    
    return erros;
}

/**
 * Valida preço em tempo real
 */
function validarPrecoEmTempoReal(input) {
    const valor = parseFloat(input.value);
    const grupo = input.closest('.form-group');
    
    // Limpar estados anteriores
    grupo.classList.remove('form-group--error', 'form-group--success');
    
    if (isNaN(valor)) {
        grupo.classList.add('form-group--error');
        return false;
    }
    
    if (valor < PRODUTOS_CONFIG.PRECO_MINIMO) {
        grupo.classList.add('form-group--error');
        return false;
    }
    
    if (valor > PRODUTOS_CONFIG.PRECO_MAXIMO) {
        grupo.classList.add('form-group--error');
        return false;
    }
    
    grupo.classList.add('form-group--success');
    return true;
}

// ===== SUBMISSÃO DO FORMULÁRIO =====
/**
 * Manipula o envio do formulário de produto
 */
async function handleSubmitProduto(event) {
    event.preventDefault();
    
    if (estadoProdutos.salvando) {
        console.warn('⚠️ Salvamento já em andamento');
        return;
    }

    try {
        estadoProdutos.salvando = true;
        atualizarInterfaceSalvamento(true);
        
        const dados = coletarDadosFormulario();
        const errosValidacao = validarDadosProduto(dados);
        
        if (errosValidacao.length > 0) {
            mostrarMensagemProdutos(errosValidacao[0], 'error');
            return;
        }
        
        await salvarProduto(dados);
        
    } catch (error) {
        console.error('❌ Erro no processamento do produto:', error);
        mostrarMensagemProdutos(`Erro: ${error.message}`, 'error');
    } finally {
        estadoProdutos.salvando = false;
        atualizarInterfaceSalvamento(false);
    }
}

/**
 * Coleta dados do formulário
 */
function coletarDadosFormulario() {
    return {
        id: document.getElementById('produto-id').value,
        nome: document.getElementById('nome').value.trim(),
        preco: parseFloat(document.getElementById('preco').value),
        descricao: document.getElementById('descricao').value.trim()
    };
}

/**
 * Salva produto no Supabase (cria ou atualiza)
 */
async function salvarProduto(dados) {
    const isEditando = !!dados.id;
    const produtoData = {
        nome: dados.nome,
        preco: dados.preco,
        descricao: dados.descricao || null
    };

    console.group(isEditando ? '✏️ Atualizando produto' : '🆕 Criando produto');
    console.log('Dados:', produtoData);

    try {
        let resultado;
        
        if (isEditando) {
            // Atualizar produto existente
            const { data, error } = await supabase
                .from('produtos')
                .update({
                    ...produtoData,
                    atualizado_em: new Date().toISOString()
                })
                .eq('id', dados.id)
                .select()
                .single();

            if (error) throw error;
            resultado = data;
        } else {
            // Criar novo produto
            const { data, error } = await supabase
                .from('produtos')
                .insert([produtoData])
                .select()
                .single();

            if (error) throw error;
            resultado = data;
        }

        console.log('✅ Produto salvo:', resultado);
        mostrarMensagemProdutos(
            `Produto ${isEditando ? 'atualizado' : 'criado'} com sucesso!`, 
            'success'
        );

        // Fechar modal e recarregar lista
        fecharModal();
        await carregarProdutos();

    } catch (error) {
        console.error('❌ Erro ao salvar produto:', error);
        
        // Tratamento específico para erros comuns
        if (error.message.includes('duplicate key')) {
            throw new Error('Já existe um produto com este nome');
        } else if (error.message.includes('violates foreign key')) {
            throw new Error('Não é possível excluir produto vinculado a pedidos');
        } else {
            throw new Error(`Erro ao salvar: ${error.message}`);
        }
    } finally {
        console.groupEnd();
    }
}

// ===== EXCLUSÃO DE PRODUTOS =====
/**
 * Gerencia exclusão de produto com confirmação
 */
window.excluirProduto = async function(produtoId) {
    const produto = estadoProdutos.produtos.find(p => p.id === produtoId);
    if (!produto) {
        mostrarMensagemProdutos('Produto não encontrado', 'error');
        return;
    }

    const confirmado = await mostrarConfirmacaoExclusaoProduto(produto);
    if (!confirmado) return;

    await executarExclusaoProduto(produtoId);
};

/**
 * Mostra modal de confirmação de exclusão
 */
async function mostrarConfirmacaoExclusaoProduto(produto) {
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal__content">
                <div class="confirmacao-exclusao">
                    <i class="fas fa-exclamation-triangle confirmacao-exclusao__icone"></i>
                    <h3>Confirmar Exclusão</h3>
                    <p>Tem certeza que deseja excluir o produto <strong>"${escapeHTML(produto.nome)}"</strong>?</p>
                    <p class="confirmacao-exclusao__detalhes">
                        Preço: <strong>${formatarMoeda(produto.preco)}</strong><br>
                        ${produto.descricao ? `Descrição: ${escapeHTML(produto.descricao.substring(0, 100))}${produto.descricao.length > 100 ? '...' : ''}` : 'Sem descrição'}
                    </p>
                    <p class="confirmacao-exclusao__aviso">
                        <i class="fas fa-info-circle"></i>
                        ${produto.id <= 4 ? 'Produtos iniciais não podem ser excluídos' : 'Esta ação não pode ser desfeita.'}
                    </p>
                </div>
                
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="fecharConfirmacaoExclusaoProduto(false)">
                        Cancelar
                    </button>
                    <button type="button" class="btn btn-danger" onclick="fecharConfirmacaoExclusaoProduto(true)"
                            ${produto.id <= 4 ? 'disabled' : ''}>
                        <i class="fas fa-trash"></i> Excluir Produto
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.style.display = 'flex';

        window.fecharConfirmacaoExclusaoProduto = (resultado) => {
            modal.remove();
            window.fecharConfirmacaoExclusaoProduto = null;
            resolve(resultado);
        };
    });
}

/**
 * Executa exclusão do produto no Supabase
 */
async function executarExclusaoProduto(produtoId) {
    try {
        console.log(`🗑️ Excluindo produto ${produtoId}`);
        
        mostrarMensagemProdutos('Excluindo produto...', 'info');

        const { error } = await supabase
            .from('produtos')
            .delete()
            .eq('id', produtoId);

        if (error) throw error;

        mostrarMensagemProdutos('Produto excluído com sucesso!', 'success');
        
        // Remover da interface
        removerProdutoDaInterface(produtoId);
        
    } catch (error) {
        console.error('❌ Erro ao excluir produto:', error);
        
        if (error.message.includes('violates foreign key')) {
            mostrarMensagemProdutos(
                'Não é possível excluir produto vinculado a pedidos existentes.', 
                'error'
            );
        } else {
            mostrarMensagemProdutos(`Erro ao excluir produto: ${error.message}`, 'error');
        }
    }
}

/**
 * Remove produto da interface após exclusão
 */
function removerProdutoDaInterface(produtoId) {
    const card = document.querySelector(`[data-produto-id="${produtoId}"]`);
    if (card) {
        // Animação de saída
        card.style.transform = 'scale(0.8)';
        card.style.opacity = '0';
        
        setTimeout(() => {
            card.remove();
            
            // Verificar se não há mais produtos
            if (estadoProdutos.container.children.length === 0) {
                exibirEstadoVazioProdutos();
            }
        }, 300);
    } else {
        // Fallback: recarregar
        carregarProdutos();
    }
}

// ===== EDIÇÃO DE PRODUTOS =====
/**
 * Carrega produto para edição
 */
window.editarProduto = async function(produtoId) {
    try {
        console.log(`✏️ Carregando produto ${produtoId} para edição`);
        
        const { data: produto, error } = await supabase
            .from('produtos')
            .select('*')
            .eq('id', produtoId)
            .single();

        if (error) throw error;

        abrirModalProduto(produto);

    } catch (error) {
        console.error('❌ Erro ao carregar produto:', error);
        mostrarMensagemProdutos('Erro ao carregar produto para edição', 'error');
    }
};

// ===== GERENCIAMENTO DE INTERFACE =====
/**
 * Controla exibição do estado de carregamento
 */
function mostrarEstadoCarregamentoProdutos(carregando) {
    if (estadoProdutos.loading) {
        estadoProdutos.loading.style.display = carregando ? 'flex' : 'none';
        
        if (carregando) {
            estadoProdutos.loading.innerHTML = `
                <div class="loading__spinner"></div>
                <p>Carregando produtos...</p>
            `;
        }
    }
}

/**
 * Atualiza interface durante salvamento
 */
function atualizarInterfaceSalvamento(salvando) {
    if (salvando) {
        estadoProdutos.submitBtn.disabled = true;
        estadoProdutos.submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
        estadoProdutos.submitBtn.classList.add('btn--processing');
    } else {
        estadoProdutos.submitBtn.disabled = false;
        
        const texto = estadoProdutos.produtoEditando ? 
            '<i class="fas fa-save"></i> Atualizar Produto' : 
            '<i class="fas fa-save"></i> Salvar Produto';
            
        estadoProdutos.submitBtn.innerHTML = texto;
        estadoProdutos.submitBtn.classList.remove('btn--processing');
    }
}

/**
 * Limpa container de produtos
 */
function limparContainerProdutos() {
    if (estadoProdutos.container) {
        estadoProdutos.container.innerHTML = '';
    }
}

/**
 * Exibe estado quando não há produtos
 */
function exibirEstadoVazioProdutos() {
    estadoProdutos.container.innerHTML = `
        <div class="estado-vazio">
            <i class="fas fa-utensils estado-vazio__icone"></i>
            <h3 class="estado-vazio__titulo">Nenhum produto cadastrado</h3>
            <p class="estado-vazio__descricao">Adicione seu primeiro produto para começar!</p>
            <button class="btn btn-primary estado-vazio__acao" onclick="abrirModalProduto()">
                <i class="fas fa-plus"></i> Adicionar Primeiro Produto
            </button>
        </div>
    `;
}

/**
 * Exibe erro de carregamento
 */
function exibirErroCarregamentoProdutos(error) {
    estadoProdutos.container.innerHTML = `
        <div class="erro-carregamento">
            <i class="fas fa-exclamation-triangle erro-carregamento__icone"></i>
            <h3 class="erro-carregamento__titulo">Erro ao carregar produtos</h3>
            <p class="erro-carregamento__descricao">${error.message}</p>
            <button class="btn btn-primary erro-carregamento__acao" onclick="carregarProdutos()">
                <i class="fas fa-redo"></i> Tentar Novamente
            </button>
        </div>
    `;
}

// ===== SISTEMA DE MENSAGENS =====
/**
 * Sistema de mensagens para o módulo de produtos
 */
function mostrarMensagemProdutos(mensagem, tipo = 'info') {
    if (!estadoProdutos.messageArea) return;
    
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
    
    estadoProdutos.messageArea.appendChild(messageDiv);
    
    // Auto-remover
    setTimeout(() => {
        if (messageDiv.parentElement) {
            messageDiv.remove();
        }
    }, PRODUTOS_CONFIG.MENSAGEM_TIMEOUT);
}

// ===== UTILITÁRIOS =====
/**
 * Formata data relativa (ex: "há 2 dias")
 */
function formatarDataRelativa(dataString) {
    const data = new Date(dataString);
    const agora = new Date();
    const diffMs = agora - data;
    const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDias === 0) return 'Hoje';
    if (diffDias === 1) return 'Ontem';
    if (diffDias < 7) return `Há ${diffDias} dias`;
    if (diffDias < 30) return `Há ${Math.floor(diffDias/7)} semanas`;
    
    return data.toLocaleDateString('pt-BR');
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

/**
 * Escape HTML para prevenir XSS
 */
function escapeHTML(texto) {
    const div = document.createElement('div');
    div.textContent = texto;
    return div.innerHTML;
}

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

// Debug helpers
if (process.env.NODE_ENV === 'development') {
    window.debugProdutos = {
        getEstado: () => ({ ...estadoProdutos }),
        forcarRecarregamento: () => carregarProdutos(),
        simularProduto: () => ({
            nome: 'Produto Teste',
            preco: 29.90,
            descricao: 'Descrição do produto teste'
        })
    };
}
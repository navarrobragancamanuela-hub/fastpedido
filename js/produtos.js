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
    produtos: [],
    carregando: false
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
        messageArea: document.getElementById('message-area')
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
 * Configura event listeners do módulo - VERSÃO CORRIGIDA
 */
function configurarEventListenersProdutos() {
    // Configurar botão de novo produto se existir
    const btnNovoProduto = document.getElementById('btn-novo-produto');
    if (btnNovoProduto) {
        btnNovoProduto.addEventListener('click', () => abrirModalProduto());
    }

    // Configurar botão de adicionar produto se existir
    const btnAdicionarProduto = document.getElementById('btn-adicionar-produto');
    if (btnAdicionarProduto) {
        btnAdicionarProduto.addEventListener('click', () => abrirModalProduto());
    }
    
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
        <div class="produto-card__header">
            <div class="produto-card__badge">
                <i class="fas fa-utensils"></i>
            </div>
            <h3 class="produto-card__title">${escapeHTML(produto.nome)}</h3>
        </div>
        
        <div class="produto-card__content">
            <div class="produto-card__preco">
                ${formatarMoeda(produto.preco)}
            </div>
            
            <div class="produto-card__descricao">
                ${escapeHTML(descricao)}
            </div>
            
            <div class="produto-card__metadata">
                <span class="metadata-item">
                    <i class="fas fa-calendar"></i>
                    ${dataCriacao}
                </span>
                ${produto.descricao ? `
                <span class="metadata-item">
                    <i class="fas fa-file-alt"></i>
                    Com descrição
                </span>
                ` : ''}
            </div>
        </div>

        <div class="produto-card__actions">
            <button class="btn btn-editar" onclick="editarProduto(${produto.id})"
                    aria-label="Editar produto ${produto.nome}">
                <i class="fas fa-edit"></i> Editar
            </button>
            <button class="btn btn-excluir" onclick="excluirProduto(${produto.id})"
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

// ===== FORMULÁRIO DE PRODUTO - VERSÃO PREMIUM =====
/**
 * Abre modal para adicionar/editar produto - VERSÃO PREMIUM
 */
window.abrirModalProduto = function(produto = null) {
    const isEditando = !!produto;
    
    // Fechar modal anterior se existir
    const modalAnterior = document.querySelector('.modal-produto-form');
    if (modalAnterior) {
        modalAnterior.remove();
    }

    const modal = document.createElement('div');
    modal.className = 'modal modal-produto-form';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        backdrop-filter: blur(5px);
    `;

    modal.innerHTML = `
        <div style="
            background: linear-gradient(145deg, #ffffff, #f8f9fa);
            padding: 30px;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            border: 3px solid ${isEditando ? '#3498db' : '#2ed573'};
            max-width: 500px;
            width: 90%;
            max-height: 90vh;
            overflow-y: auto;
        ">
            <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 25px; padding-bottom: 15px; border-bottom: 2px solid ${isEditando ? '#3498db' : '#2ed573'};">
                <div style="font-size: 2.5rem; color: ${isEditando ? '#3498db' : '#2ed573'};">
                    <i class="fas ${isEditando ? 'fa-edit' : 'fa-plus-circle'}"></i>
                </div>
                <h3 style="color: #2c3e50; font-size: 1.5rem; font-weight: 800; margin: 0;">
                    ${isEditando ? 'Editar Produto' : 'Novo Produto'}
                </h3>
            </div>
            
            <form id="form-produto" style="display: flex; flex-direction: column; gap: 20px;">
                <input type="hidden" id="produto-id" value="${produto?.id || ''}">
                
                <div style="display: flex; flex-direction: column; gap: 8px;">
                    <label style="color: #2c3e50; font-weight: 700; font-size: 1rem; display: flex; align-items: center; gap: 8px;">
                        <i class="fas fa-tag" style="color: #e74c3c;"></i>
                        Nome do Produto
                        <span style="color: #e74c3c;">*</span>
                    </label>
                    <input 
                        type="text" 
                        id="nome" 
                        value="${produto ? escapeHTML(produto.nome) : ''}"
                        placeholder="Ex: X-Burger, Batata Frita, Refrigerante..."
                        required
                        style="
                            padding: 15px;
                            border: 2px solid #bdc3c7;
                            border-radius: 12px;
                            font-size: 1rem;
                            font-family: inherit;
                            transition: all 0.3s ease;
                            background: white;
                            box-shadow: inset 0 2px 4px rgba(0,0,0,0.05);
                        "
                        onfocus="this.style.borderColor='#3498db'; this.style.boxShadow='0 0 0 3px rgba(52, 152, 219, 0.1), inset 0 2px 4px rgba(0,0,0,0.05)'"
                        onblur="this.style.borderColor='#bdc3c7'; this.style.boxShadow='inset 0 2px 4px rgba(0,0,0,0.05)'"
                    >
                </div>
                
                <div style="display: flex; flex-direction: column; gap: 8px;">
                    <label style="color: #2c3e50; font-weight: 700; font-size: 1rem; display: flex; align-items: center; gap: 8px;">
                        <i class="fas fa-money-bill-wave" style="color: #27ae60;"></i>
                        Preço (R$)
                        <span style="color: #e74c3c;">*</span>
                    </label>
                    <div style="position: relative;">
                        <span style="
                            position: absolute;
                            left: 15px;
                            top: 50%;
                            transform: translateY(-50%);
                            color: #7f8c8d;
                            font-weight: 600;
                            z-index: 2;
                        ">R$</span>
                        <input 
                            type="number" 
                            id="preco" 
                            value="${produto ? produto.preco : ''}"
                            step="0.01"
                            min="0.01"
                            placeholder="0.00"
                            required
                            style="
                                padding: 15px 15px 15px 40px;
                                border: 2px solid #bdc3c7;
                                border-radius: 12px;
                                font-size: 1rem;
                                font-family: inherit;
                                transition: all 0.3s ease;
                                background: white;
                                box-shadow: inset 0 2px 4px rgba(0,0,0,0.05);
                                width: 100%;
                            "
                            onfocus="this.style.borderColor='#3498db'; this.style.boxShadow='0 0 0 3px rgba(52, 152, 219, 0.1), inset 0 2px 4px rgba(0,0,0,0.05)'"
                            onblur="this.style.borderColor='#bdc3c7'; this.style.boxShadow='inset 0 2px 4px rgba(0,0,0,0.05)'"
                        >
                    </div>
                </div>
                
                <div style="display: flex; flex-direction: column; gap: 8px;">
                    <label style="color: #2c3e50; font-weight: 700; font-size: 1rem; display: flex; align-items: center; gap: 8px;">
                        <i class="fas fa-align-left" style="color: #9b59b6;"></i>
                        Descrição
                    </label>
                    <textarea 
                        id="descricao" 
                        rows="4"
                        placeholder="Descreva o produto, ingredientes, tamanho..."
                        style="
                            padding: 15px;
                            border: 2px solid #bdc3c7;
                            border-radius: 12px;
                            font-size: 1rem;
                            font-family: inherit;
                            transition: all 0.3s ease;
                            background: white;
                            resize: vertical;
                            min-height: 100px;
                            box-shadow: inset 0 2px 4px rgba(0,0,0,0.05);
                        "
                        onfocus="this.style.borderColor='#3498db'; this.style.boxShadow='0 0 0 3px rgba(52, 152, 219, 0.1), inset 0 2px 4px rgba(0,0,0,0.05)'"
                        onblur="this.style.borderColor='#bdc3c7'; this.style.boxShadow='inset 0 2px 4px rgba(0,0,0,0.05)'"
                    >${produto?.descricao ? escapeHTML(produto.descricao) : ''}</textarea>
                    <div style="color: #7f8c8d; font-size: 0.85rem; display: flex; justify-content: space-between;">
                        <span>Opcional</span>
                        <span id="contador-descricao">0/500</span>
                    </div>
                </div>
                
                <div style="
                    display: flex;
                    gap: 15px;
                    justify-content: flex-end;
                    margin-top: 10px;
                    padding-top: 20px;
                    border-top: 1px solid rgba(0,0,0,0.1);
                ">
                    <button 
                        type="button" 
                        onclick="window.fecharModalProduto()" 
                        style="
                            background: #7f8c8d;
                            color: white;
                            border: 2px solid #7f8c8d;
                            padding: 12px 25px;
                            border-radius: 25px;
                            cursor: pointer;
                            font-weight: 700;
                            font-size: 1rem;
                            transition: all 0.3s ease;
                            min-width: 100px;
                        "
                        onmouseover="this.style.background='#636e72'; this.style.borderColor='#636e72'"
                        onmouseout="this.style.background='#7f8c8d'; this.style.borderColor='#7f8c8d'"
                    >
                        <i class="fas fa-times"></i> Cancelar
                    </button>
                    <button 
                        type="submit" 
                        id="btn-salvar-produto"
                        style="
                            background: linear-gradient(135deg, ${isEditando ? '#3498db, #2980b9' : '#2ed573, #27ae60'});
                            color: white;
                            border: 2px solid ${isEditando ? '#2980b9' : '#27ae60'};
                            padding: 12px 25px;
                            border-radius: 25px;
                            cursor: pointer;
                            font-weight: 700;
                            font-size: 1rem;
                            transition: all 0.3s ease;
                            min-width: 100px;
                            position: relative;
                            overflow: hidden;
                        "
                        onmouseover="this.style.background='linear-gradient(135deg, ${isEditando ? '#2980b9, #21618c' : '#27ae60, #219a52'})'; this.style.borderColor='${isEditando ? '#21618c' : '#219a52'}'"
                        onmouseout="this.style.background='linear-gradient(135deg, ${isEditando ? '#3498db, #2980b9' : '#2ed573, #27ae60'})'; this.style.borderColor='${isEditando ? '#2980b9' : '#27ae60'}'"
                    >
                        <i class="fas ${isEditando ? 'fa-save' : 'fa-plus'}"></i>
                        ${isEditando ? ' Salvar' : ' Adicionar'}
                    </button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);

    // Configurar o formulário
    const form = modal.querySelector('#form-produto');
    const descricaoTextarea = modal.querySelector('#descricao');
    const contadorDescricao = modal.querySelector('#contador-descricao');
    const btnSalvar = modal.querySelector('#btn-salvar-produto');

    // Contador de caracteres para descrição
    if (descricaoTextarea && contadorDescricao) {
        const atualizarContador = () => {
            const comprimento = descricaoTextarea.value.length;
            contadorDescricao.textContent = `${comprimento}/500`;
            
            if (comprimento > 500) {
                contadorDescricao.style.color = '#e74c3c';
            } else if (comprimento > 400) {
                contadorDescricao.style.color = '#f39c12';
            } else {
                contadorDescricao.style.color = '#7f8c8d';
            }
        };

        descricaoTextarea.addEventListener('input', atualizarContador);
        atualizarContador(); // Inicializar contador
    }

    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        if (btnSalvar.disabled) return;
        
        btnSalvar.disabled = true;
        btnSalvar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';

        try {
            const dados = {
                id: document.getElementById('produto-id').value,
                nome: document.getElementById('nome').value.trim(),
                preco: parseFloat(document.getElementById('preco').value),
                descricao: document.getElementById('descricao').value.trim()
            };

            // Validações
            if (!dados.nome) {
                mostrarMensagemProdutos('Nome do produto é obrigatório', 'error');
                return;
            }

            if (!dados.preco || dados.preco <= 0) {
                mostrarMensagemProdutos('Preço deve ser maior que zero', 'error');
                return;
            }

            if (dados.descricao.length > 500) {
                mostrarMensagemProdutos('Descrição muito longa (máx. 500 caracteres)', 'error');
                return;
            }

            await salvarProduto(dados);
            window.fecharModalProduto();
            
        } catch (error) {
            console.error('❌ Erro ao salvar produto:', error);
            mostrarMensagemProdutos(error.message, 'error');
        } finally {
            btnSalvar.disabled = false;
            btnSalvar.innerHTML = `<i class="fas ${isEditando ? 'fa-save' : 'fa-plus'}"></i> ${isEditando ? ' Salvar' : ' Adicionar'}`;
        }
    });

    // Definir a função globalmente para fechar
    window.fecharModalProduto = () => {
        const modal = document.querySelector('.modal-produto-form');
        if (modal) {
            modal.remove();
        }
        window.fecharModalProduto = null;
    };

    // Fechar modal ao clicar fora
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            window.fecharModalProduto();
        }
    });

    // Fechar com ESC
    const handleEsc = (e) => {
        if (e.key === 'Escape') {
            window.fecharModalProduto();
        }
    };
    document.addEventListener('keydown', handleEsc);

    // Focar no primeiro campo
    setTimeout(() => {
        const nomeInput = modal.querySelector('#nome');
        if (nomeInput) nomeInput.focus();
    }, 100);
};

/**
 * Salva produto no Supabase (cria ou atualiza) - VERSÃO PREMIUM
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
                .update(produtoData)
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
            `Produto ${isEditando ? 'atualizado' : 'criado'} com sucesso! 🎉`, 
            'success'
        );

        // Recarregar lista
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

// ===== EDIÇÃO DE PRODUTOS =====
/**
 * Interface para edição de produto - VERSÃO SIMPLIFICADA
 */
window.editarProduto = async function(produtoId) {
    const produto = estadoProdutos.produtos.find(p => p.id === produtoId);
    if (!produto) {
        mostrarMensagemProdutos('Produto não encontrado', 'error');
        return;
    }

    // Usar a mesma função de modal para edição
    abrirModalProduto(produto);
};

// ===== EXCLUSÃO DE PRODUTOS =====
/**
 * Gerencia exclusão de produto com confirmação - VERSÃO CORRIGIDA
 */
window.excluirProduto = async function(produtoId) {
    // Prevenir múltiplos cliques
    if (window.exclusaoEmAndamento) {
        console.log('⏳ Exclusão já em andamento...');
        return;
    }
    
    window.exclusaoEmAndamento = true;

    try {
        const produto = estadoProdutos.produtos.find(p => p.id === produtoId);
        if (!produto) {
            mostrarMensagemProdutos('Produto não encontrado', 'error');
            return;
        }

        const confirmado = await mostrarConfirmacaoExclusaoProduto(produto);
        if (!confirmado) return;

        await executarExclusaoProduto(produtoId);
        
    } catch (error) {
        console.error('❌ Erro na exclusão:', error);
    } finally {
        window.exclusaoEmAndamento = false;
    }
};

/**
 * Mostra modal de confirmação de exclusão - VERSÃO CORRIGIDA
 */
async function mostrarConfirmacaoExclusaoProduto(produto) {
    return new Promise((resolve) => {
        // Fechar modal anterior se existir
        const modalAnterior = document.querySelector('.modal-exclusao-produto');
        if (modalAnterior) {
            modalAnterior.remove();
        }

        const modal = document.createElement('div');
        modal.className = 'modal modal-exclusao-produto';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            backdrop-filter: blur(5px);
        `;

        modal.innerHTML = `
            <div style="
                background: linear-gradient(145deg, #ffffff, #f8f9fa);
                padding: 30px;
                border-radius: 20px;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                border: 3px solid #e74c3c;
                max-width: 500px;
                width: 90%;
                text-align: center;
            ">
                <div style="font-size: 4rem; color: #e74c3c; margin-bottom: 20px;">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                
                <h3 style="color: #2c3e50; font-size: 1.5rem; font-weight: 800; margin-bottom: 15px;">
                    Confirmar Exclusão
                </h3>
                
                <p style="color: #7f8c8d; margin-bottom: 20px; font-size: 1.1rem;">
                    Tem certeza que deseja excluir o produto <strong>"${escapeHTML(produto.nome)}"</strong>?
                </p>
                
                <div style="background: rgba(231, 76, 60, 0.1); padding: 15px; border-radius: 10px; margin-bottom: 25px; border-left: 4px solid #e74c3c;">
                    <p style="margin: 5px 0; color: #2c3e50; font-weight: 600;">
                        <i class="fas fa-tag"></i> Nome: ${escapeHTML(produto.nome)}
                    </p>
                    <p style="margin: 5px 0; color: #2c3e50; font-weight: 600;">
                        <i class="fas fa-money-bill-wave"></i> Preço: ${formatarMoeda(produto.preco)}
                    </p>
                    ${produto.descricao ? `
                    <p style="margin: 5px 0; color: #2c3e50; font-weight: 600;">
                        <i class="fas fa-align-left"></i> Descrição: ${escapeHTML(produto.descricao.substring(0, 100))}${produto.descricao.length > 100 ? '...' : ''}
                    </p>
                    ` : ''}
                </div>
                
                <p style="color: #e74c3c; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 20px;">
                    <i class="fas fa-info-circle"></i>
                    ${produto.id <= 4 ? 'Produtos iniciais não podem ser excluídos' : 'Esta ação não pode ser desfeita.'}
                </p>
                
                <div style="display: flex; gap: 15px; justify-content: center;">
                    <button 
                        type="button" 
                        onclick="window.fecharModalExclusaoProduto(false)" 
                        style="
                            background: #7f8c8d;
                            color: white;
                            border: 2px solid #7f8c8d;
                            padding: 12px 30px;
                            border-radius: 25px;
                            cursor: pointer;
                            font-weight: 700;
                            font-size: 1rem;
                            transition: all 0.3s ease;
                            min-width: 120px;
                        "
                    >
                        <i class="fas fa-times"></i> Cancelar
                    </button>
                    <button 
                        type="button" 
                        onclick="window.fecharModalExclusaoProduto(true)" 
                        style="
                            background: linear-gradient(135deg, #e74c3c, #c0392b);
                            color: white;
                            border: 2px solid #c0392b;
                            padding: 12px 30px;
                            border-radius: 25px;
                            cursor: pointer;
                            font-weight: 700;
                            font-size: 1rem;
                            transition: all 0.3s ease;
                            min-width: 120px;
                            ${produto.id <= 4 ? 'opacity: 0.5; cursor: not-allowed;' : ''}
                        "
                        ${produto.id <= 4 ? 'disabled' : ''}
                    >
                        <i class="fas fa-trash"></i> Excluir
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Definir a função globalmente
        window.fecharModalExclusaoProduto = (confirmado) => {
            const modal = document.querySelector('.modal-exclusao-produto');
            if (modal) {
                modal.remove();
            }
            window.fecharModalExclusaoProduto = null;
            resolve(confirmado);
        };

        // Fechar modal ao clicar fora
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                window.fecharModalExclusaoProduto(false);
            }
        });

        // Fechar com ESC
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                window.fecharModalExclusaoProduto(false);
            }
        };
        document.addEventListener('keydown', handleEsc);
    });
}

/**
 * Executa exclusão do produto no Supabase - VERSÃO CORRIGIDA
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
        
        // Recarregar produtos para atualizar a lista
        await carregarProdutos();
        
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
        throw error;
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
    }
}

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
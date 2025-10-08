// ===== CONFIGURAÇÕES E CONSTANTES =====
const PEDIDOS_CONFIG = {
    MENSAGEM_TIMEOUT: 5000,
    AUTO_REFRESH_INTERVAL: 30000, // 30 segundos
    DEBOUNCE_DELAY: 300,
    STATUS_OPCOES: ['Em preparo', 'Pronto', 'Entregue']
};

// ===== ESTADO DA APLICAÇÃO =====
const estadoPedidos = {
    container: null,
    loading: null,
    messageArea: null,
    pedidos: [],
    refreshInterval: null,
    carregando: false
};

// ===== INICIALIZAÇÃO =====
document.addEventListener('DOMContentLoaded', async () => {
    await inicializarModuloPedidos();
});

/**
 * Inicializa o módulo de pedidos
 */
async function inicializarModuloPedidos() {
    try {
        console.group('🚀 Inicializando Módulo de Pedidos');
        
        if (!inicializarElementosPedidos()) return;
        
        await carregarPedidos();
        iniciarAutoRefresh();
        
        console.log('✅ Módulo de pedidos inicializado');
        console.groupEnd();
        
    } catch (error) {
        console.error('❌ Falha na inicialização do módulo:', error);
        mostrarMensagemPedidos('Erro ao carregar pedidos', 'error');
    }
}

/**
 * Inicializa elementos DOM do módulo de pedidos
 */
function inicializarElementosPedidos() {
    const elementos = {
        container: document.getElementById('pedidos-container'),
        loading: document.getElementById('loading'),
        messageArea: document.getElementById('message-area')
    };

    const elementosFaltantes = Object.entries(elementos)
        .filter(([_, element]) => !element)
        .map(([name]) => name);

    if (elementosFaltantes.length > 0) {
        console.error('❌ Elementos de pedidos não encontrados:', elementosFaltantes);
        return false;
    }

    Object.assign(estadoPedidos, elementos);
    console.log('📦 Elementos de pedidos inicializados');
    return true;
}

// ===== CARREGAMENTO DE PEDIDOS =====
/**
 * Carrega pedidos do Supabase com tratamento robusto
 */
async function carregarPedidos() {
    if (estadoPedidos.carregando) {
        console.log('⏳ Carregamento já em andamento...');
        return;
    }

    try {
        estadoPedidos.carregando = true;
        mostrarEstadoCarregamentoPedidos(true);
        limparContainerPedidos();

        console.group('🔄 Carregando pedidos');
        
        const { data: pedidos, error, count } = await supabase
            .from('pedidos')
            .select(`
                *,
                item_pedido (
                    quantidade,
                    produtos (id, nome, preco, descricao)
                )
            `)
            .order('data', { ascending: false });

        if (error) {
            throw new Error(`Supabase: ${error.message}`);
        }

        estadoPedidos.pedidos = pedidos || [];
        
        if (estadoPedidos.pedidos.length === 0) {
            exibirEstadoVazio();
            console.log('ℹ️ Nenhum pedido encontrado');
        } else {
            renderizarPedidos(estadoPedidos.pedidos);
            console.log(`✅ ${estadoPedidos.pedidos.length} pedidos carregados`);
            
            // Log estatísticas
            logEstatisticasPedidos(estadoPedidos.pedidos);
        }

    } catch (error) {
        console.error('❌ Erro ao carregar pedidos:', error);
        exibirErroCarregamento(error);
    } finally {
        estadoPedidos.carregando = false;
        mostrarEstadoCarregamentoPedidos(false);
        console.groupEnd();
    }
}

/**
 * Exibe estatísticas dos pedidos carregados
 */
function logEstatisticasPedidos(pedidos) {
    const totalPedidos = pedidos.length;
    const pedidosPreparo = pedidos.filter(p => p.status === 'Em preparo').length;
    const pedidosProntos = pedidos.filter(p => p.status === 'Pronto').length;
    const pedidosEntregues = pedidos.filter(p => p.status === 'Entregue').length;
    
    const valorTotal = pedidos.reduce((total, pedido) => {
        return total + pedido.item_pedido.reduce((sum, item) => 
            sum + (item.quantidade * item.produtos.preco), 0
        );
    }, 0);

    console.log(`📊 Estatísticas:
    • Total: ${totalPedidos} pedidos
    • Em preparo: ${pedidosPreparo}
    • Prontos: ${pedidosProntos} 
    • Entregues: ${pedidosEntregues}
    • Valor total: R$ ${valorTotal.toFixed(2)}`);
}

/**
 * Renderiza todos os pedidos no container
 */
function renderizarPedidos(pedidos) {
    const fragment = document.createDocumentFragment();
    
    pedidos.forEach(pedido => {
        const card = criarCardPedido(pedido);
        fragment.appendChild(card);
    });
    
    estadoPedidos.container.appendChild(fragment);
}

// ===== CRIAÇÃO DE CARDS =====
/**
 * Cria card de pedido com dados completos
 */
function criarCardPedido(pedido) {
    const card = document.createElement('div');
    card.className = 'pedido-card item-card';
    card.dataset.pedidoId = pedido.id;
    
    const { total, itensFormatados } = calcularDadosPedido(pedido);
    const dataFormatada = formatarData(pedido.data);
    
    card.innerHTML = `
        ${criarBadgeStatus(pedido.status)}
        
        <div class="item-card__content">
            <h3 class="item-card__title">Pedido #${pedido.id}</h3>
            
            <div class="pedido-info">
                <div class="info-group">
                    <i class="fas fa-user"></i>
                    <span class="info-label">Cliente:</span>
                    <span class="info-value">${escapeHTML(pedido.cliente)}</span>
                </div>
                
                <div class="info-group">
                    <i class="fas fa-calendar"></i>
                    <span class="info-label">Data:</span>
                    <span class="info-value">${dataFormatada}</span>
                </div>
                
                <div class="info-group">
                    <i class="fas fa-tag"></i>
                    <span class="info-label">Status:</span>
                    <span class="info-value status-text status-${pedido.status.toLowerCase().replace(' ', '-')}">
                        ${pedido.status}
                    </span>
                </div>
            </div>

            <div class="pedido-itens">
                <strong class="itens-title">Itens:</strong>
                <div class="itens-lista">${itensFormatados}</div>
            </div>

            <div class="pedido-total">
                <strong>Total: ${formatarMoeda(total)}</strong>
            </div>
        </div>

        <div class="actions">
            <button class="btn btn-warning btn--sm" onclick="editarStatusPedido(${pedido.id})" 
                    aria-label="Alterar status do pedido ${pedido.id}">
                <i class="fas fa-edit"></i> Status
            </button>
            <button class="btn btn-danger btn--sm" onclick="excluirPedido(${pedido.id})"
                    aria-label="Excluir pedido ${pedido.id}">
                <i class="fas fa-trash"></i> Excluir
            </button>
        </div>
    `;

    // Adicionar efeitos de hover
    card.addEventListener('mouseenter', () => card.classList.add('card-hover'));
    card.addEventListener('mouseleave', () => card.classList.remove('card-hover'));

    return card;
}

/**
 * Calcula totais e formata itens do pedido
 */
function calcularDadosPedido(pedido) {
    const total = pedido.item_pedido.reduce((sum, item) => {
        return sum + (item.quantidade * item.produtos.preco);
    }, 0);

    const itensFormatados = pedido.item_pedido.map(item => 
        `<div class="item-line">
            <span class="item-quantity">${item.quantidade}x</span>
            <span class="item-name">${escapeHTML(item.produtos.nome)}</span>
            <span class="item-subtotal">${formatarMoeda(item.quantidade * item.produtos.preco)}</span>
        </div>`
    ).join('');

    return { total, itensFormatados };
}

/**
 * Cria badge de status com cores apropriadas
 */
function criarBadgeStatus(status) {
    const statusClass = `status-${status.toLowerCase().replace(' ', '-')}`;
    return `<div class="badge badge--${statusClass}">${status}</div>`;
}

// ===== GERENCIAMENTO DE STATUS =====
/**
 * Interface para edição de status do pedido
 */
window.editarStatusPedido = async function(pedidoId) {
    const pedido = estadoPedidos.pedidos.find(p => p.id === pedidoId);
    if (!pedido) {
        mostrarMensagemPedidos('Pedido não encontrado', 'error');
        return;
    }

    const novoStatus = await mostrarModalStatus(pedido.status);
    if (!novoStatus || novoStatus === pedido.status) return;

    await atualizarStatusPedido(pedidoId, novoStatus);
};

/**
 * Mostra modal para seleção de novo status
 */
async function mostrarModalStatus(statusAtual) {
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal__content">
                <h3>Alterar Status do Pedido</h3>
                <p>Selecione o novo status:</p>
                
                <div class="status-options">
                    ${PEDIDOS_CONFIG.STATUS_OPCOES.map(status => `
                        <label class="status-option ${status === statusAtual ? 'status-option--active' : ''}">
                            <input type="radio" name="status" value="${status}" 
                                   ${status === statusAtual ? 'checked' : ''}>
                            <span class="status-option__text">${status}</span>
                        </label>
                    `).join('')}
                </div>
                
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="fecharModalStatus(null)">
                        Cancelar
                    </button>
                    <button type="button" class="btn btn-primary" onclick="fecharModalStatus(document.querySelector('input[name=\"status\"]:checked')?.value)">
                        Confirmar
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.style.display = 'flex';

        window.fecharModalStatus = (resultado) => {
            modal.remove();
            window.fecharModalStatus = null;
            resolve(resultado);
        };
    });
}

/**
 * Atualiza status do pedido no Supabase
 */
async function atualizarStatusPedido(pedidoId, novoStatus) {
    try {
        console.log(`🔄 Atualizando pedido ${pedidoId} para status: ${novoStatus}`);
        
        mostrarMensagemPedidos('Atualizando status...', 'info');

        const { error } = await supabase
            .from('pedidos')
            .update({ 
                status: novoStatus,
                atualizado_em: new Date().toISOString()
            })
            .eq('id', pedidoId);

        if (error) throw error;

        mostrarMensagemPedidos('Status atualizado com sucesso!', 'success');
        
        // Atualizar interface sem recarregar tudo
        await atualizarInterfaceStatus(pedidoId, novoStatus);
        
    } catch (error) {
        console.error('❌ Erro ao atualizar status:', error);
        mostrarMensagemPedidos(`Erro ao atualizar status: ${error.message}`, 'error');
    }
}

/**
 * Atualiza interface após mudança de status
 */
async function atualizarInterfaceStatus(pedidoId, novoStatus) {
    const card = document.querySelector(`[data-pedido-id="${pedidoId}"]`);
    if (card) {
        // Atualizar badge
        const badge = card.querySelector('.badge');
        if (badge) {
            badge.className = `badge badge--status-${novoStatus.toLowerCase().replace(' ', '-')}`;
            badge.textContent = novoStatus;
        }
        
        // Atualizar texto de status
        const statusText = card.querySelector('.status-text');
        if (statusText) {
            statusText.className = `status-text status-${novoStatus.toLowerCase().replace(' ', '-')}`;
            statusText.textContent = novoStatus;
        }
        
        // Efeito visual de atualização
        card.classList.add('status-updated');
        setTimeout(() => card.classList.remove('status-updated'), 1000);
    } else {
        // Fallback: recarregar pedidos
        await carregarPedidos();
    }
}

// ===== EXCLUSÃO DE PEDIDOS =====
/**
 * Gerencia exclusão de pedido com confirmação
 */
window.excluirPedido = async function(pedidoId) {
    const pedido = estadoPedidos.pedidos.find(p => p.id === pedidoId);
    if (!pedido) return;

    const confirmado = await mostrarConfirmacaoExclusao(pedido);
    if (!confirmado) return;

    await executarExclusaoPedido(pedidoId);
};

/**
 * Mostra modal de confirmação de exclusão
 */
async function mostrarConfirmacaoExclusao(pedido) {
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal__content">
                <div class="confirmacao-exclusao">
                    <i class="fas fa-exclamation-triangle confirmacao-exclusao__icone"></i>
                    <h3>Confirmar Exclusão</h3>
                    <p>Tem certeza que deseja excluir o <strong>Pedido #${pedido.id}</strong>?</p>
                    <p class="confirmacao-exclusao__detalhes">
                        Cliente: <strong>${escapeHTML(pedido.cliente)}</strong><br>
                        Itens: <strong>${pedido.item_pedido.length}</strong><br>
                        Total: <strong>${formatarMoeda(calcularDadosPedido(pedido).total)}</strong>
                    </p>
                    <p class="confirmacao-exclusao__aviso">
                        <i class="fas fa-info-circle"></i>
                        Esta ação não pode ser desfeita.
                    </p>
                </div>
                
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="fecharConfirmacaoExclusao(false)">
                        Cancelar
                    </button>
                    <button type="button" class="btn btn-danger" onclick="fecharConfirmacaoExclusao(true)">
                        <i class="fas fa-trash"></i> Excluir Pedido
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.style.display = 'flex';

        window.fecharConfirmacaoExclusao = (resultado) => {
            modal.remove();
            window.fecharConfirmacaoExclusao = null;
            resolve(resultado);
        };
    });
}

/**
 * Executa exclusão do pedido no Supabase
 */
async function executarExclusaoPedido(pedidoId) {
    try {
        console.log(`🗑️ Excluindo pedido ${pedidoId}`);
        
        mostrarMensagemPedidos('Excluindo pedido...', 'info');

        const { error } = await supabase
            .from('pedidos')
            .delete()
            .eq('id', pedidoId);

        if (error) throw error;

        mostrarMensagemPedidos('Pedido excluído com sucesso!', 'success');
        
        // Remover da interface
        removerPedidoDaInterface(pedidoId);
        
    } catch (error) {
        console.error('❌ Erro ao excluir pedido:', error);
        mostrarMensagemPedidos(`Erro ao excluir pedido: ${error.message}`, 'error');
    }
}

/**
 * Remove pedido da interface após exclusão
 */
function removerPedidoDaInterface(pedidoId) {
    const card = document.querySelector(`[data-pedido-id="${pedidoId}"]`);
    if (card) {
        // Animação de saída
        card.style.transform = 'scale(0.8)';
        card.style.opacity = '0';
        
        setTimeout(() => {
            card.remove();
            
            // Verificar se não há mais pedidos
            if (estadoPedidos.container.children.length === 0) {
                exibirEstadoVazio();
            }
        }, 300);
    } else {
        // Fallback: recarregar
        carregarPedidos();
    }
}

// ===== GERENCIAMENTO DE INTERFACE =====
/**
 * Controla exibição do estado de carregamento
 */
function mostrarEstadoCarregamentoPedidos(carregando) {
    if (estadoPedidos.loading) {
        estadoPedidos.loading.style.display = carregando ? 'flex' : 'none';
        
        if (carregando) {
            estadoPedidos.loading.innerHTML = `
                <div class="loading__spinner"></div>
                <p>Carregando pedidos...</p>
            `;
        }
    }
}

/**
 * Limpa container de pedidos
 */
function limparContainerPedidos() {
    if (estadoPedidos.container) {
        estadoPedidos.container.innerHTML = '';
    }
}

/**
 * Exibe estado quando não há pedidos
 */
function exibirEstadoVazio() {
    estadoPedidos.container.innerHTML = `
        <div class="estado-vazio">
            <i class="fas fa-list estado-vazio__icone"></i>
            <h3 class="estado-vazio__titulo">Nenhum pedido encontrado</h3>
            <p class="estado-vazio__descricao">Comece criando seu primeiro pedido!</p>
            <a href="novo-pedido.html" class="btn btn-primary estado-vazio__acao">
                <i class="fas fa-plus"></i> Criar Primeiro Pedido
            </a>
        </div>
    `;
}

/**
 * Exibe erro de carregamento
 */
function exibirErroCarregamento(error) {
    estadoPedidos.container.innerHTML = `
        <div class="erro-carregamento">
            <i class="fas fa-exclamation-triangle erro-carregamento__icone"></i>
            <h3 class="erro-carregamento__titulo">Erro ao carregar pedidos</h3>
            <p class="erro-carregamento__descricao">${error.message}</p>
            <button class="btn btn-primary erro-carregamento__acao" onclick="carregarPedidos()">
                <i class="fas fa-redo"></i> Tentar Novamente
            </button>
        </div>
    `;
}

// ===== AUTO REFRESH =====
/**
 * Inicia atualização automática de pedidos
 */
function iniciarAutoRefresh() {
    estadoPedidos.refreshInterval = setInterval(() => {
        if (!document.hidden) { // Só atualizar se a página estiver visível
            carregarPedidos();
        }
    }, PEDIDOS_CONFIG.AUTO_REFRESH_INTERVAL);
}

/**
 * Para atualização automática
 */
function pararAutoRefresh() {
    if (estadoPedidos.refreshInterval) {
        clearInterval(estadoPedidos.refreshInterval);
        estadoPedidos.refreshInterval = null;
    }
}

// ===== SISTEMA DE MENSAGENS =====
/**
 * Sistema de mensagens para o módulo de pedidos
 */
function mostrarMensagemPedidos(mensagem, tipo = 'info') {
    if (!estadoPedidos.messageArea) return;
    
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
    
    estadoPedidos.messageArea.appendChild(messageDiv);
    
    // Auto-remover
    setTimeout(() => {
        if (messageDiv.parentElement) {
            messageDiv.remove();
        }
    }, PEDIDOS_CONFIG.MENSAGEM_TIMEOUT);
}

// ===== UTILITÁRIOS =====
/**
 * Formata data para exibição
 */
function formatarData(dataString) {
    return new Date(dataString).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
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

// ===== LIMPEZA =====
/**
 * Limpeza quando a página for descarregada
 */
window.addEventListener('beforeunload', () => {
    pararAutoRefresh();
});
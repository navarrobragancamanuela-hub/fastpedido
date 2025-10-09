// ===== CONFIGURAÇÕES E CONSTANTES =====
const PEDIDOS_CONFIG = {
    MENSAGEM_TIMEOUT: 5000,
    AUTO_REFRESH_INTERVAL: 30000, // 30 segundos
    DEBOUNCE_DELAY: 300,
    STATUS_OPCOES: ['Em preparo', 'Pronto', 'Entregue']
};

/**
 * Atualiza os cards de estatísticas na tela
 */
function atualizarEstatisticasNaTela(pedidos) {
    const totalPedidos = pedidos.length;
    const pedidosPreparo = pedidos.filter(p => p.status === 'Em preparo').length;
    const pedidosProntos = pedidos.filter(p => p.status === 'Pronto').length;
    const pedidosEntregues = pedidos.filter(p => p.status === 'Entregue').length;
    
    const valorTotal = pedidos.reduce((total, pedido) => {
        return total + pedido.item_pedido.reduce((sum, item) => 
            sum + (item.quantidade * item.produtos.preco), 0
        );
    }, 0);

    // Atualizar os elementos na tela
    const elementos = {
        'total-pedidos': totalPedidos,
        'pedidos-preparo': pedidosPreparo,
        'pedidos-prontos': pedidosProntos,
        'pedidos-entregues': pedidosEntregues
    };

    // Atualizar cada elemento
    Object.entries(elementos).forEach(([id, valor]) => {
        const elemento = document.getElementById(id);
        if (elemento) {
            elemento.textContent = valor;
        }
    });

    // Atualizar também os badges de contagem na navegação
    const pedidosCount = document.getElementById('pedidos-count');
    if (pedidosCount) {
        pedidosCount.textContent = totalPedidos;
    }

    console.log(`📊 Estatísticas atualizadas na tela:
    • Total: ${totalPedidos} pedidos
    • Em preparo: ${pedidosPreparo}
    • Prontos: ${pedidosProntos} 
    • Entregues: ${pedidosEntregues}
    • Valor total: R$ ${valorTotal.toFixed(2)}`);
}

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
    inicializarFiltroStatus(); // ✅ ADICIONAR AQUI
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
    
    // ⭐ ATUALIZAR ESTATÍSTICAS NA TELA
    atualizarEstatisticasNaTela(estadoPedidos.pedidos);
    
    // Log estatísticas (opcional - para o console)
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
 * Mostra modal para seleção de novo status - VERSÃO CORRIGIDA COM CSS INLINE
 */
async function mostrarModalStatus(statusAtual) {
    return new Promise((resolve) => {
        const modal = document.createElement('div');
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
            font-family: 'Segoe UI', sans-serif;
        `;

        modal.innerHTML = `
            <div style="
                background: linear-gradient(145deg, #ffffff, #f8f9fa);
                padding: 30px;
                border-radius: 20px;
                box-shadow: 0 15px 50px rgba(0,0,0,0.15);
                border: 3px solid #ffa502;
                max-width: 500px;
                width: 90%;
                max-height: 80vh;
                overflow-y: auto;
            ">
                <div style="
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                    padding-bottom: 15px;
                    border-bottom: 2px solid #ffa502;
                ">
                    <h3 style="
                        color: #2c3e50;
                        font-size: 1.5rem;
                        font-weight: 800;
                        display: flex;
                        align-items: center;
                        gap: 10px;
                        margin: 0;
                    ">
                        <i class="fas fa-edit"></i>
                        Alterar Status do Pedido
                    </h3>
                </div>
                
                <div style="margin-bottom: 25px;">
                    <p style="margin-bottom: 20px; color: #2c3e50; font-weight: 600; font-size: 1.1rem;">
                        Selecione o novo status:
                    </p>
                    
                    <div style="display: flex; flex-direction: column; gap: 12px;">
                        ${PEDIDOS_CONFIG.STATUS_OPCOES.map(status => `
                            <label style="
                                display: flex;
                                align-items: center;
                                gap: 15px;
                                padding: 18px 20px;
                                background: linear-gradient(145deg, #ffffff, #f8f9fa);
                                border: 3px solid ${status === statusAtual ? '#2ed573' : '#bdc3c7'};
                                border-radius: 12px;
                                cursor: pointer;
                                transition: all 0.3s ease;
                                font-weight: 600;
                                color: #2c3e50;
                                ${status === statusAtual ? 'background: linear-gradient(135deg, #ffffff, rgba(46, 213, 115, 0.1)); box-shadow: 0 4px 15px rgba(0,0,0,0.1);' : ''}
                            ">
                                <input 
                                    type="radio" 
                                    name="status" 
                                    value="${status}" 
                                    ${status === statusAtual ? 'checked' : ''}
                                    style="width: 20px; height: 20px; accent-color: #2ed573; cursor: pointer;"
                                >
                                <span style="font-size: 1.1rem; font-weight: 700; flex: 1; cursor: pointer;">
                                    ${status}
                                </span>
                                ${status === statusAtual ? '<i class="fas fa-check" style="color: #2ed573;"></i>' : ''}
                            </label>
                        `).join('')}
                    </div>
                </div>
                
                <div style="
                    display: flex;
                    justify-content: flex-end;
                    gap: 15px;
                    margin-top: 25px;
                    padding-top: 20px;
                    border-top: 1px solid rgba(0,0,0,0.1);
                ">
                    <button 
                        type="button" 
                        onclick="fecharModalStatus(null)" 
                        style="
                            background: #7f8c8d;
                            color: white;
                            border: 2px solid #7f8c8d;
                            padding: 12px 24px;
                            border-radius: 25px;
                            cursor: pointer;
                            font-weight: 700;
                            font-size: 1rem;
                            transition: all 0.3s ease;
                        "
                        onmouseover="this.style.background='#636e72'; this.style.borderColor='#636e72'"
                        onmouseout="this.style.background='#7f8c8d'; this.style.borderColor='#7f8c8d'"
                    >
                        Cancelar
                    </button>
                    <button 
                        type="button" 
                        onclick="fecharModalStatus(document.querySelector('input[name=\\'status\\']:checked')?.value)" 
                        style="
                            background: linear-gradient(135deg, #ff4757, #e8413d);
                            color: white;
                            border: 2px solid #e8413d;
                            padding: 12px 24px;
                            border-radius: 25px;
                            cursor: pointer;
                            font-weight: 700;
                            font-size: 1rem;
                            transition: all 0.3s ease;
                        "
                        onmouseover="this.style.background='linear-gradient(135deg, #e8413d, #c23616)'; this.style.borderColor='#c23616'"
                        onmouseout="this.style.background='linear-gradient(135deg, #ff4757, #e8413d)'; this.style.borderColor='#e8413d'"
                    >
                        Confirmar
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Adicionar efeitos de hover aos itens
        const statusOptions = modal.querySelectorAll('label');
        statusOptions.forEach(option => {
            option.addEventListener('mouseenter', function() {
                if (!this.querySelector('input').checked) {
                    this.style.transform = 'translateX(5px)';
                    this.style.borderColor = '#ffa502';
                }
            });
            
            option.addEventListener('mouseleave', function() {
                if (!this.querySelector('input').checked) {
                    this.style.transform = 'translateX(0)';
                    this.style.borderColor = '#bdc3c7';
                }
            });

            // Clique para selecionar
            option.addEventListener('click', function() {
                const input = this.querySelector('input');
                input.checked = true;
                
                // Remover seleção de outros
                statusOptions.forEach(opt => {
                    if (opt !== this) {
                        opt.style.background = 'linear-gradient(145deg, #ffffff, #f8f9fa)';
                        opt.style.borderColor = '#bdc3c7';
                        opt.querySelector('i.fa-check')?.remove();
                    }
                });
                
                // Adicionar check ao selecionado
                if (!this.querySelector('i.fa-check')) {
                    this.style.background = 'linear-gradient(135deg, #ffffff, rgba(46, 213, 115, 0.1))';
                    this.style.borderColor = '#2ed573';
                    this.style.boxShadow = '0 4px 15px rgba(0,0,0,0.1)';
                    this.innerHTML += '<i class="fas fa-check" style="color: #2ed573;"></i>';
                }
            });
        });

        window.fecharModalStatus = (resultado) => {
            if (modal.parentNode) {
                modal.remove();
            }
            window.fecharModalStatus = null;
            resolve(resultado);
        };

        // Fechar modal ao clicar fora
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                fecharModalStatus(null);
            }
        });

        // Fechar com ESC
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                fecharModalStatus(null);
                document.removeEventListener('keydown', handleEsc);
            }
        };
        document.addEventListener('keydown', handleEsc);
    });
}

/**
 * Atualiza status do pedido no Supabase - VERSÃO CORRIGIDA
 */
async function atualizarStatusPedido(pedidoId, novoStatus) {
    try {
        console.log(`🔄 Atualizando pedido ${pedidoId} para status: ${novoStatus}`);
        
        mostrarMensagemPedidos('Atualizando status...', 'info');

        // Tenta atualizar apenas o status (sem atualizado_em)
        const { error } = await supabase
            .from('pedidos')
            .update({ 
                status: novoStatus
                // REMOVI: atualizado_em: new Date().toISOString()
            })
            .eq('id', pedidoId);

        if (error) {
            // Se der erro, tenta sem nenhum campo extra
            const { error: errorSimple } = await supabase
                .from('pedidos')
                .update({ status: novoStatus })
                .eq('id', pedidoId);
                
            if (errorSimple) throw errorSimple;
        }

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
        // Atualizar estatísticas quando mudar o status
        atualizarEstatisticasNaTela(estadoPedidos.pedidos);
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
// ===== 🔍 FILTRO DE PEDIDOS POR STATUS =====
/**
 * Filtra pedidos por status - FUNÇÃO QUE ESTAVA FALTANDO
 */
function filtrarPedidosPorStatus(status) {
    const cards = document.querySelectorAll('.pedido-card, .item-card');
    let visiveis = 0;
    
    cards.forEach(card => {
        const badge = card.querySelector('.badge');
        if (badge) {
            const cardStatus = badge.textContent.trim();
            const deveMostrar = status === 'all' || cardStatus === status;
            
            card.style.display = deveMostrar ? 'block' : 'none';
            if (deveMostrar) visiveis++;
        }
    });
    
    // Atualizar subtítulo
    const subtitle = document.getElementById('pedidos-subtitle');
    if (subtitle) {
        if (status === 'all') {
            subtitle.textContent = `${visiveis} pedidos encontrados`;
        } else {
            subtitle.textContent = `${visiveis} pedidos ${status.toLowerCase()}`;
        }
    }
    
    // Mostrar/ocultar estado vazio
    const emptyState = document.getElementById('empty-state');
    if (emptyState) {
        emptyState.hidden = visiveis > 0;
    }
    
    console.log(`🎯 Filtro aplicado: ${status} - ${visiveis} pedidos visíveis`);
}

// ===== 🎛️ CONFIGURAÇÃO DO FILTRO =====
/**
 * Inicializa o evento do filtro de status
 */
function inicializarFiltroStatus() {
    const filtroSelect = document.getElementById('status-filter');
    if (filtroSelect) {
        filtroSelect.addEventListener('change', function() {
            filtrarPedidosPorStatus(this.value);
        });
        console.log('✅ Filtro de status inicializado');
    }
}

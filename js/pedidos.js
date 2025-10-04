let pedidosContainer, loadingDiv, messageArea;

document.addEventListener('DOMContentLoaded', async () => {
    pedidosContainer = document.getElementById('pedidos-container');
    loadingDiv = document.getElementById('loading');
    messageArea = document.getElementById('message-area');
    
    await carregarPedidos();
});

function mostrarMensagem(mensagem, tipo = 'error') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `${tipo} message`;
    messageDiv.innerHTML = `
        <i class="fas ${tipo === 'error' ? 'fa-exclamation-circle' : 'fa-check-circle'}"></i>
        ${mensagem}
    `;
    messageArea.innerHTML = '';
    messageArea.appendChild(messageDiv);
    
    setTimeout(() => {
        if (messageArea.contains(messageDiv)) {
            messageArea.removeChild(messageDiv);
        }
    }, 5000);
}

async function carregarPedidos() {
    try {
        loadingDiv.style.display = 'block';
        pedidosContainer.innerHTML = '';
        
        console.log('📦 Carregando pedidos...');
        
        const { data: pedidos, error } = await supabase
            .from('pedidos')
            .select(`
                *,
                item_pedido (
                    quantidade,
                    produtos (nome, preco)
                )
            `)
            .order('data', { ascending: false });

        if (error) throw error;

        console.log('✅ Pedidos carregados:', pedidos);

        if (!pedidos || pedidos.length === 0) {
            pedidosContainer.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #666;">
                    <i class="fas fa-list" style="font-size: 3rem; margin-bottom: 20px; display: block;"></i>
                    <h3>Nenhum pedido encontrado</h3>
                    <p>Comece criando seu primeiro pedido!</p>
                </div>
            `;
            return;
        }

        pedidos.forEach(pedido => {
            const pedidoCard = criarCardPedido(pedido);
            pedidosContainer.appendChild(pedidoCard);
        });

    } catch (error) {
        console.error('❌ Erro ao carregar pedidos:', error);
        mostrarMensagem('Erro ao carregar pedidos: ' + error.message);
        pedidosContainer.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #d32f2f;">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Erro ao carregar pedidos</h3>
                <p>Verifique a conexão com o Supabase</p>
            </div>
        `;
    } finally {
        loadingDiv.style.display = 'none';
    }
}

function criarCardPedido(pedido) {
    const pedidoDiv = document.createElement('div');
    pedidoDiv.className = 'pedido-card';
    
    const total = pedido.item_pedido.reduce((sum, item) => {
        return sum + (item.quantidade * item.produtos.preco);
    }, 0);

    const itens = pedido.item_pedido.map(item => 
        `${item.quantidade}x ${item.produtos.nome} - R$ ${(item.quantidade * item.produtos.preco).toFixed(2)}`
    ).join('<br>');

    pedidoDiv.innerHTML = `
        <div class="status-badge status-${pedido.status.toLowerCase().replace(' ', '-')}">
            ${pedido.status}
        </div>
        
        <h3>Pedido #${pedido.id}</h3>
        <p><strong>Cliente:</strong> ${pedido.cliente}</p>
        <p><strong>Data:</strong> ${new Date(pedido.data).toLocaleString('pt-BR')}</p>
        <p><strong>Status:</strong> ${pedido.status}</p>
        <p><strong>Itens:</strong><br>${itens}</p>
        <p><strong>Total:</strong> R$ ${total.toFixed(2)}</p>
        
        <div class="actions">
            <button class="btn btn-warning" onclick="editarStatusPedido(${pedido.id})">
                <i class="fas fa-edit"></i> Status
            </button>
            <button class="btn btn-danger" onclick="excluirPedido(${pedido.id})">
                <i class="fas fa-trash"></i> Excluir
            </button>
        </div>
    `;

    return pedidoDiv;
}

window.editarStatusPedido = async function(pedidoId) {
    const novoStatus = prompt('Novo status (Em preparo, Pronto, Entregue):');
    if (!novoStatus) return;

    try {
        const { error } = await supabase
            .from('pedidos')
            .update({ status: novoStatus })
            .eq('id', pedidoId);

        if (error) throw error;

        mostrarMensagem('Status atualizado com sucesso!', 'success');
        carregarPedidos();
    } catch (error) {
        console.error('Erro ao atualizar status:', error);
        mostrarMensagem('Erro ao atualizar status: ' + error.message);
    }
};

window.excluirPedido = async function(pedidoId) {
    if (!confirm('Tem certeza que deseja excluir este pedido?')) return;

    try {
        const { error } = await supabase
            .from('pedidos')
            .delete()
            .eq('id', pedidoId);

        if (error) throw error;

        mostrarMensagem('Pedido excluído com sucesso!', 'success');
        carregarPedidos();
    } catch (error) {
        console.error('Erro ao excluir pedido:', error);
        mostrarMensagem('Erro ao excluir pedido: ' + error.message);
    }
};
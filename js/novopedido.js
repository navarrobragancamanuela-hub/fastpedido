let formPedido, itensContainer, messageArea, submitBtn;
let produtosDisponiveis = [];

document.addEventListener('DOMContentLoaded', async () => {
    formPedido = document.getElementById('form-pedido');
    itensContainer = document.getElementById('itens-container');
    messageArea = document.getElementById('message-area');
    submitBtn = document.getElementById('submit-btn');
    
    await carregarProdutos();
    adicionarItem(); // Adiciona o primeiro item automaticamente
    
    formPedido.addEventListener('submit', handleSubmitPedido);
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

async function carregarProdutos() {
    try {
        const { data: produtos, error } = await supabase
            .from('produtos')
            .select('*')
            .order('nome', { ascending: true });

        if (error) throw error;
        
        produtosDisponiveis = produtos || [];
        console.log('✅ Produtos carregados:', produtosDisponiveis);
        
    } catch (error) {
        console.error('❌ Erro ao carregar produtos:', error);
        mostrarMensagem('Erro ao carregar produtos: ' + error.message);
    }
}

function adicionarItem() {
    if (produtosDisponiveis.length === 0) {
        mostrarMensagem('Nenhum produto disponível. Cadastre produtos primeiro.', 'error');
        return;
    }
    
    const itemDiv = document.createElement('div');
    itemDiv.className = 'item-pedido';
    
    const selectProduto = document.createElement('select');
    selectProduto.required = true;
    
    // Adiciona opção vazia
    const optionVazia = document.createElement('option');
    optionVazia.value = '';
    optionVazia.textContent = 'Selecione um produto';
    selectProduto.appendChild(optionVazia);
    
    // Adiciona produtos
    produtosDisponiveis.forEach(produto => {
        const option = document.createElement('option');
        option.value = produto.id;
        option.textContent = `${produto.nome} - R$ ${produto.preco.toFixed(2)}`;
        selectProduto.appendChild(option);
    });
    
    const inputQuantidade = document.createElement('input');
    inputQuantidade.type = 'number';
    inputQuantidade.min = '1';
    inputQuantidade.value = '1';
    inputQuantidade.required = true;
    inputQuantidade.placeholder = 'Quantidade';
    
    const btnRemover = document.createElement('button');
    btnRemover.type = 'button';
    btnRemover.className = 'remove-item';
    btnRemover.innerHTML = '<i class="fas fa-times"></i>';
    btnRemover.onclick = function() {
        if (itensContainer.children.length > 1) {
            itensContainer.removeChild(itemDiv);
        } else {
            mostrarMensagem('O pedido deve ter pelo menos um item.', 'error');
        }
    };
    
    itemDiv.appendChild(selectProduto);
    itemDiv.appendChild(inputQuantidade);
    itemDiv.appendChild(btnRemover);
    
    itensContainer.appendChild(itemDiv);
}

async function handleSubmitPedido(event) {
    event.preventDefault();
    
    const cliente = document.getElementById('cliente').value;
    const status = document.getElementById('status').value;
    
    if (!cliente) {
        mostrarMensagem('Por favor, informe o nome do cliente.', 'error');
        return;
    }
    
    // Coletar itens
    const itens = [];
    const itensElements = itensContainer.getElementsByClassName('item-pedido');
    
    for (let itemElement of itensElements) {
        const select = itemElement.querySelector('select');
        const input = itemElement.querySelector('input[type="number"]');
        
        if (!select.value) {
            mostrarMensagem('Todos os itens devem ter um produto selecionado.', 'error');
            return;
        }
        
        itens.push({
            produto_id: parseInt(select.value),
            quantidade: parseInt(input.value)
        });
    }
    
    if (itens.length === 0) {
        mostrarMensagem('O pedido deve ter pelo menos um item.', 'error');
        return;
    }
    
    try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Criando...';

        // 1. Criar o pedido
        const { data: pedido, error: pedidoError } = await supabase
            .from('pedidos')
            .insert([{
                cliente: cliente,
                status: status,
                data: new Date().toISOString()
            }])
            .select()
            .single();

        if (pedidoError) throw pedidoError;

        // 2. Adicionar itens do pedido
        const itensComPedidoId = itens.map(item => ({
            pedido_id: pedido.id,
            produto_id: item.produto_id,
            quantidade: item.quantidade
        }));

        const { error: itensError } = await supabase
            .from('item_pedido')
            .insert(itensComPedidoId);

        if (itensError) throw itensError;

        mostrarMensagem('Pedido criado com sucesso!', 'success');
        
        // Limpar formulário
        formPedido.reset();
        itensContainer.innerHTML = '';
        adicionarItem(); // Adiciona um novo item vazio
        
        // Redirecionar após 2 segundos
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);

    } catch (error) {
        console.error('❌ Erro ao criar pedido:', error);
        mostrarMensagem('Erro ao criar pedido: ' + error.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-save"></i> Criar Pedido';
    }
}
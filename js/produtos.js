let produtosContainer, loadingDiv, messageArea, formProduto, modal, submitBtn;
let editandoProdutoId = null;

document.addEventListener('DOMContentLoaded', async () => {
    produtosContainer = document.getElementById('produtos-container');
    loadingDiv = document.getElementById('loading');
    messageArea = document.getElementById('message-area');
    formProduto = document.getElementById('form-produto');
    modal = document.getElementById('modal-produto');
    submitBtn = document.getElementById('submit-btn');
    
    formProduto.addEventListener('submit', handleSubmitProduto);
    
    await carregarProdutos();
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
        loadingDiv.style.display = 'block';
        produtosContainer.innerHTML = '';
        
        console.log('🍕 Carregando produtos...');
        
        const { data: produtos, error } = await supabase
            .from('produtos')
            .select('*')
            .order('nome', { ascending: true });

        if (error) throw error;

        console.log('✅ Produtos carregados:', produtos);

        if (!produtos || produtos.length === 0) {
            produtosContainer.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #666;">
                    <i class="fas fa-utensils" style="font-size: 3rem; margin-bottom: 20px; display: block;"></i>
                    <h3>Nenhum produto cadastrado</h3>
                    <p>Adicione seu primeiro produto!</p>
                </div>
            `;
            return;
        }

        produtos.forEach(produto => {
            const produtoCard = criarCardProduto(produto);
            produtosContainer.appendChild(produtoCard);
        });

    } catch (error) {
        console.error('❌ Erro ao carregar produtos:', error);
        mostrarMensagem('Erro ao carregar produtos: ' + error.message);
    } finally {
        loadingDiv.style.display = 'none';
    }
}

function criarCardProduto(produto) {
    const produtoDiv = document.createElement('div');
    produtoDiv.className = 'produto-card';
    
    produtoDiv.innerHTML = `
        <h3>${produto.nome}</h3>
        <div class="preco">R$ ${produto.preco.toFixed(2)}</div>
        <div class="descricao">${produto.descricao || 'Sem descrição'}</div>
        
        <div class="actions">
            <button class="btn btn-warning" onclick="editarProduto(${produto.id})">
                <i class="fas fa-edit"></i> Editar
            </button>
            <button class="btn btn-danger" onclick="excluirProduto(${produto.id})">
                <i class="fas fa-trash"></i> Excluir
            </button>
        </div>
    `;

    return produtoDiv;
}

function abrirModalProduto(produto = null) {
    const modalTitulo = document.getElementById('modal-titulo');
    
    if (produto) {
        modalTitulo.innerHTML = '<i class="fas fa-edit"></i> Editar Produto';
        document.getElementById('produto-id').value = produto.id;
        document.getElementById('nome').value = produto.nome;
        document.getElementById('preco').value = produto.preco;
        document.getElementById('descricao').value = produto.descricao || '';
        editandoProdutoId = produto.id;
        submitBtn.innerHTML = '<i class="fas fa-save"></i> Atualizar';
    } else {
        modalTitulo.innerHTML = '<i class="fas fa-plus"></i> Novo Produto';
        formProduto.reset();
        editandoProdutoId = null;
        submitBtn.innerHTML = '<i class="fas fa-save"></i> Salvar';
    }
    
    modal.style.display = 'flex';
}

function fecharModal() {
    modal.style.display = 'none';
    formProduto.reset();
    editandoProdutoId = null;
}

async function handleSubmitProduto(event) {
    event.preventDefault();
    
    const nome = document.getElementById('nome').value;
    const preco = document.getElementById('preco').value;
    
    if (!nome || !preco) {
        mostrarMensagem('Por favor, preencha nome e preço do produto.', 'error');
        return;
    }
    
    try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';

        const produtoData = {
            nome: nome,
            preco: parseFloat(preco),
            descricao: document.getElementById('descricao').value
        };

        if (editandoProdutoId) {
            const { error } = await supabase
                .from('produtos')
                .update(produtoData)
                .eq('id', editandoProdutoId);
            
            if (error) throw error;
            mostrarMensagem('Produto atualizado com sucesso!', 'success');
        } else {
            const { error } = await supabase
                .from('produtos')
                .insert([produtoData]);
            
            if (error) throw error;
            mostrarMensagem('Produto cadastrado com sucesso!', 'success');
        }
        
        fecharModal();
        await carregarProdutos();

    } catch (error) {
        console.error('Erro ao salvar produto:', error);
        mostrarMensagem('Erro ao salvar produto: ' + error.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = editandoProdutoId ? 
            '<i class="fas fa-save"></i> Atualizar' : 
            '<i class="fas fa-save"></i> Salvar';
    }
}

window.abrirModalProduto = abrirModalProduto;
window.fecharModal = fecharModal;

window.editarProduto = async function(produtoId) {
    try {
        const { data: produto, error } = await supabase
            .from('produtos')
            .select('*')
            .eq('id', produtoId)
            .single();

        if (error) throw error;
        abrirModalProduto(produto);

    } catch (error) {
        console.error('Erro ao carregar produto:', error);
        mostrarMensagem('Erro ao carregar produto: ' + error.message, 'error');
    }
};

window.excluirProduto = async function(produtoId) {
    if (!confirm('Tem certeza que deseja excluir este produto?')) return;

    try {
        const { error } = await supabase
            .from('produtos')
            .delete()
            .eq('id', produtoId);

        if (error) throw error;

        mostrarMensagem('Produto excluído com sucesso!', 'success');
        await carregarProdutos();

    } catch (error) {
        console.error('Erro ao excluir produto:', error);
        mostrarMensagem('Erro ao excluir produto. Verifique se não está em uso em pedidos.', 'error');
    }
};
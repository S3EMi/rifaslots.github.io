// ========== CONFIGURAÇÕES DA RIFA 2026 ==========
const ADMIN_PASSWORD = "LOTS2026Admin"; // Senha para acesso admin
let isAdminLoggedIn = false;

const RIFA_CONFIG = {
    START_NUMBER: 1,
    END_NUMBER: 350,
    PRICE_PER_NUMBER: 2.00, // VALOR ATUALIZADO PARA R$ 2,00
    WHATSAPP_NUMBER: "553196581509",
    RIFA_ID: "lots-aerodesign-2026",
    SORTEIO_DATE: "20/12/2026"
};

// Estrutura para armazenar vendas com nome do comprador
// Formato: { numero: { nome, telefone, data } }

const DOM = {
    grid: document.getElementById('numbersGrid'),
    count: document.getElementById('selectedCount'),
    total: document.getElementById('totalValue'),
    progress: document.getElementById('progressBar'),
    progressText: document.getElementById('progressText'),
    name: document.getElementById('customerName'),
    phone: document.getElementById('customerPhone'),
    buyBtn: document.getElementById('buyButton'),
    status: document.getElementById('connectionStatus'),
    loading: document.getElementById('loading'),
    content: document.getElementById('content'),
    totalNumbers: document.getElementById('totalNumbers'),
    soldNumbers: document.getElementById('soldNumbers'),
    availableNumbers: document.getElementById('availableNumbers'),
    raisedAmount: document.getElementById('raisedAmount'),
    pixValue: document.getElementById('pixValue'),
    rankingContainer: document.getElementById('rankingContainer')
};

let STATE = {
    selected: [],
    sold: [], // array de números pagos
    reserved: [],
    salesData: {} // { "numero": { nome, telefone, data } }
};

// Atualiza estatísticas
function updateStats() {
    if (DOM.totalNumbers) DOM.totalNumbers.textContent = RIFA_CONFIG.END_NUMBER;
    if (DOM.soldNumbers) DOM.soldNumbers.textContent = STATE.sold.length;
    if (DOM.availableNumbers) DOM.availableNumbers.textContent = RIFA_CONFIG.END_NUMBER - STATE.sold.length - STATE.reserved.length;
    if (DOM.raisedAmount) DOM.raisedAmount.textContent = `R$ ${(STATE.sold.length * RIFA_CONFIG.PRICE_PER_NUMBER).toFixed(2)}`;
}

// Atualiza o ranking dos maiores compradores
function updateRanking() {
    if (!DOM.rankingContainer) return;
    
    // Agrupar compras por nome
    const buyerStats = {};
    for (const [numero, data] of Object.entries(STATE.salesData)) {
        const nome = data.nome;
        if (!buyerStats[nome]) {
            buyerStats[nome] = {
                nome: nome,
                quantidade: 0,
                numeros: [],
                telefone: data.telefone,
                total: 0
            };
        }
        buyerStats[nome].quantidade++;
        buyerStats[nome].numeros.push(parseInt(numero));
        buyerStats[nome].total = buyerStats[nome].quantidade * RIFA_CONFIG.PRICE_PER_NUMBER;
    }
    
    // Ordenar por quantidade
    const ranking = Object.values(buyerStats).sort((a, b) => b.quantidade - a.quantidade);
    
    if (ranking.length === 0) {
        DOM.rankingContainer.innerHTML = '<div class="ranking-loading">📭 Nenhum número vendido ainda. Seja o primeiro apoiador!</div>';
        return;
    }
    
    // Renderizar ranking
    DOM.rankingContainer.innerHTML = ranking.slice(0, 10).map((buyer, index) => {
        let positionClass = '';
        let medal = '';
        if (index === 0) {
            positionClass = 'top1';
            medal = '👑 ';
        } else if (index === 1) {
            positionClass = 'top2';
            medal = '🥈 ';
        } else if (index === 2) {
            positionClass = 'top3';
            medal = '🥉 ';
        }
        
        const numerosStr = buyer.numeros.sort((a,b) => a-b).slice(0, 5).join(', ');
        const extraNumeros = buyer.numeros.length > 5 ? ` +${buyer.numeros.length - 5}` : '';
        
        return `
            <div class="ranking-item">
                <div class="ranking-position ${positionClass}">${medal || `${index + 1}º`}</div>
                <div class="ranking-info">
                    <div class="ranking-name">${escapeHtml(buyer.nome)}</div>
                    <div class="ranking-numbers">🎲 ${numerosStr}${extraNumeros}</div>
                </div>
                <div class="ranking-count">${buyer.quantidade} nº</div>
                <div class="ranking-value">R$ ${buyer.total.toFixed(2)}</div>
            </div>
        `;
    }).join('');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

async function init() {
    try {
        db.collection('rifas').doc(RIFA_CONFIG.RIFA_ID).onSnapshot(doc => {
            const data = doc.data() || {};
            STATE.sold = data.soldNumbers || [];
            STATE.reserved = data.reservedNumbers || [];
            STATE.salesData = data.salesData || {};
            render();
            updateUI();
            updateStats();
            updateRanking();
            DOM.status.className = "connection-status connected";
            DOM.status.innerHTML = "✅ Sistema Online 2026";
        });
        setupEvents();
        setupAdminLogin();
        DOM.loading.style.display = 'none';
        DOM.content.style.display = 'block';
    } catch (err) {
        DOM.status.innerHTML = "🔴 Erro de Conexão";
        console.error(err);
    }
}

function render() {
    DOM.grid.innerHTML = '';
    for (let i = RIFA_CONFIG.START_NUMBER; i <= RIFA_CONFIG.END_NUMBER; i++) {
        const div = document.createElement('div');
        div.className = 'number';
        div.textContent = i;
        
        if (STATE.sold.includes(i)) {
            div.classList.add('sold');
            // Adicionar tooltip com nome do comprador
            const saleInfo = STATE.salesData[i];
            if (saleInfo) {
                const tooltip = document.createElement('span');
                tooltip.className = 'tooltip';
                tooltip.textContent = `✅ ${saleInfo.nome} - R$ ${RIFA_CONFIG.PRICE_PER_NUMBER.toFixed(2)}`;
                div.appendChild(tooltip);
            }
        } else if (STATE.reserved.includes(i)) {
            div.classList.add('reserved');
        } else {
            if (STATE.selected.includes(i)) div.classList.add('selected');
            div.onclick = () => toggle(i);
        }
        DOM.grid.appendChild(div);
    }
}

function toggle(n) {
    STATE.selected.includes(n) ? 
        STATE.selected = STATE.selected.filter(num => num !== n) : 
        STATE.selected.push(n);
    updateUI();
    render();
}

function updateUI() {
    DOM.count.textContent = STATE.selected.length;
    const total = STATE.selected.length * RIFA_CONFIG.PRICE_PER_NUMBER;
    DOM.total.textContent = total.toFixed(2);
    if (DOM.pixValue) DOM.pixValue.textContent = `R$ ${total.toFixed(2)}`;
    
    const percent = ((STATE.sold.length / RIFA_CONFIG.END_NUMBER) * 100).toFixed(0);
    DOM.progress.style.width = percent + "%";
    DOM.progressText.textContent = `🎯 ${percent}% dos números vendidos! Continue apoiando!`;
    
    DOM.buyBtn.disabled = !(STATE.selected.length > 0 && DOM.name.value.trim() && DOM.phone.value.length >= 10);
    updateStats();
}

async function handleBuy() {
    const nome = DOM.name.value.trim();
    const telefone = DOM.phone.value.trim();
    const lista = STATE.selected.sort((a,b) => a-b);
    const total = (STATE.selected.length * RIFA_CONFIG.PRICE_PER_NUMBER).toFixed(2);
    const valorUnitario = RIFA_CONFIG.PRICE_PER_NUMBER.toFixed(2);
    
    const msg = `🏆 *RIFA L.O.T.S. AERODESIGN 2026* 🏆\n\n` +
        `👤 *Nome:* ${nome}\n` +
        `📱 *WhatsApp:* ${telefone}\n` +
        `🎲 *Números:* ${lista.join(', ')}\n` +
        `💰 *Valor unitário:* R$ ${valorUnitario}\n` +
        `💵 *Total:* R$ ${total}\n\n` +
        `💳 *Chave PIX:* (31) 9 9658-1509\n` +
        `📅 *Sorteio:* ${RIFA_CONFIG.SORTEIO_DATE}\n\n` +
        `✨ *Anexe o comprovante do pagamento aqui!* ✨`;
    
    // Reservar os números
    const novosReservados = [...new Set([...STATE.reserved, ...STATE.selected])];
    
    await db.collection('rifas').doc(RIFA_CONFIG.RIFA_ID).set({
        soldNumbers: STATE.sold,
        reservedNumbers: novosReservados,
        salesData: STATE.salesData
    }, { merge: true });

    window.open(`https://wa.me/${RIFA_CONFIG.WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`);
    STATE.selected = [];
    DOM.name.value = ''; 
    DOM.phone.value = '';
    updateUI();
    render();
}

function setupEvents() {
    DOM.buyBtn.onclick = handleBuy;
    document.getElementById('clearSelection').onclick = () => { 
        STATE.selected = []; 
        render(); 
        updateUI(); 
    };
    DOM.name.oninput = updateUI; 
    DOM.phone.oninput = updateUI;
}

// ========== SISTEMA DE LOGIN ADMIN ==========
function setupAdminLogin() {
    const modal = document.getElementById('adminModal');
    const loginBtn = document.getElementById('adminLoginBtn');
    const closeBtn = document.querySelector('.close');
    const loginSubmit = document.getElementById('loginSubmitBtn');
    const passwordInput = document.getElementById('adminPassword');
    const loginError = document.getElementById('loginError');
    
    if (!loginBtn) return;
    
    loginBtn.onclick = () => {
        if (isAdminLoggedIn) {
            showAdminConsole();
        } else {
            modal.style.display = 'block';
            passwordInput.value = '';
            loginError.textContent = '';
        }
    };
    
    closeBtn.onclick = () => {
        modal.style.display = 'none';
    };
    
    window.onclick = (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    };
    
    loginSubmit.onclick = () => {
        const password = passwordInput.value;
        if (password === ADMIN_PASSWORD) {
            isAdminLoggedIn = true;
            modal.style.display = 'none';
            showAdminConsole();
            setupAdminCommands();
            loginError.textContent = '';
        } else {
            loginError.textContent = '❌ Senha incorreta! Tente novamente.';
        }
    };
    
    passwordInput.onkeypress = (e) => {
        if (e.key === 'Enter') {
            loginSubmit.click();
        }
    };
}

function showAdminConsole() {
    console.clear();
    console.log("%c🔐 MODO ADMINISTRADOR ATIVADO", "background:#10B981;color:#fff;padding:12px 20px;border-radius:10px;font-size:16px;font-weight:bold");
    console.log("%c🚀 L.O.T.S. ADMIN 2026 - Sistema de Gestão", "background:#FF6B35;color:#fff;padding:10px 15px;border-radius:10px;font-size:14px;");
    console.log("%c💰 VALOR UNITÁRIO: R$ 2,00", "background:#0f2b5c;color:#FFD700;padding:5px 10px;border-radius:5px;font-weight:bold");
    console.log("%c📋 Comandos disponíveis:", "color:#0f2b5c;font-weight:bold;font-size:12px;");
    console.log("  • ajuda() - Mostrar todos os comandos");
    console.log("  • status() - Ver resumo da rifa");
    console.log("  • vender(n1, n2, ...) - Marcar números como pagos (com nome do comprador)");
    console.log("  • venderComNome(numero, nome, telefone) - Vender com dados completos");
    console.log("  • venderIntervalo(inicio, fim) - Vender intervalo");
    console.log("  • liberar(n1, n2, ...) - Liberar números");
    console.log("  • liberarTudo() - Resetar rifa (⚠️ cuidado!)");
    console.log("  • sortear() - Sortear ganhador");
    console.log("  • buscar(numero) - Verificar status de um número");
    console.log("  • vendidos() - Listar todos números pagos");
    console.log("  • ranking() - Ver ranking dos maiores compradores");
    console.log("  • topCompradores() - Ver top 10 compradores");
    console.log("  • sairAdmin() - Sair do modo admin");
}

function setupAdminCommands() {
    if (window.adminCommandsSetup) return;
    window.adminCommandsSetup = true;
    
    window.ajuda = () => {
        console.clear();
        showAdminConsole();
    };
    
    window.status = () => {
        const totalVendidos = STATE.sold.length;
        const totalReservados = STATE.reserved.length;
        const totalDisponiveis = RIFA_CONFIG.END_NUMBER - totalVendidos - totalReservados;
        const arrecadado = totalVendidos * RIFA_CONFIG.PRICE_PER_NUMBER;
        
        console.log("%c📊 STATUS DA RIFA L.O.T.S. 2026", "background:#0f2b5c;color:#fff;padding:6px 12px;border-radius:6px;");
        console.table({
            "📌 Total de Números": RIFA_CONFIG.END_NUMBER,
            "💰 Valor Unitário": `R$ ${RIFA_CONFIG.PRICE_PER_NUMBER.toFixed(2)}`,
            "✅ Pagos (Sold)": `${totalVendidos} números`,
            "⏳ Reservados": `${totalReservados} números`,
            "🟢 Disponíveis": `${totalDisponiveis} números`,
            "💰 Arrecadação Total": `R$ ${arrecadado.toFixed(2)}`,
            "🎯 Progresso": `${((totalVendidos / RIFA_CONFIG.END_NUMBER) * 100).toFixed(1)}%`
        });
    };
    
    window.vender = async (...args) => {
        const numeros = args.filter(a => typeof a === 'number');
        if (numeros.length === 0) {
            console.error("❌ Use: vender(7, 23, 42) - Depois informe o nome do comprador");
            return;
        }
        
        const valorTotal = numeros.length * RIFA_CONFIG.PRICE_PER_NUMBER;
        const nomeComprador = prompt(`📝 Informe o NOME do comprador para os números ${numeros.join(', ')} (Total: R$ ${valorTotal.toFixed(2)}):`);
        if (!nomeComprador) {
            console.log("❌ Operação cancelada - nome não informado");
            return;
        }
        
        const telefone = prompt(`📱 Informe o TELEFONE do comprador (opcional):`);
        
        const novosSold = [...new Set([...STATE.sold, ...numeros])];
        const novosReserved = STATE.reserved.filter(n => !numeros.includes(n));
        
        const novasSales = {...STATE.salesData};
        const dataAtual = new Date().toLocaleString('pt-BR');
        for (const num of numeros) {
            novasSales[num] = {
                nome: nomeComprador,
                telefone: telefone || 'Não informado',
                data: dataAtual,
                valor: RIFA_CONFIG.PRICE_PER_NUMBER
            };
        }
        
        await db.collection('rifas').doc(RIFA_CONFIG.RIFA_ID).update({ 
            soldNumbers: novosSold, 
            reservedNumbers: novosReserved,
            salesData: novasSales
        });
        console.log(`✅ ${numeros.length} número(s) marcado(s) como PAGO para ${nomeComprador}!`);
        console.log(`💰 Valor total: R$ ${valorTotal.toFixed(2)}`);
        console.log(`📈 Agora temos ${novosSold.length} números pagos`);
    };
    
    window.venderComNome = async (numero, nome, telefone = '') => {
        if (!numero || !nome) {
            console.error("❌ Use: venderComNome(42, 'João Silva', '(31) 99999-9999')");
            return;
        }
        const numeros = Array.isArray(numero) ? numero : [numero];
        const valorTotal = numeros.length * RIFA_CONFIG.PRICE_PER_NUMBER;
        
        const novosSold = [...new Set([...STATE.sold, ...numeros])];
        const novosReserved = STATE.reserved.filter(n => !numeros.includes(n));
        
        const novasSales = {...STATE.salesData};
        const dataAtual = new Date().toLocaleString('pt-BR');
        for (const num of numeros) {
            novasSales[num] = {
                nome: nome,
                telefone: telefone || 'Não informado',
                data: dataAtual,
                valor: RIFA_CONFIG.PRICE_PER_NUMBER
            };
        }
        
        await db.collection('rifas').doc(RIFA_CONFIG.RIFA_ID).update({ 
            soldNumbers: novosSold, 
            reservedNumbers: novosReserved,
            salesData: novasSales
        });
        console.log(`✅ Número ${numeros.join(', ')} vendido para ${nome}!`);
        console.log(`💰 Valor: R$ ${valorTotal.toFixed(2)}`);
    };
    
    window.venderIntervalo = async (inicio, fim) => {
        let lista = [];
        for(let i = inicio; i <= fim; i++) lista.push(i);
        const valorTotal = lista.length * RIFA_CONFIG.PRICE_PER_NUMBER;
        
        const nomeComprador = prompt(`📝 Informe o NOME do comprador para o intervalo ${inicio} até ${fim} (Total: R$ ${valorTotal.toFixed(2)}):`);
        if (!nomeComprador) {
            console.log("❌ Operação cancelada");
            return;
        }
        const telefone = prompt(`📱 Informe o TELEFONE (opcional):`);
        
        const novosSold = [...new Set([...STATE.sold, ...lista])];
        const novosReserved = STATE.reserved.filter(n => !lista.includes(n));
        
        const novasSales = {...STATE.salesData};
        const dataAtual = new Date().toLocaleString('pt-BR');
        for (const num of lista) {
            novasSales[num] = {
                nome: nomeComprador,
                telefone: telefone || 'Não informado',
                data: dataAtual,
                valor: RIFA_CONFIG.PRICE_PER_NUMBER
            };
        }
        
        await db.collection('rifas').doc(RIFA_CONFIG.RIFA_ID).update({ 
            soldNumbers: novosSold, 
            reservedNumbers: novosReserved,
            salesData: novasSales
        });
        console.log(`📦 Intervalo ${inicio} até ${fim} vendido para ${nomeComprador}!`);
        console.log(`💰 Valor total: R$ ${valorTotal.toFixed(2)}`);
    };
    
    window.liberar = async (...nums) => {
        const lista = Array.isArray(nums[0]) ? nums[0] : nums;
        
        const valorTotal = lista.length * RIFA_CONFIG.PRICE_PER_NUMBER;
        const confirmar = confirm(`⚠️ Tem certeza que deseja LIBERAR os números ${lista.join(', ')}? (Valor que seria estornado: R$ ${valorTotal.toFixed(2)})`);
        if (!confirmar) {
            console.log("❌ Operação cancelada");
            return;
        }
        
        const novasSales = {...STATE.salesData};
        for (const num of lista) {
            delete novasSales[num];
        }
        
        await db.collection('rifas').doc(RIFA_CONFIG.RIFA_ID).update({
            soldNumbers: STATE.sold.filter(n => !lista.includes(n)),
            reservedNumbers: STATE.reserved.filter(n => !lista.includes(n)),
            salesData: novasSales
        });
        console.log(`🔄 ${lista.length} número(s) liberado(s) e disponíveis novamente!`);
    };
    
    window.liberarTudo = async () => {
        const senhaConfirmacao = prompt("⚠️ ATENÇÃO! Digite a senha de administrador para resetar a rifa completamente:");
        if (senhaConfirmacao === ADMIN_PASSWORD) {
            await db.collection('rifas').doc(RIFA_CONFIG.RIFA_ID).set({ 
                soldNumbers: [], 
                reservedNumbers: [],
                salesData: {}
            });
            console.warn("💀 RIFA RESETADA COMPLETAMENTE!");
            console.log("🔄 Todos os números estão disponíveis novamente.");
        } else {
            console.log("❌ Senha incorreta! Operação cancelada.");
        }
    };
    
    window.sortear = () => {
        if(STATE.sold.length === 0) {
            console.error("❌ Nenhum número pago ainda! Não é possível sortear.");
            return;
        }
        const ganhador = STATE.sold[Math.floor(Math.random() * STATE.sold.length)];
        const infoGanhador = STATE.salesData[ganhador] || {};
        const valorArrecadado = STATE.sold.length * RIFA_CONFIG.PRICE_PER_NUMBER;
        console.log("%c🏆🏆🏆 SORTEIO REALIZADO! 🏆🏆🏆", "background:gold;color:#000;font-size:20px;padding:10px;border-radius:10px;font-weight:bold;");
        console.log(`%c🎉 NÚMERO SORTEADO: ${ganhador} 🎉`, "background:#FF6B35;color:#fff;font-size:24px;padding:8px;border-radius:8px;");
        if (infoGanhador.nome) {
            console.log(`👤 Ganhador: ${infoGanhador.nome}`);
            console.log(`📱 Contato: ${infoGanhador.telefone}`);
        }
        console.log(`💰 Total arrecadado: R$ ${valorArrecadado.toFixed(2)}`);
        console.log(`🏆 1º Prêmio: R$ 300,00`);
        console.log(`🏆 2º Prêmio: R$ 200,00`);
        console.log(`📅 Data do sorteio oficial: ${RIFA_CONFIG.SORTEIO_DATE}`);
    };
    
    window.vendidos = () => {
        if(STATE.sold.length === 0) {
            console.log("📭 Nenhum número vendido ainda.");
            return;
        }
        const sorted = [...STATE.sold].sort((a,b) => a-b);
        console.log(`✅ Números pagos (${sorted.length}):`);
        for (const num of sorted) {
            const info = STATE.salesData[num];
            if (info) {
                console.log(`   ${num} - ${info.nome} - R$ ${RIFA_CONFIG.PRICE_PER_NUMBER.toFixed(2)} (${info.data})`);
            } else {
                console.log(`   ${num} - R$ ${RIFA_CONFIG.PRICE_PER_NUMBER.toFixed(2)}`);
            }
        }
    };
    
    window.buscar = (numero) => {
        if(STATE.sold.includes(numero)) {
            const info = STATE.salesData[numero];
            console.log(`✅ Número ${numero}: PAGO (R$ ${RIFA_CONFIG.PRICE_PER_NUMBER.toFixed(2)})`);
            if (info) {
                console.log(`   👤 Comprador: ${info.nome}`);
                console.log(`   📱 Telefone: ${info.telefone}`);
                console.log(`   📅 Data: ${info.data}`);
            }
        } else if(STATE.reserved.includes(numero)) {
            console.log(`⏳ Número ${numero}: RESERVADO (aguardando pagamento)`);
        } else {
            console.log(`🟢 Número ${numero}: DISPONÍVEL para compra (R$ ${RIFA_CONFIG.PRICE_PER_NUMBER.toFixed(2)})`);
        }
    };
    
    window.ranking = () => {
        const buyerStats = {};
        for (const [numero, data] of Object.entries(STATE.salesData)) {
            const nome = data.nome;
            if (!buyerStats[nome]) {
                buyerStats[nome] = {
                    nome: nome,
                    quantidade: 0,
                    total: 0,
                    numeros: []
                };
            }
            buyerStats[nome].quantidade++;
            buyerStats[nome].numeros.push(parseInt(numero));
            buyerStats[nome].total = buyerStats[nome].quantidade * RIFA_CONFIG.PRICE_PER_NUMBER;
        }
        
        const rankingList = Object.values(buyerStats).sort((a, b) => b.quantidade - a.quantidade);
        
        console.log("%c🏆 RANKING DOS MAIORES APOIADORES 🏆", "background:#FF6B35;color:#fff;padding:6px 12px;border-radius:6px;");
        console.log(`💰 Valor por número: R$ ${RIFA_CONFIG.PRICE_PER_NUMBER.toFixed(2)}`);
        
        if (rankingList.length === 0) {
            console.log("📭 Nenhum comprador registrado ainda.");
            return;
        }
        
        rankingList.slice(0, 10).forEach((buyer, i) => {
            let medal = "";
            if (i === 0) medal = "👑 ";
            else if (i === 1) medal = "🥈 ";
            else if (i === 2) medal = "🥉 ";
            console.log(`${medal}${i+1}º - ${buyer.nome}: ${buyer.quantidade} números (R$ ${buyer.total.toFixed(2)}) - Nós: ${buyer.numeros.sort((a,b)=>a-b).join(', ')}`);
        });
    };
    
    window.topCompradores = window.ranking;
    
    window.sairAdmin = () => {
        isAdminLoggedIn = false;
        window.adminCommandsSetup = false;
        console.clear();
        console.log("%c🔓 Modo administrador encerrado", "background:#EF4444;color:#fff;padding:8px 15px;border-radius:8px;");
        console.log("Para reativar, clique em 'Acesso Admin' no rodapé da página.");
    };
    
    console.log("%c✅ Comandos admin carregados! Digite 'ajuda()' para ver todos.", "color:#10B981;font-weight:bold");
}

document.addEventListener('DOMContentLoaded', init);

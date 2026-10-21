// ========== CONFIGURAÇÕES DA RIFA 2026 ==========
const ADMIN_PASSWORD = "LOTS2026Admin";
let isAdminLoggedIn = false;

const RIFA_CONFIG = {
    START_NUMBER: 1,
    END_NUMBER: 350,
    PRICE_PER_NUMBER: 1.00,
    WHATSAPP_NUMBER: "553196581509",
    RIFA_ID: "lots-aerodesign-2026",
    SORTEIO_DATE: "26/10/2026"
};

// ... [Keep existing DOM, STATE, updateStats, updateRanking, init, render, toggle, updateUI functions] ...

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

function showAdminConsole() {
    console.clear();
    console.log("%c🔐 MODO ADMINISTRADOR ATIVADO", "background:#10B981;color:#fff;padding:12px 20px;border-radius:10px;font-size:16px;font-weight:bold");
    console.log("%c🚀 L.O.T.S. ADMIN 2026 - Sistema de Gestão", "background:#FF6B35;color:#fff;padding:10px 15px;border-radius:10px;font-size:14px;");
    console.log("%c💰 VALOR UNITÁRIO: R$ 1,00", "background:#0f2b5c;color:#FFD700;padding:5px 10px;border-radius:5px;font-weight:bold");
    console.log("%c📋 Comandos disponíveis:", "color:#0f2b5c;font-weight:bold;font-size:12px;");
    console.log("  • ajuda() - Mostrar todos os comandos");
    console.log("  • status() - Ver resumo da rifa");
    console.log("  • vender(n1, n2, ...) - Marcar números como pagos (com nome)");
    console.log("  • venderComNome(numero, nome, telefone) - Vender com dados completos");
    console.log("  • venderIntervalo(inicio, fim) - Vender intervalo");
    console.log("  • venderReservado(numero, nome, telefone) - Vender número RESERVADO diretamente");
    console.log("  • liberar(n1, n2, ...) - Liberar números");
    console.log("  • liberarTudo() - Resetar rifa (⚠️ cuidado!)");
    console.log("  • resetarDados() - Apagar TODOS os dados do Firebase");
    console.log("  • sortear() - Sortear ganhador");
    console.log("  • buscar(numero) - Verificar status de um número");
    console.log("  • vendidos() - Listar todos números pagos");
    console.log("  • ranking() - Ver ranking dos maiores compradores");
    console.log("  • topCompradores() - Ver top 10 compradores");
    console.log("  • reservados() - Listar todos números reservados");
    console.log("  • sairAdmin() - Sair do modo admin");
}

function setupAdminCommands() {
    // ... [Keep existing setupAdminCommands logic up to liberarTudo] ...

    // ========== RESETAR FIREBASE ==========
    window.resetarDados = async () => {
        const senhaConfirmacao = prompt("⚠️ PERIGO! Digite a senha admin para apagar TODOS os dados do Firebase:");
        if (senhaConfirmacao === ADMIN_PASSWORD) {
            await db.collection('rifas').doc(RIFA_CONFIG.RIFA_ID).set({ 
                soldNumbers: [], 
                reservedNumbers: [],
                salesData: {}
            });
            console.warn("🔥 DADOS DO FIREBASE RESETADOS COM SUCESSO!");
            STATE.sold = [];
            STATE.reserved = [];
            STATE.salesData = {};
            render();
            updateUI();
        } else {
            console.log("❌ Senha incorreta! Reset cancelado.");
        }
    };

    // ========== SORTEAR ==========
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
        console.log(`🏆 1º Prêmio: R$ 250,00`);
        console.log(`🏆 2º Prêmio: R$ 150,00`);
        console.log(`📅 Data do sorteio oficial: ${RIFA_CONFIG.SORTEIO_DATE}`);
    };

    // ... [Keep remaining helper admin commands] ...
}

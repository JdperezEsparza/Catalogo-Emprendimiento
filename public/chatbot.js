// chatbot.js - Chatbot IA con Google Gemini

// CONFIGURACIÓN - CAMBIA ESTO
const GEMINI_API_KEY = 'AIzaSyBpdIXc-kXdf-aj9MgqHVLF0L5Uj-aSbNI'; // Obtén en https://makersuite.google.com/app/apikey
const STORE_NAME = 'La boutique de gertrudis';
const WHATSAPP_NUMBER = '573115564583';

// Productos (cámbialos por los tuyos)
// Productos (se cargan automáticamente desde la API)
let products = [];

// Cargar productos desde la base de datos
async function loadProducts() {
    try {
        const response = await fetch('/api/products');
        const data = await response.json();
        products = data;
        console.log('✅ Productos cargados:', products.length);
    } catch (error) {
        console.error('❌ Error cargando productos:', error);
        // Si falla, usar productos de ejemplo
        products = [
            { name: 'Camiseta Básica', price: 45000, stock: 14 },
            { name: 'Jean Clásico', price: 120000, stock: 6 },
            { name: 'Vestido Elegante', price: 180000, stock: 2 }
        ];
    }
}

let isOpen = false;
let messages = [];

// Crear el HTML del chatbot
function createChatbotHTML() {
    const chatbotHTML = `
        <!-- Botón Flotante -->
        <button id="chatbot-button" class="chatbot-button">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="10" rx="2"></rect>
                <circle cx="12" cy="5" r="2"></circle>
                <path d="M12 7v4"></path>
                <line x1="8" y1="16" x2="8" y2="16"></line>
                <line x1="16" y1="16" x2="16" y2="16"></line>
            </svg>
        </button>

        <!-- Ventana del Chat -->
        <div id="chatbot-window" class="chatbot-window" style="display: none;">
            <div class="chatbot-header">
                <div class="chatbot-header-info">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="11" width="18" height="10" rx="2"></rect>
                        <circle cx="12" cy="5" r="2"></circle>
                        <path d="M12 7v4"></path>
                    </svg>
                    <div>
                        <h3>Asistente IA</h3>
                        <p>En línea</p>
                    </div>
                </div>
                <button id="chatbot-close">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>

            <div id="chatbot-messages" class="chatbot-messages"></div>

            <div class="chatbot-input-container">
                <input type="text" id="chatbot-input" placeholder="Escribe tu pregunta..." />
                <button id="chatbot-send">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="22" y1="2" x2="11" y2="13"></line>
                        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                    </svg>
                </button>
            </div>
            <p class="chatbot-footer">Powered by Google Gemini AI 🤖</p>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', chatbotHTML);
}

// Agregar mensaje al chat
function addMessage(role, content) {
    messages.push({ role, content });
    
    const messagesContainer = document.getElementById('chatbot-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `chatbot-message chatbot-message-${role}`;
    messageDiv.innerHTML = `<p>${content.replace(/\n/g, '<br>')}</p>`;
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Mostrar indicador de carga
function showLoading() {
    const messagesContainer = document.getElementById('chatbot-messages');
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'chatbot-message chatbot-message-assistant';
    loadingDiv.id = 'loading-indicator';
    loadingDiv.innerHTML = `
        <div class="chatbot-loading">
            <div></div><div></div><div></div>
        </div>
    `;
    messagesContainer.appendChild(loadingDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function hideLoading() {
    const loading = document.getElementById('loading-indicator');
    if (loading) loading.remove();
}

// Enviar mensaje a Gemini
// Enviar mensaje a Gemini
async function sendToGemini(userMessage) {
    try {
        const catalogInfo = products.map(p => 
            `- ${p.name}: $${p.price.toLocaleString('es-CO')} (Stock: ${p.stock})`
        ).join('\n');

        const systemPrompt = `Eres un asistente de ventas amigable de ${STORE_NAME}, una tienda de ropa online en Colombia.

CATÁLOGO ACTUAL:
${catalogInfo}

INFORMACIÓN IMPORTANTE:
- Envío GRATIS en compras superiores a $150.000
- Envío regular: $15.000
- Métodos de pago: Nequi, Bancolombia, Daviplata
- WhatsApp: ${WHATSAPP_NUMBER}

INSTRUCCIONES:
- Responde de forma amigable, breve y útil
- Usa emojis ocasionalmente
- Si preguntan por un producto no en el catálogo, diles que pueden preguntar por WhatsApp
- Sugiere productos relacionados cuando sea apropiado
- Si quieren comprar, diles que pueden hacerlo a través del carrito en la web o contactar por WhatsApp
- Mantén respuestas en menos de 150 palabras`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ 
                    parts: [{ text: `${systemPrompt}\n\nCliente: ${userMessage}` }] 
                }]
            })
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error('Error API:', errorData);
            throw new Error('Error en la API');
        }

        const data = await response.json();
        return data.candidates[0].content.parts[0].text;

    } catch (error) {
        console.error('Error completo:', error);
        return `Lo siento, tuve un problema técnico 😅\n\nPero puedes contactarnos directamente por WhatsApp: wa.me/${WHATSAPP_NUMBER}\n\n¡Estaremos encantados de ayudarte!`;
    }
}


// Manejar envío de mensaje
async function handleSend() {
    const input = document.getElementById('chatbot-input');
    const message = input.value.trim();
    
    if (!message) return;
    
    input.value = '';
    addMessage('user', message);
    showLoading();
    
    const response = await sendToGemini(message);
    hideLoading();
    addMessage('assistant', response);
}

// Inicializar chatbot
function initChatbot() {
    createChatbotHTML();
    
    const button = document.getElementById('chatbot-button');
    const window = document.getElementById('chatbot-window');
    const closeBtn = document.getElementById('chatbot-close');
    const sendBtn = document.getElementById('chatbot-send');
    const input = document.getElementById('chatbot-input');
    
    // Abrir/cerrar
    button.addEventListener('click', () => {
        isOpen = !isOpen;
        window.style.display = isOpen ? 'flex' : 'none';
        button.style.display = isOpen ? 'none' : 'flex';
        
        if (isOpen && messages.length === 0) {
            addMessage('assistant', `¡Hola! 👋 Soy el asistente virtual de ${STORE_NAME}.\n\n¿En qué puedo ayudarte hoy?\n\n• Ver productos disponibles\n• Información de envíos\n• Tallas y medidas\n• Hacer una pregunta`);
        }
    });
    
    closeBtn.addEventListener('click', () => {
        isOpen = false;
        window.style.display = 'none';
        button.style.display = 'flex';
    });
    
    // Enviar mensaje
    sendBtn.addEventListener('click', handleSend);
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSend();
    });
}

// Iniciar cuando cargue la página
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
        await loadProducts(); // Cargar productos primero
        initChatbot();       // Luego iniciar chatbot
    });
} else {
    (async () => {
        await loadProducts();
        initChatbot();
    })();
}
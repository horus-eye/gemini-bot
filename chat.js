   $(document).ready(function () {
    
       // Define el punto de conexión de la API del chat.
       const CHAT_ENDPOINT = 'https://bobby-chat-da63.onrender.com/chat';
       let currentlySpeakingIcon = null;
       
       /**
     * Agrega un mensaje al cuadro de chat, utilizando la nueva estructura HTML.
     * @param {string} text - El texto del mensaje.
     * @param {string} sender - El remitente del mensaje ('user' o 'bot').
       */
    function addMessage(text, sender) {
        const chatBox = $('#chat-box');
        let newMessage = '';
        
        // Utiliza un div temporal para escapar el texto y prevenir XSS
        const safeText = $('<div/>').text(text).html();
        
        if (sender === 'user') {
            newMessage = `<div class="message user-message">${safeText}</div>`;
        } else {
            newMessage = `
                <div class="message bot-message">
                <div class="message-buttons">
                <i class="fas fa-volume-up msg-btn speak-btn" title="Leer en voz alta"></i>
                <i class="fas fa-copy msg-btn copy-btn" title="Copiar texto"></i>
                </div>
                <pre><code>${safeText}</code></pre> 
                </div>`;
        }
        
        chatBox.append(newMessage);
        // Desplazamiento suave (smooth scroll) al final
        chatBox.animate({ scrollTop: chatBox[0].scrollHeight }, 500);
    }

    /**
     * Copia el texto y da feedback visual.
     * (La función copyToClipboard y speakText se mantienen idénticas ya que son robustas).
    */
    function copyToClipboard(text, icon) {
        navigator.clipboard.writeText(text).then(() => {
            icon.removeClass('fa-copy').addClass('fa-check text-success');
            setTimeout(() => icon.removeClass('fa-check text-success').addClass('fa-copy'), 1500);
        }, (err) => {
            console.error('Error al copiar texto: ', err);
        });
    }

    /**
     * Lee el texto en voz alta.
    */
    function speakText(text, iconElement) {
        window.speechSynthesis.cancel();
        if (currentlySpeakingIcon) {
            currentlySpeakingIcon.removeClass('fa-stop').addClass('fa-volume-up');
        }
        if (currentlySpeakingIcon && currentlySpeakingIcon[0] === iconElement[0]) {
            currentlySpeakingIcon = null;
            return;
        }
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'es-ES';
        currentlySpeakingIcon = iconElement;
        
        utterance.onstart = () => { currentlySpeakingIcon.removeClass('fa-volume-up').addClass('fa-stop'); };
        utterance.onend = () => { 
            currentlySpeakingIcon.removeClass('fa-stop').addClass('fa-volume-up');
            currentlySpeakingIcon = null;
        };
        utterance.onerror = () => { 
            currentlySpeakingIcon.removeClass('fa-stop').addClass('fa-volume-up');
            currentlySpeakingIcon = null;
        };
        window.speechSynthesis.speak(utterance);
    }

    /**
     * Envía el mensaje al servidor.
    */
    function sendMessage() {
        const userInput = $('#user-input');
        const sendButton = $('#send-button');
        const messageText = userInput.val().trim();
        
        if (messageText === "") return;
        
        // 1. Añade el mensaje del usuario y limpia el input/resetea el tamaño
        addMessage(messageText, 'user');
        //userInput.val('');
        userInput.css('height', '38px'); // Altura base
        
        // 2. Deshabilita el botón y muestra spinner
        sendButton.prop('disabled', true).html('<i class="fas fa-spinner fa-spin"></i>');
        
        $.ajax({
            url: CHAT_ENDPOINT,
            method: 'POST',
            contentType: 'application/json',
            // Asegúrate de enviar la clave 'entrada' o 'message' que espera tu backend
            data: JSON.stringify({ entrada: messageText, message: messageText }), 
            success: (data) => {
                // Asumiendo que el backend devuelve { respuesta: "..." }
                const botResponse = data.respuesta || data.response; 
                if (botResponse) {
                    addMessage(botResponse, 'bot');
                } else {
                    addMessage('Error: La respuesta del servidor está vacía o mal formada.', 'bot');
                }
            },
            error: (jqXHR) => {
                let errorMessage = 'Error de conexión: No se pudo contactar al servidor.';
                if (jqXHR.responseJSON && jqXHR.responseJSON.error) {
                    errorMessage = `Error: ${jqXHR.responseJSON.error}`;
                }
                addMessage(errorMessage, 'bot');
            },
            complete: () => {
                // 3. Vuelve a habilitar y restablece el icono
                sendButton.prop('disabled', false).html('<i class="fas fa-paper-plane"></i>');
                userInput.focus();
            }
        });
    }

    // Inicialización de Eventos
    $(document).ready(function () {
        const userInput = $('#user-input');
        const sendButton = $('#send-button');
        const themeToggle = $('#theme-toggle');
        
        // Manejo de la altura del TextArea y el estado del botón
        userInput.on('input', function () {
            // Altura automática (resetea y luego establece la altura del scroll)
            this.style.height = '38px'; // Altura mínima (una línea)
            this.style.height = (this.scrollHeight) + 'px';
            
            // Habilita/deshabilita el botón
            sendButton.prop('disabled', $(this).val().trim() === '');
        });
        
        // Envío del mensaje por click
        sendButton.click(sendMessage);
        
        // Envío del mensaje por Enter (sin Shift)
        userInput.keypress(function (e) {
            if (e.which === 13 && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
        
        // Toggle del tema (Dark Mode simple)
        themeToggle.click(function () {
            $('body , #chat-box, .chat-header, .chat-input-area').toggleClass('dark-mode');
            $(this).toggleClass('fa-moon fa-sun');
        });
        
        // Eventos delegados para los botones de mensajes del bot
        $('#chat-box').on('click', '.copy-btn', function () {
            const textToCopy = $(this).closest('.bot-message').find('code').text();
            copyToClipboard(textToCopy, $(this));
        });

        $('#chat-box').on('click', '.speak-btn', function () {
            const textToSpeak = $(this).closest('.bot-message').find('code').text();
            speakText(textToSpeak, $(this));
        });

        // Enfocar el input al cargar
        userInput.focus();
    })
});
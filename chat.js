// Define el punto de conexión de la API del chat para comunicarse con el servidor.
const CHAT_ENDPOINT = 'https://bobby-chat-da63.onrender.com/chat';
// Realiza un seguimiento del icono del altavoz en el que se está haciendo clic para la síntesis de voz.
let currentlySpeakingIcon = null;

/**
 * Agrega un mensaje al cuadro de chat.
 * @param {string} text - El texto del mensaje.
 * @param {string} sender - El remitente del mensaje ('user' o 'bot').
 */
function addMessage(text, sender) {
    const chatBox = $('#chat-box');
    let newMessage;

    if (sender === 'user') {
        // Crea un nuevo elemento de mensaje para el usuario.
        newMessage = `<div class="message user-message">${text}</div>`;
    } else {
        // Escapa el texto para evitar la representación de HTML.
        const escapedText = $('<div/>').text(text).html();
        // Crea un nuevo elemento de mensaje para el bot, incluidos los botones de control.
        newMessage = `
                    <div class="message bot-message">
                        <div class="message-buttons">
                            <i class="fas fa-volume-up msg-btn speak-btn" title="Leer en voz alta"></i>
                            <i class="fas fa-copy msg-btn copy-btn" title="Copiar texto"></i>
                        </div>
                        <pre><code>${escapedText}</code></pre>
                    </div>`;
    }

    chatBox.append(newMessage);
    // Se desplaza hasta la parte inferior del cuadro de chat para mostrar el último mensaje.
    chatBox.scrollTop(chatBox[0].scrollHeight);
}

/**
 * Copia el texto especificado en el portapapeles.
 * @param {string} text - El texto que se va a copiar.
 */
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => { }, (err) => {
        console.error('Error al copiar texto: ', err);
    });
}

/**
 * Lee el texto especificado en voz alta mediante la API de síntesis de voz.
 * @param {string} text - El texto que se va a leer.
 * @param {jQuery} iconElement - El elemento de icono en el que se hizo clic para iniciar la voz.
 */
function speakText(text, iconElement) {
    window.speechSynthesis.cancel(); // Detiene cualquier voz anterior.

    if (currentlySpeakingIcon) {
        // Restablece el icono de voz anterior.
        currentlySpeakingIcon.removeClass('fa-stop').addClass('fa-volume-up');
    }

    if (currentlySpeakingIcon && currentlySpeakingIcon[0] === iconElement[0]) {
        // Detiene la voz si se vuelve a hacer clic en el mismo icono.
        currentlySpeakingIcon = null;
        return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-ES';
    currentlySpeakingIcon = iconElement;

    utterance.onstart = () => {
        // Cambia el icono a un estado de "detención" cuando comienza la voz.
        currentlySpeakingIcon.removeClass('fa-volume-up').addClass('fa-stop');
    };
    utterance.onend = () => {
        // Restablece el icono cuando finaliza la voz.
        currentlySpeakingIcon.removeClass('fa-stop').addClass('fa-volume-up');
        currentlySpeakingIcon = null;
    };
    utterance.onerror = () => {
        // Restablece el icono si se produce un error.
        currentlySpeakingIcon.removeClass('fa-stop').addClass('fa-volume-up');
        currentlySpeakingIcon = null;
    };

    window.speechSynthesis.speak(utterance);
}

/**
 * Envía el mensaje del usuario al servidor y muestra la respuesta.
 */
function sendMessage() {
    const userInput = $('#user-input');
    const messageText = userInput.val().trim();

    if (messageText === "") return;

    addMessage(messageText, 'user');

    userInput.val('').css('height', 'auto').trigger('input');
    const sendButton = $('#send-button');
    sendButton.prop('disabled', true).html('<i class="fas fa-spinner fa-spin"></i>');

    $.ajax({
        url: CHAT_ENDPOINT,
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ message: messageText }),
        beforeSend: () => {
            // Muestra un control giratorio de carga en el botón de envío.
            sendButton.html('<i class="fas fa-spinner fa-spin"></i>');
        },
        success: (data) => {
            // Muestra la respuesta del bot o un mensaje de error.
            const botResponse = data.response;
            if (botResponse) {
                addMessage(botResponse, 'bot');
            } else {
                addMessage('Error: La respuesta del servidor está vacía o mal formada.', 'bot');
            }
        },
        error: (jqXHR) => {
            // Muestra un mensaje de error si la solicitud AJAX falla.
            let errorMessage = 'Error de conexión: No se pudo contactar al servidor.';
            if (jqXHR.responseJSON && jqXHR.responseJSON.error) {
                errorMessage = `Error: ${jqXHR.responseJSON.error}`;
            }
            addMessage(errorMessage, 'bot');
        },
        complete: () => {
            // Vuelve a habilitar el botón de envío y restablece el icono.
            sendButton.prop('disabled', false).html('<i class="fas fa-paper-plane"></i>');
            userInput.focus();
        }
    });
}

// Se ejecuta cuando el DOM está completamente cargado.
$(document).ready(function () {
    const userInput = $('#user-input');
    const sendButton = $('#send-button');

    // Deshabilita el botón de envío inicialmente.
    sendButton.prop('disabled', true);

    userInput.on('input', function () {
        // Cambia el tamaño del área de texto automáticamente para que se ajuste al contenido.
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';

        // Habilita o deshabilita el botón de envío en función de si el campo de entrada está vacío.
        if ($(this).val().trim() !== '') {
            sendButton.prop('disabled', false);
        } else {
            sendButton.prop('disabled', true);
        }
    });

    // Asigna la función sendMessage al evento de clic del botón de envío.
    sendButton.click(sendMessage);
    // Envía el mensaje cuando se presiona la tecla Intro.
    userInput.keypress(function (e) {
        if (e.which === 13 && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Cambia el tema entre el modo claro y el modo oscuro.
    $('#theme-toggle').click(function () {
        $('body').toggleClass('dark-mode');
        $(this).toggleClass('fa-moon fa-sun');
    });

    // Copia el texto del mensaje del bot en el portapapeles.
    $('#chat-box').on('click', '.copy-btn', function () {
        const textToCopy = $(this).closest('.bot-message').find('code').text();
        copyToClipboard(textToCopy);
        const icon = $(this);
        icon.removeClass('fa-copy').addClass('fa-check');
        setTimeout(() => icon.removeClass('fa-check').addClass('fa-copy'), 1500);
    });

    // Lee el mensaje del bot en voz alta.
    $('#chat-box').on('click', '.speak-btn', function () {
        const textToSpeak = $(this).closest('.bot-message').find('code').text();
        speakText(textToSpeak, $(this));
    });

    // Enfoca el campo de entrada del usuario cuando se carga la página.
    userInput.focus();
});

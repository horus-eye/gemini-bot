const CHAT_ENDPOINT = 'https://bobby-chat-da63.onrender.com/chat';
let currentlySpeakingIcon = null;

function addMessage(text, sender) {
    const chatBox = $('#chat-box');
    let newMessage;

    if (sender === 'user') {
        newMessage = `<div class="message user-message">${text}</div>`;
    } else {
        const escapedText = $('<div/>').text(text).html();
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
    chatBox.scrollTop(chatBox[0].scrollHeight);
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => { }, (err) => {
        console.error('Error al copiar texto: ', err);
    });
}

function speakText(text, iconElement) {
    window.speechSynthesis.cancel(); // Stop any previous speech

    if (currentlySpeakingIcon) {
        currentlySpeakingIcon.removeClass('fa-stop').addClass('fa-volume-up');
    }

    if (currentlySpeakingIcon && currentlySpeakingIcon[0] === iconElement[0]) {
        currentlySpeakingIcon = null;
        return; // Stop if the same icon is clicked again
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-ES';
    currentlySpeakingIcon = iconElement;

    utterance.onstart = () => {
        currentlySpeakingIcon.removeClass('fa-volume-up').addClass('fa-stop');
    };
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

function sendMessage() {
    const userInput = $('#user-input');
    const messageText = userInput.val().trim();

    if (messageText === "") return;

    addMessage(messageText, 'user');

    userInput.val('').css('height', 'auto').trigger('input');
    const sendButton = $('#send-button');
    sendButton.prop('disabled', true).html('<i class="fas fa-spinner fa-spin"></i>');

    $.ajax(/* ... tu código ajax ... */);
}

$(document).ready(function () {
    const userInput = $('#user-input');
    const sendButton = $('#send-button');

    // Disable send button initially
    sendButton.prop('disabled', true);

    userInput.on('input', function () {
        // Auto-resize textarea
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';

        // Enable/disable send button
        if ($(this).val().trim() !== '') {
            sendButton.prop('disabled', false);
        } else {
            sendButton.prop('disabled', true);
        }
    });

    sendButton.click(sendMessage);
    userInput.keypress(function (e) {
        if (e.which === 13 && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    $('#theme-toggle').click(function () {
        $('body').toggleClass('dark-mode');
        $(this).toggleClass('fa-moon fa-sun');
    });

    $('#chat-box').on('click', '.copy-btn', function () {
        const textToCopy = $(this).closest('.bot-message').find('code').text();
        copyToClipboard(textToCopy);
        const icon = $(this);
        icon.removeClass('fa-copy').addClass('fa-check');
        setTimeout(() => icon.removeClass('fa-check').addClass('fa-copy'), 1500);
    });

    $('#chat-box').on('click', '.speak-btn', function () {
        const textToSpeak = $(this).closest('.bot-message').find('code').text();
        speakText(textToSpeak, $(this));
    });

    userInput.focus();
});

function sendMessage() {
    const userInput = $('#user-input');
    const messageText = userInput.val().trim();

    if (messageText === "") return;

    addMessage(messageText, 'user');

    userInput.val('').css('height', 'auto').trigger('input');
    const sendButton = $('#send-button');
    sendButton.prop('disabled', true);

    $.ajax({
        url: CHAT_ENDPOINT,
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ message: messageText }),
        beforeSend: () => {
            sendButton.html('<i class="fas fa-spinner fa-spin"></i>');
        },
        success: (data) => {
            const botResponse = data.response;
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
            sendButton.prop('disabled', false).html('<i class="fas fa-paper-plane"></i>');
            userInput.focus();
        }
    });
}
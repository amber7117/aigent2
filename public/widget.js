
( function () {
    const projectId = document.currentScript.getAttribute( 'data-project-id' );

    // Widget state
    let isOpen = false;
    let sessionId = Math.random().toString( 36 ).substring( 2, 15 );

    // Create the chat widget container
    const chatWidget = document.createElement( 'div' );
    chatWidget.id = 'omnichat-widget';
    chatWidget.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 350px;
        height: 500px;
        border: none;
        border-radius: 12px;
        background: #fff;
        box-shadow: 0 8px 32px rgba(0,0,0,0.12);
        overflow: hidden;
        display: none;
        flex-direction: column;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        z-index: 10000;
        transition: all 0.3s ease;
    `;

    // Create the toggle button
    const toggleButton = document.createElement( 'div' );
    toggleButton.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        box-shadow: 0 4px 16px rgba(0,0,0,0.15);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10001;
        transition: all 0.3s ease;
    `;
    toggleButton.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
    `;

    // Create the header
    const header = document.createElement( 'div' );
    header.style.cssText = `
        padding: 16px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        display: flex;
        justify-content: space-between;
        align-items: center;
    `;

    const headerTitle = document.createElement( 'div' );
    headerTitle.innerHTML = `
        <div style="font-weight: 600; font-size: 16px;">Chat with us</div>
        <div style="font-size: 12px; opacity: 0.9;">We typically reply in a few minutes</div>
    `;

    const closeButton = document.createElement( 'div' );
    closeButton.style.cssText = `
        width: 24px;
        height: 24px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        transition: background 0.2s;
    `;
    closeButton.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
    `;
    closeButton.onmouseover = () => closeButton.style.background = 'rgba(255,255,255,0.1)';
    closeButton.onmouseout = () => closeButton.style.background = 'transparent';

    header.appendChild( headerTitle );
    header.appendChild( closeButton );

    // Create the messages container
    const messages = document.createElement( 'div' );
    messages.style.cssText = `
        flex: 1;
        padding: 16px;
        overflow-y: auto;
        background: #f8f9fa;
    `;

    // Create the input form
    const form = document.createElement( 'form' );
    form.style.cssText = `
        padding: 16px;
        border-top: 1px solid #e9ecef;
        background: white;
    `;

    const inputContainer = document.createElement( 'div' );
    inputContainer.style.cssText = `
        display: flex;
        gap: 8px;
        align-items: flex-end;
    `;

    const input = document.createElement( 'input' );
    input.type = 'text';
    input.placeholder = 'Type your message...';
    input.style.cssText = `
        flex: 1;
        border: 1px solid #dee2e6;
        border-radius: 20px;
        padding: 10px 16px;
        font-size: 14px;
        outline: none;
        transition: border-color 0.2s;
    `;
    input.onfocus = () => input.style.borderColor = '#667eea';
    input.onblur = () => input.style.borderColor = '#dee2e6';

    const sendButton = document.createElement( 'button' );
    sendButton.type = 'submit';
    sendButton.style.cssText = `
        width: 40px;
        height: 40px;
        border: none;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.2s;
    `;
    sendButton.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22,2 15,22 11,13 2,9"></polygon>
        </svg>
    `;
    sendButton.onmouseover = () => sendButton.style.transform = 'scale(1.05)';
    sendButton.onmouseout = () => sendButton.style.transform = 'scale(1)';

    inputContainer.appendChild( input );
    inputContainer.appendChild( sendButton );
    form.appendChild( inputContainer );

    // Typing indicator
    const typingIndicator = document.createElement( 'div' );
    typingIndicator.style.cssText = `
        display: none;
        padding: 8px 12px;
        margin: 8px 0;
        background: white;
        border-radius: 18px;
        max-width: 80%;
        align-self: flex-start;
        box-shadow: 0 1px 2px rgba(0,0,0,0.1);
    `;
    typingIndicator.innerHTML = `
        <div style="display: flex; gap: 4px; align-items: center;">
            <div style="font-size: 12px; color: #6c757d;">OmniChat is typing</div>
            <div style="display: flex; gap: 2px;">
                <div style="width: 4px; height: 4px; background: #6c757d; border-radius: 50%; animation: pulse 1.4s infinite 0s;"></div>
                <div style="width: 4px; height: 4px; background: #6c757d; border-radius: 50%; animation: pulse 1.4s infinite 0.2s;"></div>
                <div style="width: 4px; height: 4px; background: #6c757d; border-radius: 50%; animation: pulse 1.4s infinite 0.4s;"></div>
            </div>
        </div>
    `;

    // Add CSS animations
    const style = document.createElement( 'style' );
    style.textContent = `
        @keyframes pulse {
            0%, 60%, 100% { opacity: 0.3; }
            30% { opacity: 1; }
        }
    `;
    document.head.appendChild( style );

    // Append all parts to the widget
    chatWidget.appendChild( header );
    chatWidget.appendChild( messages );
    chatWidget.appendChild( form );

    // Add widgets to the body
    document.body.appendChild( chatWidget );
    document.body.appendChild( toggleButton );

    // Helper functions
    function addMessage( text, isUser = false ) {
        const messageEl = document.createElement( 'div' );
        messageEl.style.cssText = `
            display: flex;
            ${ isUser ? 'justify-content: flex-end;' : 'justify-content: flex-start;' }
            margin-bottom: 12px;
        `;

        const bubble = document.createElement( 'div' );
        bubble.style.cssText = `
            padding: 8px 12px;
            border-radius: 18px;
            max-width: 80%;
            word-wrap: break-word;
            font-size: 14px;
            line-height: 1.4;
            ${ isUser ?
                'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; margin-left: auto;' :
                'background: white; color: #333; box-shadow: 0 1px 2px rgba(0,0,0,0.1);'
            }
        `;
        bubble.textContent = text;
        messageEl.appendChild( bubble );

        messages.insertBefore( messageEl, typingIndicator );
        messages.scrollTop = messages.scrollHeight;
    }

    function showTypingIndicator() {
        typingIndicator.style.display = 'flex';
        messages.appendChild( typingIndicator );
        messages.scrollTop = messages.scrollHeight;
    }

    function hideTypingIndicator() {
        typingIndicator.style.display = 'none';
    }

    function sendMessageToOmniChat( message ) {
        // Send message to your OmniChat backend
        fetch( '/api/widget/message', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify( {
                message: message,
                sessionId: sessionId,
                projectId: projectId,
                timestamp: new Date().toISOString()
            } )
        } )
            .then( response => response.json() )
            .then( data => {
                hideTypingIndicator();
                if ( data.reply ) {
                    addMessage( data.reply );
                }
            } )
            .catch( error => {
                hideTypingIndicator();
                addMessage( 'Sorry, I\'m having trouble connecting right now. Please try again.' );
            } );
    }

    function toggleWidget() {
        isOpen = !isOpen;
        if ( isOpen ) {
            chatWidget.style.display = 'flex';
            toggleButton.style.display = 'none';
            input.focus();
        } else {
            chatWidget.style.display = 'none';
            toggleButton.style.display = 'flex';
        }
    }

    // Event listeners
    toggleButton.addEventListener( 'click', toggleWidget );
    closeButton.addEventListener( 'click', toggleWidget );

    form.addEventListener( 'submit', function ( e ) {
        e.preventDefault();
        const messageText = input.value.trim();
        if ( messageText ) {
            addMessage( messageText, true );
            input.value = '';

            // Show typing indicator and simulate response
            showTypingIndicator();
            sendMessageToOmniChat( messageText );
        }
    } );

    // Initialize with welcome message
    setTimeout( () => {
        addMessage( 'Hi! Welcome to OmniChat. How can I help you today?' );
    }, 1000 );

    // Add escape key listener to close widget
    document.addEventListener( 'keydown', function ( e ) {
        if ( e.key === 'Escape' && isOpen ) {
            toggleWidget();
        }
    } );

} )();

import makeWASocket, { DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import path from 'path';
import { FirestoreService } from './firestore-service';
import { randomUUID } from 'crypto';

// Define a simple in-memory store for sockets to avoid creating multiple instances
const Sockets: { [key: string]: any } = {};
const firestoreService = new FirestoreService();

async function connectToWhatsApp(sessionId = 'default', onQR: (qr: string) => void) {
  if (Sockets[sessionId]) {
    return Sockets[sessionId];
  }

  const { state, saveCreds } = await useMultiFileAuthState(path.join(process.cwd(), 'auth_info_baileys', sessionId));

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false, // We'll handle QR code generation ourselves
  });

  Sockets[sessionId] = sock;

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('QR received for session:', sessionId);
      onQR(qr);
    }

    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('connection closed for session', sessionId, 'due to', lastDisconnect?.error, ', reconnecting', shouldReconnect);
      delete Sockets[sessionId];
      if (shouldReconnect) {
        connectToWhatsApp(sessionId, onQR);
      }
    } else if (connection === 'open') {
      console.log('opened connection for session:', sessionId);
    }
  });

  sock.ev.on('messages.upsert', async (m) => {
    console.log(JSON.stringify(m, undefined, 2));

    try {
      for (const msg of m.messages) {
        if (msg.key.fromMe) continue; // Skip messages sent by us

        const contactId = msg.key.remoteJid || '';
        const messageId = msg.key.id || randomUUID();
        const timestamp = new Date().toISOString();

        // Find or create channel
        let channelId = `whatsapp-${sessionId}`;
        try {
          const channels = await firestoreService.getAllChannels();
          const existingChannel = channels.find(c => c.id === channelId);

          if (!existingChannel) {
            await firestoreService.saveChannel({
              id: channelId,
              name: `WhatsApp - ${sessionId}`,
              type: 'WhatsApp',
              status: 'online',
              lastActivity: timestamp,
              autoReply: false,
              description: 'WhatsApp messaging channel',
              sessionId: sessionId
            });
          }
        } catch (error) {
          console.error('Error managing WhatsApp channel:', error);
        }        // Find or create conversation
        let conversationId = `whatsapp-${contactId}`;
        try {
          const conversations = await firestoreService.getConversations();
          const existingConversation = conversations.find((c: any) => c.id === conversationId);

          if (!existingConversation) {
            await firestoreService.saveConversation({
              id: conversationId,
              channelId: channelId,
              customerName: msg.pushName || contactId,
              customerPhone: contactId.replace('@s.whatsapp.net', ''),
              customerAvatar: '',
              status: 'active',
              tags: [],
              createdAt: timestamp,
              lastMessageAt: timestamp,
              updatedAt: timestamp
            });
          }
        } catch (error) {
          console.error('Error managing WhatsApp conversation:', error);
        }        // Save message
        const messageContent = msg.message?.conversation ||
          msg.message?.extendedTextMessage?.text ||
          '[Media Message]';

        try {
          await firestoreService.saveMessage({
            id: messageId,
            conversationId: conversationId,
            channelId: channelId,
            from: 'customer',
            to: channelId,
            fromUser: msg.pushName || contactId,
            text: messageContent,
            timestamp: timestamp,
            messageType: 'text',
            read: false,
            createdAt: timestamp
          });

          console.log(`WhatsApp message saved: ${messageId}`);
        } catch (error) {
          console.error('Error saving WhatsApp message:', error);
        }
      }
    } catch (error) {
      console.error('Error processing WhatsApp messages:', error);
    }
  });

  sock.ev.on('creds.update', saveCreds);

  return sock;
}

export default connectToWhatsApp;
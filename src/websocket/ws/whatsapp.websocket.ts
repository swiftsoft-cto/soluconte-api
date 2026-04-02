import { WebSocketServer, WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import url from 'url';

// Mapa para armazenar as conexões ativas por usuário
const userConnections = new Map<string, Set<WebSocket>>();

export function createWhatsAppWSS() {
  const whatsappWSS = new WebSocketServer({ noServer: true });

  whatsappWSS.on('connection', async (ws, req) => {
    const { query } = url.parse(req.url || '', true);
    const token = query.token as string;
    
    try {
      if (!token) throw new Error('Token ausente');
      
      const tokenValue = token.startsWith('Bearer ') ? token.slice(7) : token;
      const decoded = jwt.verify(tokenValue, process.env.JWT_SECRET) as {
        sub: string;
      };
      
      const userId = decoded.sub;
      if (!userId) {
        throw new Error('Token inválido: ID do usuário não encontrado');
      }

      // Adiciona conexão do usuário
      if (!userConnections.has(userId)) {
        userConnections.set(userId, new Set());
      }
      userConnections.get(userId)?.add(ws);

      // Envia status inicial quando conecta (apenas conexão do WebSocket, não do WhatsApp)
      ws.send(JSON.stringify({ 
        type: 'ws_connected',
        message: 'Conectado ao serviço de WhatsApp WebSocket'
      }));

      ws.on('close', () => {
        userConnections.get(userId)?.delete(ws);
        if (userConnections.get(userId)?.size === 0) {
          userConnections.delete(userId);
        }
      });

      ws.on('error', () => {
        // Erro silencioso
      });
    } catch (err: any) {
      ws.close();
    }
  });

  return whatsappWSS;
}

/**
 * Envia QR code para todos os usuários conectados (ou usuário específico)
 */
export function sendQrCodeToUsers(
  qrCode: string,
  userId?: string,
  deviceId?: string,
) {
  const payload = JSON.stringify({
    type: 'qr_code',
    qrCode: qrCode,
    deviceId: deviceId ?? null,
    timestamp: new Date().toISOString(),
  });

  if (userId) {
    // Envia apenas para o usuário específico
    const userWs = userConnections.get(userId);
    if (userWs) {
      userWs.forEach((ws) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(payload);
        }
      });
    }
  } else {
    // Envia para todos os usuários conectados
    userConnections.forEach((connections) => {
      connections.forEach((ws) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(payload);
        }
      });
    });
  }
}

/**
 * Envia status do WhatsApp para todos os usuários conectados (ou usuário específico)
 */
export function sendStatusToUsers(
  status: {
    isReady: boolean;
    needsQrCode: boolean;
    qrCode?: string | null;
  },
  userId?: string,
  deviceId?: string,
) {
  const payload = JSON.stringify({
    type: 'status',
    status: status,
    deviceId: deviceId ?? null,
    timestamp: new Date().toISOString(),
  });

  if (userId) {
    // Envia apenas para o usuário específico
    const userWs = userConnections.get(userId);
    if (userWs) {
      userWs.forEach((ws) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(payload);
        }
      });
    }
  } else {
    // Envia para todos os usuários conectados
    userConnections.forEach((connections) => {
      connections.forEach((ws) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(payload);
        }
      });
    });
  }
}

/**
 * Envia notificação de conexão bem-sucedida para todos os usuários conectados
 */
export function sendConnectedToUsers() {
  const payload = JSON.stringify({
    type: 'connected',
    message: 'WhatsApp conectado com sucesso!',
    timestamp: new Date().toISOString(),
  });

  userConnections.forEach((connections) => {
    connections.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    });
  });
}

/**
 * Envia notificação de desconexão para todos os usuários conectados
 */
export function sendDisconnectionToUsers(reason: string) {
  const payload = JSON.stringify({
    type: 'disconnected',
    reason: reason,
    timestamp: new Date().toISOString(),
  });

  userConnections.forEach((connections) => {
    connections.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    });
  });
}

export type WhatsAppChatMessageWsPayload = {
  type: 'whatsapp_chat_message';
  threadId: string;
  message: {
    id: string;
    threadId: string;
    direction: string;
    body: string;
    waMessageId: string | null;
    createdAt: string;
  };
  threadPreview: {
    lastMessageAt: string | null;
    unreadCount: number;
  };
  timestamp: string;
};

/**
 * Nova mensagem em thread (inbound ou outbound) — atualiza UI em tempo real sem polling.
 */
export function broadcastWhatsAppChatMessage(
  data: Omit<WhatsAppChatMessageWsPayload, 'type' | 'timestamp'>,
): void {
  const payload: WhatsAppChatMessageWsPayload = {
    type: 'whatsapp_chat_message',
    ...data,
    timestamp: new Date().toISOString(),
  };
  const json = JSON.stringify(payload);
  userConnections.forEach((connections) => {
    connections.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(json);
      }
    });
  });
}


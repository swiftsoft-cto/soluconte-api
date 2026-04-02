import { WebSocketServer, WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import url from 'url';
import { NotificationsService } from '../../modules/notifications/notifications.service';
import { NotificationStatus } from '../../modules/notifications/entities/notification.entity';
import { Notification } from '../../modules/notifications/entities/notification.entity';
import { User } from '../../modules/users/entities/user.entity';

// Mapa para armazenar as conexões ativas por usuário
const userConnections = new Map<string, Set<WebSocket>>();

export function createNotificationsWSS(dataSource) {
  const notificationsWSS = new WebSocketServer({ noServer: true });

  notificationsWSS.on('connection', async (ws, req) => {
    const { query } = url.parse(req.url || '', true);
    const token = query.token as string;
    try {
      if (!token) throw new Error('Token ausente');
      const tokenValue = token.startsWith('Bearer ') ? token.slice(7) : token;
      const decoded = jwt.verify(tokenValue, process.env.JWT_SECRET) as {
        sub: string;
      };
      const userId = decoded.sub;
      if (!userId)
        throw new Error('Token inválido: ID do usuário não encontrado');
      if (!userConnections.has(userId)) userConnections.set(userId, new Set());
      userConnections.get(userId)?.add(ws);
      const notificationsService = new NotificationsService(
        dataSource.getRepository(Notification),
        dataSource.getRepository(User),
      );
      const notifications = await notificationsService.findAll({
        userId,
        status: NotificationStatus.PENDING,
      });
      if (notifications.data.length > 0) {
        ws.send(
          JSON.stringify({ type: 'notifications', data: notifications.data }),
        );
      }
      ws.on('close', () => {
        userConnections.get(userId)?.delete(ws);
        if (userConnections.get(userId)?.size === 0)
          userConnections.delete(userId);
        // Desconexão silenciosa
      });
    } catch (err) {
      // Token inválido - tratamento silencioso
      ws.close();
    }
  });
  return notificationsWSS;
}

// Função para enviar notificação para um usuário específico
export function sendNotificationToUser(userId: string, notification: any) {
  const userWs = userConnections.get(userId);
  if (userWs) {
    const payload = JSON.stringify({
      type: 'notification',
      data: notification,
    });

    userWs.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    });
  }
}

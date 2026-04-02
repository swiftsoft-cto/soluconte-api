import http from 'http';
import url from 'url';
import { createNotificationsWSS } from './ws/notifications.websocket';
import { createWhatsAppWSS } from './ws/whatsapp.websocket';

export function attachWebSocketRouter(server: http.Server, dataSource) {
  const notificationsWSS = createNotificationsWSS(dataSource);
  const whatsappWSS = createWhatsAppWSS();
  
  server.on('upgrade', (req, socket, head) => {
    const pathname = url.parse(req.url || '').pathname;

    switch (pathname) {
      case '/notifications':
        notificationsWSS.handleUpgrade(req, socket, head, (ws) => {
          notificationsWSS.emit('connection', ws, req);
        });
        break;
      case '/whatsapp':
        whatsappWSS.handleUpgrade(req, socket, head, (ws) => {
          whatsappWSS.emit('connection', ws, req);
        });
        break;
      default:
        socket.destroy();
    }
  });
}

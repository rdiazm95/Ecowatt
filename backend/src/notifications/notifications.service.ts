import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import * as serviceAccount from '../../firebase-service-account.json';

@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsService.name);

  onModuleInit() {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
      });
      this.logger.log('Firebase Admin inicializado ✅');
    }
  }

  async sendPushNotification(
    expoPushToken: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ) {
    try {
      await admin.messaging().send({
        token: expoPushToken,
        notification: { title, body },
        data: data ?? {},
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            color: '#01696f',
          },
        },
      });
      this.logger.log(`Notificación enviada a ${expoPushToken}`);
    } catch (error) {
      this.logger.error('Error enviando notificación:', error);
    }
  }

  // Alerta específica de franja verde
  async sendFranjaVerdeAlert(expoPushToken: string, precio: number) {
    await this.sendPushNotification(
      expoPushToken,
      '🟢 ¡Franja Verde! Precio bajo ahora',
      `El precio actual es ${precio.toFixed(4)} €/kWh. ¡Buen momento para encender electrodomésticos!`,
      { tipo: 'franja_verde', precio: precio.toString() },
    );
  }
}
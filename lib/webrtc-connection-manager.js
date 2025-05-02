import { ConnectionManager } from './connection-manager.js';
import { WebRtcConnection } from './webrtc-connection.js';

export class WebRtcConnectionManager extends ConnectionManager {
  constructor(options = {}) {
    super({
      Connection: WebRtcConnection,
      ...options,
    });
  }

  async createConnection(connectionOptions = {}) {
    const connection = super.createConnection(connectionOptions);
    await connection.doOffer();
    return connection;
  }
}

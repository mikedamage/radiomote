import { ConnectionManager } from './connection-manager.js';
import { WebRtcConnection } from './webrtc-connection.js';

export class WebRtcConnectionManager extends ConnectionManager {
  static create(connectionOptions) {
    return new WebRtcConnectionManager({
      Connection(id) {
        return new WebRtcConnection(id, connectionOptions);
      },
    });
  }

  constructor(options = {}) {
    super({
      Connection: WebRtcConnection,
      ...options,
    });
  }

  async createConnection() {
    const connection = super.createConnection();
    await connection.doOffer();
    return connection;
  }
}

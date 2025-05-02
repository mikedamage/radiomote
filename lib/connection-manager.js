import { nanoid } from 'nanoid';
import { Connection as DefaultConnection } from './connection.js';

export class ConnectionManager {
  constructor(options = {}) {
    options = {
      Connection: DefaultConnection,
      generateId: nanoid,
      ...options,
    };

    this.connections = new Map();
    this.closedListeners = new Map();

    Object.defineProperties(this, {
      connections: {
        writable: false,
        enumerable: false,
      },
      closedListeners: {
        writable: false,
        enumerable: false,
      },
    });
  }

  createId() {
    const { generateId } = this.options;

    do {
      const id = generateId();
      if (!this.connections.has(id)) return id;
    } while (true);
  }

  deleteConnection(connection) {
    const closedListener = this.closedListeners.get(connection);
    this.closedListeners.delete(connection);
    connection.removeListener('closed', closedListener);
    this.connections.delete(connection.id);
  }

  createConnection() {
    const { Connection } = this.options;
    const id = this.createId();
    const connection = new Connection(id);
    const closedListener = () => this.deleteConnection(connection);
    this.closedListeners.set(connection, closedListener);
    connection.once('closed', closedListener);
    this.connections.set(connection.id, connection);
    return connection;
  }

  getConnection(id) {
    return this.connections.get(id) || null;
  }

  getConnections() {
    return [...this.connections.values()];
  }

  toJSON() {
    return this.getConnections().map((conn) => conn.toJSON());
  }
}

export default ConnectionManager;

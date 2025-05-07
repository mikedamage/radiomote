import { logger } from './logger.js';

export function setupIntercom(peerConnection) {
  const pttDataChannel = peerConnection.createDataChannel('ptt-data-channel');

  function onMessage({ data }) {
    logger.info('pttDataChannel received message', { data });
    pttDataChannel.send('ACK');
  }

  function onConnectionStateChange() {
    switch (peerConnection.connectionState) {
      case 'disconnected':
      case 'failed':
      case 'closed':
        logger.info('Received connection close event');
        pttDataChannel.removeEventListener('message', onMessage);
        pttDataChannel.close();
        break;
    }
  }

  peerConnection.addEventListener('message', onMessage);
  peerConnection.addEventListener('connectionstatechange', onConnectionStateChange);
}

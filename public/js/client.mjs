import { ConnectionClient } from './connection-client.mjs';

const $ = (sel) => document.querySelector(sel);

const ptt = $('#ptt');
const outputVolume = $('#vol-speaker');
const inputVolume = $('#vol-mic');
const disconnectButton = $('#disconnect');

const connectionClient = new ConnectionClient();

const setupPTT = (dataChannel) => {
  ptt.addEventListener(
    'mousedown',
    (evt) => {
      evt.preventDefault();
      console.debug('PTT pressed');
      dataChannel.send('#PTT 1');
    },
    false,
  );

  ptt.addEventListener(
    'mouseup',
    (evt) => {
      evt.preventDefault();
      console.debug('PTT released');
      dataChannel.send('#PTT 0');
    },
    false,
  );
};

const setupRtcConnection = async () => {
  const connection = await connectionClient.createConnection({
    beforeAnswer(peerConnection) {
      console.debug('create rtc peer connection: %O', peerConnection);

      const closeDataChannel = (channel) => {
        if (!channel) return;
        channel.removeEventListener('message', onMessage);
        channel.close();
      };

      const onMessage = ({ data }) => {
        console.debug('Receive data channel message: %O', data);
      };

      const onDataChannel = ({ channel }) => {
        channel.addEventListener('message', onMessage);
        setupPTT(channel);

        peerConnection.addEventListener('connectionstatechange', () => {
          switch (peerConnection.connectionState) {
            case 'disconnected':
            case 'failed':
            case 'closed':
              console.log('received data channel close event');
              closeDataChannel(channel);
              break;
          }
        });
      };

      peerConnection.addEventListener('datachannel', onDataChannel, false);
    },
  });

  window.connection = connection;
};

outputVolume.addEventListener(
  'change',
  () => {
    const value = outputVolume.value;
    console.debug('outputVolume changed to %d', value);
  },
  false,
);

inputVolume.addEventListener(
  'change',
  () => {
    const value = inputVolume.value;
    console.debug('inputVolume changed to %d', value);
  },
  false,
);

disconnectButton.addEventListener(
  'click',
  async (evt) => {
    console.debug('disconnect button clicked');
  },
  false,
);

setupRtcConnection();

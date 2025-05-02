import wrtc from '@roamhq/wrtc';
import { Connection } from './connection.js';
import { descriptionToJSON, waitUntilIceGatheringStateComplete } from './connection-helpers.js';

const { RTCPeerConnection: DefaultRTCPeerConnection } = wrtc;
const TIME_TO_CONNECTED = 10_000;
const TIME_TO_HOST_CANDIDATES = 2_000;
const TIME_TO_RECONNECTED = 10_000;

export class WebRtcConnection extends Connection {
  constructor(id, options = {}) {
    super(id);

    this.options = {
      RTCPeerConnection: DefaultRTCPeerConnection,
      beforeOffer() {},
      timeToConnected: TIME_TO_CONNECTED,
      timeToHostCandidates: TIME_TO_HOST_CANDIDATES,
      timeToReconnected: TIME_TO_RECONNECTED,
      ...options,
    };

    this._setup();
  }

  setup() {
    const { RTCPeerConnection, beforeOffer, timeToConnected, timeToReconnected } = this.options;

    this.peerConnection = new RTCPeerConnection({
      sdpSemantics: 'unified-plan',
    });

    beforeOffer(this.peerConnection);

    this.connectionTimer = setTimeout(() => {
      if (!['connected', 'completed'].includes(this.peerConnection.iceConnectionState)) {
        this.close();
      }
    }, timeToConnected);

    this.reconnectionTimer = null;

    const onIceConnectionStateChange = () => {
      if (['connected', 'completed'].includes(this.peerConnection.iceConnectionState)) {
        if (this.connectionTimer) {
          clearTimeout(this.connectionTimer);
          this.connectionTimer = null;
        }
        clearTimeout(this.reconnectionTimer);
        this.reconnectionTimer = null;
      } else if (['disconnected', 'failed'].includes(this.peerConnection.iceConnectionState)) {
        if (!this.connectionTimer && !this.reconnectionTimer) {
          this.reconnectionTimer = setTimeout(() => {
            this.close();
          }, timeToReconnected);
        }
      }
    };

    Object.defineProperty(this, '_onIceConnectionStateChange', {
      configurable: false,
      writable: false,
      enumerable: false,
      value: onIceConnectionStateChange,
    });

    this.peerConnection.addEventListener('iceconnectionstatechange', this._onIceConnectionStateChange);
  }

  async doOffer() {
    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);

    try {
      await waitUntilIceGatheringStateComplete(this.peerConnection, this.options);
    } catch (error) {
      this.close();
      throw error;
    }
  }

  async applyAnswer(answer) {
    await this.peerConnection.setRemoteDescription(answer);
  }

  close() {
    this.peerConnection.removeEventListener('iceconnectionstatechange', this._onIceConnectionStateChange);

    if (this.connectionTimer) {
      clearTimeout(this.connectionTimer);
      this.connectionTimer = null;
    }

    if (this.reconnectionTimer) {
      clearTimeout(this.reconnectionTimer);
      this.reconnectionTimer = null;
    }

    this.peerConnection.close();
    super.close();
  }

  toJSON() {
    return {
      ...super.toJSON(),
      iceConnectionState: this.iceConnectionState,
      localDescription: this.localDescription,
      remoteDescription: this.remoteDescription,
      signalingState: this.signalingState,
    };
  }

  get iceConnectionState() {
    return thid.peerConnection.iceConnectionState;
  }

  get localDescription() {
    return descriptionToJSON(this.peerConnection.localDescription, true);
  }

  get remoteDescription() {
    return descriptionToJSON(this.peerConnection.remoteDescription);
  }

  get signalingState() {
    return this.peerConnection.signalingState;
  }
}

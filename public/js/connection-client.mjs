const TIME_TO_HOST_CANDIDATES = 2_000;

export class ConnectionClient {
  constructor(options = {}) {
    this.options = {
      host: '',
      timeToHostCandidates: TIME_TO_HOST_CANDIDATES,
      ...options,
    };
  }

  async createConnection(connectionOptions = {}) {
    connectionOptions = {
      beforeAnswer() {},
      ...options,
    };

    const creationResponse = await fetch(`${this.options.host}/connections`, {
      method: 'POST',
    });
    const remotePeerConnection = await creationResponse.json();
    const { id } = remotePeerConnection;

    const localPeerConnection = new RTCPeerConnection({
      sdpSemantics: 'unified-plan',
    });

    localPeerConnection.addEventListener(
      'connectionstatechange',
      () => {
        if (localPeerConnection.connectionState !== 'closed') return;

        try {
          fetch(`${host}/connections/${id}`, { method: 'DELETE' });
        } catch (err) {
          console.warn('error deleting closed peer connection: %O', err);
        }
      },
      false,
    );

    try {
      await localPeerConnection.setRemoteDescription(remotePeerConnection.localDescription);
      await beforeAnswer(localPeerConnection);

      const answer = await localPeerConnection.createAnswer();
      await localPeerConnection.setLocalDescription(answer);

      await fetch(`${host}/connections/${id}/remote-description`, {
        method: 'POST',
        body: JSON.stringify(localPeerConnection.localDescription),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      return localPeerConnection;
    } catch (err) {
      localPeerConnection.close();
      throw error;
    }
  }
}

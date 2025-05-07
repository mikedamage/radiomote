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
      ...connectionOptions,
    };

    const creationResponse = await fetch(`${this.options.host}/connections`, {
      method: 'POST',
    });
    const remotePeerConnection = await creationResponse.json();
    const { id } = remotePeerConnection;

    const localPeerConnection = new RTCPeerConnection({
      sdpSemantics: 'unified-plan',
    });

    localPeerConnection.addEventListener('connectionstatechange', () => {
      if (localPeerConnection.connectionState !== 'closed') return;

      try {
        fetch(`/connections/${id}`, { method: 'DELETE' });
      } catch (err) {
        console.warn('error deleting closed peer connection: %O', err);
      }
    });

    try {
      await localPeerConnection.setRemoteDescription(remotePeerConnection.localDescription);
      await connectionOptions.beforeAnswer(localPeerConnection);

      const answer = await localPeerConnection.createAnswer();
      await localPeerConnection.setLocalDescription(answer);

      await fetch(`/connections/${id}/remote-description`, {
        method: 'PATCH',
        body: JSON.stringify(localPeerConnection.localDescription),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      return localPeerConnection;
    } catch (err) {
      localPeerConnection.close();
      throw err;
    }
  }
}

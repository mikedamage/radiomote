export const descriptionToJSON = (description, shouldDisableTrickleIce) =>
  !description
    ? {}
    : {
        type: description.type,
        sdp: shouldDisableTrickleIce ? disableTrickleIce(description.sdp) : description.sdp,
      };

export const disableTrickleIce = (sdp) => sdp.replace(/\r\na=ice-options:trickle/g, '');

export const waitUntilIceGatheringStateComplete = async (peerConnection, options) => {
  if (peerConnection.iceGatheringState === 'complete') return;

  const { timeToHostCandidates } = options;

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      peerConnection.removeEventListener('icecandidate', onIceCandidate);
      reject(new Error('timed out waiting for host candidates'));
    }, timeToHostCandidates);

    function onIceCandidate({ candidate }) {
      if (!candidate) {
        clearTimeout(timeout);
        peerConnection.removeEventListener('icecandidate', onIceCandidate);
        resolve();
      }
    }

    peerConnection.addEventListener('icecandidate', onIceCandidate);
  });
};

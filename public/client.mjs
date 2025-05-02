const $ = document.querySelector;
// const $$ = document.querySelectorAll;

const ptt = $('#ptt');
const outputVolume = $('#vol-speaker');
const inputVolume = $('#vol-mic');

ptt.addEventListener('mousedown', (evt) => {
  evt.preventDefault();
  console.debug('PTT pressed')
}, false);

ptt.addEventListener('mouseup', (evt) => {
  evt.preventDefault();
  console.debug('PTT released');
}, false);

outputVolume.addEventListener('change', () => {
  const value = outputVolume.value;
  console.debug('outputVolume changed to %d', value);
}, false);

inputVolume.addEventListener('change', () => {
  const value = inputVolume.value;
  console.debug('inputVolume changed to %d', value);
}, false);

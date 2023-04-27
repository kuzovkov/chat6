(function(){
  function makeid(length) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
      counter += 1;
    }
    return result;
  }

  const goToRoom = function() {
    const roomInput = document.querySelector('input[id="room"]');
    const room = (roomInput.value)? roomInput.value.trim() : makeid(16);
    window.location.href = `/room/${room}`;
  }

  document.getElementById('start-call').addEventListener('click', goToRoom);
})();


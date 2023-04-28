class App {
    sendBtn = null;
    chatArea = null;
    messageArea = null;
    socket = null;
    media = null;
    video = null;
    stream = null;
    screenStream = null;
    socket_id = null; //current user name
    ice = null;
    wrtc = null;
    remoteVideos = {};
    users = [];
    appear_users = [];
    disappear_users = [];
    video_off = false;
    audio_off = false;
    files = null;
    filesp2p = null;
    p2p_chat = true; //user p2p for chat message
    aliases = {}; //username aliases
    chatMessages = []; //list chat messages;

    constructor(){
        this.sendBtn = document.getElementById('send');
        this.chatArea = document.getElementById('chat-area');
        this.screenShareBtn = document.getElementById('screenshare');
        this.videoToggleBtn = document.getElementById('videotoggle');
        this.audioToggleBtn = document.getElementById('audiotoggle');
        this.sendFileBtn = document.getElementById('sendfile');
        this.fileInput = document.getElementById('file-input');
        this.screenShareBtn.addEventListener('click', this.screenShare.bind(this));
        this.videoToggleBtn.addEventListener('click', this.toggleVideo.bind(this));
        this.audioToggleBtn.addEventListener('click', this.toggleAudio.bind(this));
        this.sendFileBtn.addEventListener('click', this.sendFiles.bind(this));
        this.fileInput.addEventListener('change', this.onFilesSelected.bind(this));
        this.messageArea = document.getElementById('message-area');
        this.sendBtn.addEventListener('click', this.sendChatMessage.bind(this));
        this.exitBtn = document.getElementById('exit');
        this.exitBtn.addEventListener('click', this.exit.bind(this));
        this.aliasInput =  document.getElementById('alias');
        this.aliasInput.value = this.alias;
        this.aliasInput.addEventListener('change', this.onChangeAlias.bind(this));
        this.wrtc = new WRTC(this);
        this.filesp2p = Fp2p;
        this.filesp2p.init(this);
        this.socket = new Socket((ws) => {
            this.socket_id = ws.id;
            console.log('socket_id:', this.socket_id);
            this.socket.setHandler('users', this.updateUsersList.bind(this));
            this.socket.setHandler('message', this.receiveChatMessage.bind(this));
            this.socket.setHandler('wrtc_message', this.wrtc.gotMessage.bind(this.wrtc));
            this.socket.setHandler('aliases', this.onGotAliases.bind(this));
            this.socket.send('alias', {'alias': this.alias, socket_id: this.socket_id});

        }, () =>{
            console.log('disconnect')
        });
        this.getLocalMedia();
        window.addEventListener('keypress', (ev) => {
            if (ev.keyCode === 13){
                this.sendChatMessage();
            }
        });
    }

    async getLocalMedia(){
        this.media = new Media();
        const constraints = await this.media.getConstraints();
        console.log('constraints:', constraints)
        const devices = await this.media.getDevices();
        console.log('devices:', devices);
        this.stream = await this.media.getMediaStream();
        console.log('stream:', this.stream);
        // for debug
        for (let i = 0; i < 1; i++)
        if (this.stream){
            this.video = new Video({selector: 'div.video-container'});
            this.video.show();
            this.video.attachStream(this.stream);
            this.video.setTitle(this.alias);
        }
        this.wrtcConnect(this.stream);
    }

    async screenShare(){
        console.log('screenshare');
        this.screenStream = await this.media.getScreenStream(this.onStopScreenShare.bind(this));
        console.log('screenStream:', this.screenStream);
        if (this.screenStream){
            this.video.attachStream(this.screenStream);
            this.wrtc.onGettingScreenSteam(this.screenStream);
            this.diplay(this.screenShareBtn, false);
        }
    }

    async onStopScreenShare(){
        if (this.stream){
            this.video.attachStream(this.stream);
        } else {
            this.stream = await this.media.getMediaStream();
            if (this.stream){
                this.video.attachStream(this.stream);
            } else {
                console.log('error onStopScreenShare');
            }
        }
        this.wrtc.onScreenShareEnded();
        this.diplay(this.screenShareBtn, true);
    }

    sendChatMessage() {
        console.log(this.messageArea.value);
        if (this.messageArea.value.length){
          if (this.p2p_chat){
            this.wrtc.sendChatMessage(this.messageArea.value)
          } else {
            this.socket.send('message', {'message': this.messageArea.value})
          }
          this.receiveChatMessage({user: this.socket_id, message: this.messageArea.value});
        }
    }

    receiveChatMessage(data){
        console.log('resp: ', data);
        let date = (new Date()).toLocaleString();
        let alias = data.user;
        if (this.aliases[alias] !== undefined && this.aliases[alias]){
          alias = this.aliases[alias];
        }
        let chatMessage = {user: alias, message: data.message, date: date};
        this.chatMessages.push(chatMessage);
        this.chatArea.innerHTML += `<span class="user">${chatMessage.user}</span>: ${chatMessage.message} <span class="date">${chatMessage.date}</span><br>`;
        this.messageArea.value = '';
    }

    refreshChatMessages(){
      for (let i = 0; i < this.chatMessages.length; i++){
        let socket_id = this.chatMessages[i].user;
        if (this.aliases[socket_id] !== undefined && aliases[socket_id]){
          this.chatMessages[i].user = this.aliases[socket_id];
        }
      }
      this.chatArea.innerHTML = this.chatMessages
        .map(chatMessage => `<span class="user">${chatMessage.user}</span>: ${chatMessage.message} <span class="date">${chatMessage.date}</span>`)
        .join('<br>');
    }

    updateUsersList(data){
        console.log('updateUsersList: ', data);
        this.ice = data.ice
        console.log('ice:', this.ice);
        if (this.wrtc){
            this.wrtc.setIce(this.ice);
        }
        let last_users = data.sockets;
        this.appear_users = last_users.filter(last_user => this.users.map(user => user).indexOf(last_user) === -1);
        this.disappear_users = this.users.filter(user => last_users.map(last_user => last_user).indexOf(user) === -1);
        this.users = data.sockets;
        this.wrtcConnect(this.stream);
    }

    async wrtcConnect(stream){
      if (!stream)
        return;
      this.wrtc.setLocalStream(stream);
      //handle appear_users
      for (let appear_user of this.appear_users){
        this.wrtc.call(appear_user);
      }
      //handle disappear_users
      for (let disappear_user of this.disappear_users){
        this.wrtc.disconnect(disappear_user);
        if (this.remoteVideos[disappear_user] != undefined && this.remoteVideos[disappear_user]){
          this.remoteVideos[disappear_user].destroy();
          delete this.remoteVideos[disappear_user];
        }
      }
    }

    destroyChildren(node){
        if (!node) return;
        node.innerHTML = '';
        while (node.firstChild)
            node.removeChild(node.firstChild);
    }

    onRemoteStream(stream, username){
        if (this.remoteVideos[username] != undefined && this.remoteVideos[username]){
            this.remoteVideos[username].destroy();
            delete this.remoteVideos[username];
        }
        this.remoteVideos[username] = new Video({selector: 'div.video-container', id: `video-${username}`, name: username});
        this.remoteVideos[username].show();
        this.remoteVideos[username].attachStream(stream);
        let alias = username;
        if (this.aliases[alias] !== undefined && this.aliases[alias]){
          alias = this.aliases[alias];
        }
        this.remoteVideos[username].setTitle(alias);
        this.removeOldVideos();
      }

    removeOldVideos(){
      for (let username in this.remoteVideos){
        if (this.users.indexOf(username) === -1){
          this.remoteVideos[username].destroy();
          delete this.remoteVideos[username];
        }
      }
    }

    diplay(el, show=true){
      if (el){
        el.style.display = (show)? 'inline-block' : 'none';
      }
    }

    toggleVideo(){
      this.video_off = !this.video_off;
      console.log('toggle video', this.video_off);
      if (this.video_off){
        this.videoToggleBtn.innerHTML = '<i class="fa-solid fa-video"></i>';
        this.wrtc.videoOff();
      } else {
        this.videoToggleBtn.innerHTML = '<i class="fa-solid fa-video-slash"></i>';
        this.wrtc.videoOn();
      }
    }

    toggleAudio(){
      this.audio_off = !this.audio_off;
      console.log('toggle audio', this.audio_off);
      if (this.audio_off){
        this.audioToggleBtn.innerHTML = '<i class="fa-solid fa-microphone-lines"></i>';
        this.wrtc.audioOff();
      } else {
        this.audioToggleBtn.innerHTML = '<i class="fa-solid fa-microphone-lines-slash"></i>';
        this.wrtc.audioOn();
      }
    }

    sendFiles(){
      console.log('sendfiles');
      this.fileInput.click();
    }

    onFilesSelected(){
      this.files = Array.from(this.fileInput.files);
      console.log('files selected', this.files);
      for (let f of this.files){
        const progress = document.createElement('div');
        progress.className = 'progress';
        const progressbar = document.createElement('div');
        progressbar.className = 'progress-bar';
        progress.appendChild(progressbar);
        this.chatArea.appendChild(progress);
        progressbar.className = 'progress-bar';
        this.wrtc.sendFile(f, progressbar);
      }
    }

    appendIncomingFile(anchor){
      var div = document.createElement('div');
      div.id = UUID4();
      div.appendChild(anchor);
      this.chatArea.appendChild(div);
    }

    fileAccepted(filename){
      for( let i in this.files){
        if (this.files[i].name === filename) {
          this.files.splice(i,1);
        }
      }
    }

    get alias(){
        if (localStorage.getItem('alias') && localStorage.getItem('alias').length){
          return localStorage.getItem('alias');
        }
        return null;
    }

    set alias(alias){
      if (alias){
        localStorage.setItem('alias', alias);
      } else {
        localStorage.removeItem('alias');
      }
    }

    onChangeAlias(){
      this.alias = this.aliasInput.value;
      if (this.video){
        this.video.setTitle(this.alias);
      }
      this.socket.send('alias', {'alias': this.alias, socket_id: this.socket_id});
    }

    onGotAliases(data){
      console.log('onGotAliases:', data);
      this.aliases = data.aliases;
      for (let username in this.remoteVideos){
        let alias = username;
        if (this.aliases[alias] !== undefined && this.aliases[alias]){
          alias = this.aliases[alias];
        }
        this.remoteVideos[username].setTitle(alias);
      }
      this.refreshChatMessages();
    }

    exit(){
      for (let user of this.users){
        this.wrtc.disconnect(user);
        if (this.remoteVideos[user] != undefined && this.remoteVideos[user]){
          this.remoteVideos[user].destroy();
          delete this.remoteVideos[user];
        }
      }
      window.location.href = '/';
    }
}

/**
 * generation UUID4 code
 * @returns {string}
 * @constructor
 */
const UUID4 = function () {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

function onLoad() {
    const app = new App();
}

window.addEventListener('load', onLoad);



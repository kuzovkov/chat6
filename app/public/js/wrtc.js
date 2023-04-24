const PeerConnection = window.mozRTCPeerConnection || window.webkitRTCPeerConnection;
const IceCandidate = window.mozRTCIceCandidate || window.RTCIceCandidate;
const SessionDescription = window.mozRTCSessionDescription || window.RTCSessionDescription;
navigator.getUserMedia = navigator.getUserMedia || navigator.mozGetUserMedia || navigator.webkitGetUserMedia;

class WRTC {
    pc_config = null;
    app = null;
    pc_pool = {}; // PeerConnection's pool
    online = false;
    chat_datachannel_pool = {}; /*RTCDataChannel's pool для чата*/
    file_datachannel_pool = {}; /*RTCDataChannel's pool для файлов*/
    video_pool = {}; /*Video's elements pool*/
    mash = {};
    localStream = null;
    screenStream = null;

    constructor(app){
        this.app = app;
        this.chat_datachannel = null; /*RTCDataChannel для чата*/
        this.file_datachannel = null; /*RTCDataChannel для файлов*/
        this.pc_config = app.ice;
    }

    setIce(ice){
        this.pc_config = ice;
    }

    setLocalStream(stream){
        this.localStream = stream;
    }

    /**
     * инициация вызова вызывающим абонентом,
     * отправка вызываемому абоненту приглашения к связи
     */
    call(username){
        //console.log(Date.now(), 'call', 'pc_config', this.pc_config);
        this.sendMessage({type:'intent_call'}, username);
    }

    /**
     * начало звонка при получении согласия вызываемого абонента
     */
    beginConnect(username){
        this.sendMessage({type:'call'}, username);
        //this.attachStream(document.getElementById("localVideo"), stream);
        //this.localStream = stream;
        //console.log(Date.now(), 'gotStream:', stream);
        const ctx = {that: this, username: username}
        this.mash[username] = {}
        this.mash[username].pc = new PeerConnection(this.pc_config);
        this.mash[username].pc.onicecandidate = this.gotIceCandidate.bind(ctx);
        this.mash[username].pc.onaddstream = this.gotRemoteStream.bind(ctx);
        this.mash[username].pc.ontrack = this.gotRemoteTracks.bind(ctx);
        this.addStreamToRTCPeerConnection(this.localStream, username);
        this.mash[username].chat_datachannel = this.mash[username].pc.createDataChannel("chat", {negotiated: true, id: 0, ordered: true});
        this.mash[username].file_datachannel = this.mash[username].pc.createDataChannel("file", {negotiated: true, id: 1, ordered: true});
        this.mash[username].chat_datachannel.onopen = this.chatDataChannelOnOpen.bind(ctx);
        this.mash[username].chat_datachannel.onmessage = this.chatDataChannelOnMessage.bind(ctx);
        this.mash[username].file_datachannel.onopen = this.fileDataChannelOnOpen.bind(ctx);
        this.mash[username].file_datachannel.onmessage = this.fileDataChannelOnMessage.bind(ctx);
        this.mash[username].localDescription = false;
        this.mash[username].online = false;
    }

    /**
     * инициация ответа вызывающему абоненту
     */
    answer(username){
        console.log(Date.now(), 'answer');
        const ctx = {that: this, username: username}
        this.mash[username] = {}
        this.mash[username].pc = new PeerConnection(this.pc_config);
        this.addStreamToRTCPeerConnection(this.localStream, username);
        this.mash[username].pc.onicecandidate = this.gotIceCandidate.bind(ctx);
        this.mash[username].pc.onaddstream = this.gotRemoteStream.bind(ctx);
        this.mash[username].pc.ontrack = this.gotRemoteTracks.bind(ctx);
        this.sendMessage({type:'offer_ready'}, username);
        this.mash[username].chat_datachannel = this.mash[username].pc.createDataChannel("chat", {negotiated: true, id: 0, ordered: true});
        this.mash[username].file_datachannel = this.mash[username].pc.createDataChannel("file", {negotiated: true, id: 1, ordered: true});
        this.mash[username].chat_datachannel.onopen = this.chatDataChannelOnOpen.bind(ctx);
        this.mash[username].chat_datachannel.onmessage = this.chatDataChannelOnMessage.bind(ctx);
        this.mash[username].file_datachannel.onopen = this.fileDataChannelOnOpen.bind(ctx);
        this.mash[username].file_datachannel.onmessage = this.fileDataChannelOnMessage.bind(ctx);
        this.mash[username].localDescription = false;
        this.mash[username].online = false;
    }

    /**
     * создание Offer для инициации связи (в соотв. с протоколом WebRTC)
     */
    createOffer(username) {
        console.log(Date.now(), 'createOffer');
        //document.getElementById("hangupButton").style.display = 'inline-block';
        this.mash[username].pc.createOffer(
          this.gotLocalDescription.bind({that: this, username: username}),
          function(error) { console.log(error) },
          { 'mandatory': { 'OfferToReceiveAudio': true, 'OfferToReceiveVideo': true } }
        );
    }


    /**
     * создание Answer для инициации связи (в соотв. с протоколом WebRTC)
     */
    createAnswer(username) {
        console.log(Date.now(), 'createAnswer');
        console.log(Date.now(), 'signalingState', this.mash[username].pc.signalingState);
        this.mash[username].pc.createAnswer(
          this.gotLocalDescription.bind({that: this, username: username}),
          function(error) { console.log(error) },
          { 'mandatory': { 'OfferToReceiveAudio': true, 'OfferToReceiveVideo': true } }
        );
    }

    /**
     * обработчик получения локального SDP (в соотв. с протоколом WebRTC)
     * @param description SDP
     */
    gotLocalDescription(description){
        console.log(Date.now(), 'gotLocalDescription:', description);
        this.that.mash[this.username].pc.setLocalDescription(description);
        this.that.sendMessage(description, this.username);
    }

    /**
     * обработчик получения ICE Candidate объектом RTCPeerConnection (в соотв. с протоколом WebRTC)
     * @param event
     */
    gotIceCandidate(event){
        console.log(Date.now(), 'gotIceCandidate: ', event.candidate);
        if (event.candidate) {
            this.that.sendMessage({
                type: 'candidate',
                label: event.candidate.sdpMLineIndex,
                id: event.candidate.sdpMid,
                candidate: event.candidate.candidate
            }, this.username);
        }
    }

    /**
     * обработчик получения объектом RTCPeerConnection
     * удаленного медиапотока
     * @param event объект события
     */
    gotRemoteStream(event){
        console.log(Date.now(), 'gotRemoteStream: ', event.stream);
        console.log(Date.now(), 'gotRemoteStream(audio tracks): ', event.stream.getAudioTracks());
        //this.attachStream(document.getElementById("remoteVideo"), event.stream);
        this.that.mash[this.username].online = true;
        this.that.app.onRemoteStream(event.stream, this.username);
        // this.setHangUp(true);
        // document.getElementById("screenshareButton").style.display = 'inline-block';
        // document.getElementById("videoOff").style.display = 'inline-block';
        // document.getElementById("audioOff").style.display = 'inline-block';
    }

    /**
     * обработчик получения объектом RTCPeerConnection
     * удаленного трека медиапотока
     * На событие "track", вместо обработчика устаревшего события "addstream"
     * @param event объект события
     */
    gotRemoteTracks(event){
        //console.log(Date.now(), 'gotRemoteTracks: ', event);
        console.log(Date.now(), 'gotRemoteTracks: ', event.streams);
        console.log(Date.now(), 'gotRemoteTracks(audio tracks): ', event.streams[0].getAudioTracks());
        // this.attachStream(document.getElementById("remoteVideo"), event.streams[0]);
        this.that.mash[this.username].online = true;
        this.that.app.onRemoteStream(event.streams[0], this.username);
        // this.setHangUp(true);
        // document.getElementById("screenshareButton").style.display = 'inline-block';
        // document.getElementById("videoOff").style.display = 'inline-block';
        // document.getElementById("audioOff").style.display = 'inline-block';
    }

    /**
     * отправка сообщений абоненту через socket.io
     * для обеспечения сигналлинга
     * @param message
     * @param to
     */
    sendMessage(message, to){
        console.log(Date.now(), 'send_message: ', message, to);
        this.app.socket.send('wrtc_message', {message: message, to: to});
    }

    /**
     * завершение сеанса связи
     */
    disconnect(username){
        //this.hang_up = true;
        if (this.mash[username] !== undefined && this.mash[username]){
            if (this.mash[username].online){
                this.mash[username].online = false;
            }
            if(this.mash[username].pc != null){
                this.mash[username].pc.close();
                this.mash[username].pc = null;
                delete this.mash[username];
            }
            if(this.mash[username] !== undefined && this.mash[username].chat_datachannel != null){
                this.mash[username].chat_datachannel.close();
                this.mash[username].chat_datachannel = null;
            }
            if(this.mash[username] !== undefined && this.mash[username].file_datachannel != null){
                this.mash[username].file_datachannel.close();
                this.mash[username].file_datachannel = null;
            }
        }
    }


    /**
     * обработка сообщений от абонента
     * для обеспечения сигналлинга
     */
    gotMessage(data){
        var message  = data.message;
        var from = data.from;
        console.log(Date.now(), 'gotMessage: ', message, from);
        if (this.mash[from] != undefined && this.mash[from].pc != null && message.type === 'offer') {
            this.mash[from].pc.setRemoteDescription(new SessionDescription(message));
            this.createAnswer(from);
        }
        else if (this.mash[from] != undefined && this.mash[from].pc != null && message.type === 'answer') {
            this.mash[from].pc.setRemoteDescription(new SessionDescription(message));
        }
        else if (this.mash[from] != undefined && this.mash[from].pc != null && message.type === 'candidate') {
            //var candidate = new IceCandidate({sdpMLineIndex: message.label, candidate: message.candidate});
            var candidate=null;
            try{
                candidate = new IceCandidate(message);
                this.mash[from].pc.addIceCandidate(candidate);
            }catch (e){
                try{
                    candidate = new IceCandidate({sdpMLineIndex: message.label, candidate: message.candidate});
                    this.mash[from].pc.addIceCandidate(candidate);
                }catch (e){
                    console.log(e);
                }
            }
        }else if (message.type === 'hangup'){
            this.disconnect();
            this.setHangUp(false);
        }else if(message.type === 'call'){
            this.answer(from);
        }else if(message.type === 'offer_ready'){
            this.createOffer(from);
        }else if (message.type === 'intent_call'){
            //this.hangup();
            this.sendMessage({type:'ready_call'}, from);
        }else if (message.type === 'ready_call'){
            this.beginConnect(from);
        }else if (message.type === 'reject_call'){
            this.setSelectedUser(null);
            this.setHangUp(false);
        }
    }


    /**
     * Обработка получения потока с экрана
     * @param stream
     */
    onGettingScreenSteam(stream){
        this.screenStream = this.app.screenStream;
        //this.addStreamStopListener(stream, this.onScreenShareEnded.bind(this));
        //document.getElementById("screenshareButton").style.display = 'none';
        Object.keys(this.mash).forEach(username => {
          if (username !== this.app.socket_id){
            this.removeStreamFromRTCPeerConnection(this.localStream, username);
            const audiotracks = this.localStream.getAudioTracks();
            console.log('audio tracks', audiotracks);
            if (audiotracks.length > 0){
              console.log('add audio track', audiotracks[0]);
              this.screenStream.addTrack(audiotracks[0]);
            }
            this.addStreamToRTCPeerConnection(this.screenStream, username);
            this.createOffer(username);
          }
        });
    }

    /**
     * Обработка прекращения расшаривания экрана
     */
    onScreenShareEnded(){
        console.log('Screen share stopped');
        //document.getElementById("screenshareButton").style.display = 'inline-block';
        Object.keys(this.mash).forEach(username => {
          if (username !== this.app.socket_id){
            this.removeStreamFromRTCPeerConnection(this.screenStream, username);
            this.addStreamToRTCPeerConnection(this.app.stream, username);
            //this.screenStream = null;
            this.createOffer(username);
          }
        });
    }

    /**
     * Wrap over ToRTCPeerConnection.addStream to avoid
     * deprecated issues
     * @param stream
     * @param username
     */
    addStreamToRTCPeerConnection(stream, username){
        if (!stream)
            return;
        try{
            this.mash[username].pc.addStream(stream);
        }catch (e){
            console.log('addStreamToRTCPeerConnection.stream:', stream);
            stream.getTracks().forEach(function(track) {
                this.mash[username].pc.addTrack(track, stream);
            });
        }
    }

    /**
     * Wrap over ToRTCPeerConnection.removeStream to avoid
     * deprecated issues
     * @param stream
     */
    removeStreamFromRTCPeerConnection(stream, username){
        if (!stream)
            return;
        try{
            this.mash[username].pc.removeStream(stream);
        }catch (e){
            this.mash[username].pc.getSenders().forEach(function(sender){
                stream.getTracks().forEach(function(track){
                    if(track == sender.track){
                        this.mash[username].pc.removeTrack(sender);
                    }
                })
            });
        }
    }

    /**
     * Обработчик кнопки выключения видео
     */
    videoOff(){
        this.localStream.getVideoTracks().forEach(function(track){
            track.enabled = false;
        });
        Object.keys(this.mash).forEach(username => {
          if (username !== this.app.socket_id){
            this.createOffer(username);
          }
        });
    }

    /**
     * Обработчик кнопки включения видео
     */
    videoOn(){
        this.localStream.getVideoTracks().forEach(function(track){
            track.enabled = true;
        });
        Object.keys(this.mash).forEach(username => {
          if (username !== this.app.socket_id){
            this.createOffer(username);
          }
        });
    }

    /**
     * Обработчик кнопки выключения звука
     */
    audioOff(){
        this.localStream.getAudioTracks().forEach(function(track){
            track.enabled = false;
        });
        Object.keys(this.mash).forEach(username => {
          if (username !== this.app.socket_id){
            this.createOffer(username);
          }
        });
    }

    /**
     * Обработчик кнопки включения звука
     */
    audioOn(){
        this.localStream.getAudioTracks().forEach(function(track){
            track.enabled = true;
        });
        Object.keys(this.mash).forEach(username => {
          if (username !== this.app.socket_id){
            this.createOffer(username);
          }
        });
    }

    /**
     * Обработчик создания chat datachannel
     * @param event
     */
    chatDataChannelOnOpen(event) {
        this.that.mash[this.username].chat_datachannel.send(['I\'m connected', '!'].join(' '));
    }

    /**
     * Обработчик приема данных через chat datachannel
     * @param event
     */
    chatDataChannelOnMessage(event) {
        const timestamp = (new Date()).getTime();
        const message = {created: timestamp, from:this.username, to: this.that.app.socket_id, message:event.data};
        const data = {user: this.username, message: event.data}
        this.that.app.receiveChatMessage(data);
        console.log(message);
    }

    /**
     * Обработчик создания file datachannel
     * @param event
     */
    fileDataChannelOnOpen(event) {
        console.log('file datachannel open');
    }

    /**
     * Обработчик приема данных через file datachannel
     * @param event
     */
    fileDataChannelOnMessage(event) {
        if( typeof event.data === 'string') {
            this.that.app.filesp2p.startDownload(event.data);
        } else {
            this.that.app.filesp2p.progressDownload(event.data);
        }
    }

    sendChatMessage(message){
      console.log('send message p2p');
      Object.keys(this.mash).forEach(username => {
          if (username !== this.app.socket_id){
            if (this.mash[username] !== undefined && this.mash[username].chat_datachannel){
              this.mash[username].chat_datachannel.send(message);
            }
          }
        });
    }

    sendFile(file, progressbar){
        console.log('send file p2p');
        Object.keys(this.mash).forEach(username => {
          if (username !== this.app.socket_id){
            if (this.mash[username] !== undefined && this.mash[username].file_datachannel){
                this.app.filesp2p.sendFile(file, this.mash[username].file_datachannel, progressbar);
            }
          }
        });
    }

}



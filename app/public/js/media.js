class Media {

    devices
    stream
    screenStream

    constructor(){
        this.devices = {audio: [], video: []};
        this.stream = null;
        this.screenStream = null;
    }

    async getDevices(){
       try{
           const devices = await navigator.mediaDevices.enumerateDevices();
           devices.filter(item => item.kind === 'audioinput').forEach(device => {
                 this.devices.audio.push({...device.getCapabilities(), label: device.label});
             }
           );
           devices.filter(item => item.kind === 'videoinput').forEach(device => {
                 this.devices.video.push({...device.getCapabilities(), label: device.label});
             }
           );
           return this.devices;
       }catch (e){
           console.log(e);
       }
    }

    async getConstraints(){
        try{
            const devices = await this.getDevices();
            const audio = this.devices.audio.length > 0;
            const video = this.devices.video.length > 0;
            return {audio, video};
        } catch (e){
            console.log(e);
        }
    }

    async getMediaStream(){
        try{
            this.stopTracks(this.stream);
            const constraints = await this.getConstraints();
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.stream = stream;
            return stream;
        }catch (e){
            console.log(e);
        }
    }

    async getUserMedia(constraints){
        return new Promise(function (resolve, reject) {
            navigator.getUserMedia(constraints, function (stream) {
                resolve(stream);
            },
              function (error) {
                  reject(error);
              });
        });
    }

    async getMediaStream2(){
        try{
            this.stopTracks(this.stream);
            const constraints = await this.getConstraints();
            const stream = await this.getUserMedia(constraints);
            this.stream = stream;
            return stream;
        }catch (e){
            console.log(e);
        }
    }

    stopTracks(stream){
        if (stream) {
            stream.getTracks().forEach(track => {
                track.stop();
            });
            stream = null;
        }
    }

    async getScreenStream(callbak){
        this.stopTracks(this.screenStream);
        const constraints = await this.getConstraints();
        let stream = null;
        try{
            if(navigator.mediaDevices.getDisplayMedia) {
                stream = await navigator.mediaDevices.getDisplayMedia({video: true, audio: constraints.audio});
            } else if(navigator.getDisplayMedia) {
                stream = await navigator.getDisplayMedia({video: true, audio: constraints.audio});
            }
            if (stream){
                this.screenStream = stream;
                this.addStreamStopListener(stream, callbak);
            }
            return stream;
        }catch (e){
            console.log(e);
        }
    }

    addStreamStopListener(stream, callback) {
        stream.addEventListener('ended', function() {
            callback();
            callback = function() {};
        }, false);
        stream.addEventListener('inactive', function() {
            callback();
            callback = function() {};
        }, false);
        stream.getTracks().forEach(function(track) {
            track.addEventListener('ended', function() {
                callback();
                callback = function() {};
            }, false);
            track.addEventListener('inactive', function() {
                callback();
                callback = function() {};
            }, false);
        });
    }

}

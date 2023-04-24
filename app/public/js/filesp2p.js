Fp2p = {};

Fp2p.BYTES_PER_CHUNK = 12*1024;
Fp2p.BUFFERED_AMOUNT_LIMIT = 10000000;
Fp2p.app = null;
Fp2p.p2pConnection = null;
Fp2p.incomingFiles = {};

Fp2p.init = function (app) {
    Fp2p.app = app;
};

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * get file object for each sended file
 * @param file
 * @param p2pConnection
 * @returns {{file: *, fileReader: *, p2pConnection: *, currentChunk: number, uuid}}
 */
Fp2p.getFileObject = function(file, p2pConnection){
    return {
        file: file,
        fileReader: new FileReader(),
        p2pConnection: p2pConnection,
        currentChunk: 0,
        uuid: UUID4()
    };
};

/**
 * send file across p2p connection
 * @param file
 * @param p2pConnection
 */
Fp2p.sendFile = function(file, p2pConnection, progressbar){
    var fileObj = Fp2p.getFileObject(file, p2pConnection);
    fileObj.fileReader.onload = function(){ Fp2p.sendNextChunk(fileObj)};
    fileObj.progressbar = progressbar;
    Fp2p.startUpload(fileObj);
};

/**
 * start download file from p2p connection
 * @param data
 */
Fp2p.startDownload = function (data) {
    data = JSON.parse(data.toString());
    if (data.type === 'start'){
        Fp2p.incomingFiles[data.uuid] = {};
        Fp2p.incomingFiles[data.uuid].incomingFileInfo = data;
        Fp2p.incomingFiles[data.uuid].incomingFileData = [];
        Fp2p.incomingFiles[data.uuid].bytesReceived = 0;
        Fp2p.incomingFiles[data.uuid].downloadInProgress = true;
        console.log( 'incoming file <b>' + Fp2p.incomingFiles[data.uuid].incomingFileInfo.fileName + '</b> of ' + Fp2p.incomingFiles[data.uuid].incomingFileInfo.fileSize + ' bytes' );
    }else if (data.type === 'end'){
        Fp2p.endDownload(data.uuid);
    }
};

/**
 * progress download file data
 * @param data
 */
Fp2p.progressDownload = function(data) {
    console.log(data);
    if (!data.byteLength){
        new Response(data).arrayBuffer().then(function (buffer) {
            Fp2p.progressDownload(buffer);
        });
    }else{
        var filebuf = data.slice(36); //36 is array length of uuid bytes
        var uuid = (new TextDecoder()).decode(new Int8Array(data.slice(0, 36)));
        var size = filebuf.byteLength || filebuf.size;
        Fp2p.incomingFiles[uuid].bytesReceived += size;
        Fp2p.incomingFiles[uuid].incomingFileData.push( filebuf );
        console.log(Fp2p.incomingFiles[uuid].bytesReceived);
        console.log(Fp2p.incomingFiles[uuid].incomingFileInfo.fileSize);
        console.log( 'progress: ' +  ((Fp2p.incomingFiles[uuid].bytesReceived / Fp2p.incomingFiles[uuid].incomingFileInfo.fileSize ) * 100).toFixed( 2 ) + '%' );
        if (Fp2p.incomingFiles[uuid].bytesReceived === Fp2p.incomingFiles[uuid].incomingFileInfo.fileSize)
            Fp2p.endDownload(uuid);
    }
};

/**
 * end download file data end save file
 * @param uuid
 */
Fp2p.endDownload = function (uuid) {
    if (Fp2p.incomingFiles[uuid] === undefined)
        return;
    if (Fp2p.incomingFiles[uuid].bytesReceived < Fp2p.incomingFiles[uuid].incomingFileInfo.fileSize)
        return;
    Fp2p.incomingFiles[uuid].downloadInProgress = false;
    var blob = new window.Blob(Fp2p.incomingFiles[uuid].incomingFileData);
    var anchor = document.createElement('a');
    anchor.innerHTML = Fp2p.incomingFiles[uuid].incomingFileInfo.fileName;
    anchor.href = URL.createObjectURL( blob );
    anchor.download = Fp2p.incomingFiles[uuid].incomingFileInfo.fileName;
    Fp2p.app.appendIncomingFile(anchor);
    /** uncomment to download the received files immediately
     if( anchor.click ) {
         anchor.click();
     } else {
         var evt = document.createEvent('MouseEvents');
         evt.initMouseEvent('click', true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
         anchor.dispatchEvent(evt);
     }
     **/
    delete Fp2p.incomingFiles[uuid];
};

/**
 * start upload file across p2p connention
 * @param fileObj
 */
Fp2p.startUpload = function(fileObj){
    console.log( 'sending ' + fileObj.file.name + ' of ' + fileObj.file.size + ' bytes' );
    fileObj.currentChunk = 0;
    fileObj.p2pConnection.send(JSON.stringify({
        fileName: fileObj.file.name,
        fileSize: fileObj.file.size,
        uuid: fileObj.uuid,
        type: 'start'
    }));
    Fp2p.readNextChunk(fileObj);
};

/**
 * read next chink of a file
 * @param fileObj
 */
Fp2p.readNextChunk = async function (fileObj){
    var start = Fp2p.BYTES_PER_CHUNK * fileObj.currentChunk;
    var end = Math.min( fileObj.file.size, start + Fp2p.BYTES_PER_CHUNK );
    if (fileObj.p2pConnection.bufferedAmount < Fp2p.BUFFERED_AMOUNT_LIMIT){
        fileObj.fileReader.readAsArrayBuffer( fileObj.file.slice( start, end ) );
    }else{
        await sleep(30);
        Fp2p.readNextChunk(fileObj);
    }

};

/**
 * add uuid data to file data and send it
 * @param fileObj
 */
Fp2p.sendNextChunk = function (fileObj) {
    var uuidarray = (new TextEncoder()).encode(fileObj.uuid);
    var filearray = new Int8Array(fileObj.fileReader.result);
    var dataarray = new Int8Array(filearray.length+ uuidarray.length);
    dataarray.set(uuidarray);
    dataarray.set(filearray, uuidarray.length);
    fileObj.p2pConnection.send(dataarray.buffer);
    fileObj.currentChunk++;
    if( Fp2p.BYTES_PER_CHUNK * fileObj.currentChunk < fileObj.file.size ) {
        Fp2p.readNextChunk(fileObj);
        var percentComplete = Fp2p.BYTES_PER_CHUNK * fileObj.currentChunk / fileObj.file.size;
        percentComplete = parseInt(percentComplete * 100);
        fileObj.progressbar.innerText = percentComplete + '%';
        fileObj.progressbar.textContent = percentComplete + '%';
        fileObj.progressbar.style.width = percentComplete + '%';
    }else{
        fileObj.progressbar.innerText = 'Done';
        fileObj.progressbar.textContent = 'Done';
        fileObj.progressbar.style.width = '100%';
        fileObj.p2pConnection.send(JSON.stringify({
            uuid: fileObj.uuid,
            type: 'end'
        }));
        Fp2p.app.fileAccepted(fileObj.file.name);
        fileObj = null;
    }
};

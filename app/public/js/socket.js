class Socket {
    ws

    constructor(connect_cbk, disconnect_cbk){
        this.wsConnect(connect_cbk, disconnect_cbk)
    }

    /**
     * установка обработчиков событий
     * @param event строка с названием события
     * @param handler функция-обработчик события
     **/
    setHandler(event, handler){
        this.ws.on(event, handler);
    }

    /**
     * отправка событий
     * @param event строка с названием события
     * @param object объект, содержащий посылаемые данные
     **/
    send(event, object){
        this.ws.emit(event, object);
    }

    wsConnect(connect_cbk, disconnect_cbk) {
        if (window.location.protocol == 'https:')
            this.ws = io('wss://'+window.location.hostname+':'+window.location.port + window.location.pathname, {transports: ['websocket'], path: '/socket.io', query: {}});
        else if (window.location.protocol == 'http:')
            this.ws = io('ws://'+window.location.hostname+':'+window.location.port + window.location.pathname, {transports: ['websocket'], path: '/socket.io', query: {}});
        this.ws.on('connect', () => {
            console.log('connect:', this.ws)
            if (connect_cbk)
                connect_cbk(this.ws);
        });
        this.ws.on('disconnect', () => {
            if (disconnect_cbk)
                disconnect_cbk();
        });
        window.WS = this.ws;
    }

    getId(){
        return this.ws.id
    }
}

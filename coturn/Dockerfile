FROM ubuntu:20.04

WORKDIR /usr/local/coturn
COPY bin/turnserver-4.5.1.3.tar.gz ./
RUN tar xvfz turnserver-4.5.1.3.tar.gz
RUN apt-get update && \
    apt-get install -y build-essential libevent-dev libssl-dev libsqlite3-dev
RUN cd turnserver-4.5.1.3 && \
    ./configure && \
    make && \
    make install
RUN echo "TURNSERVER_ENABLED=1" > /etc/default/coturn
COPY ./turnserver-alt.conf /etc/turnserver.conf

ENTRYPOINT /usr/local/bin/turnserver
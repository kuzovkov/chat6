#node.js chat


## I. Setup. (Example)
Requires: Ubuntu (tested on 14.04), Node.js

```bash
cd /var/www/vhosts
sudo git clone https://github.com/kuzovkov/chat1.git
cd chat1
sudo npm install
sudo chmod a+x server.js
sudo chmod a+x start
sudo chmod a+x stop

sudo cp init.d.chat1.example /etc/init.d/chat1
sudo chmod a+x /etc/init.d/chat1
sudo update-rc.d chat1 start 99 2 3 4 5 . stop 01 0 1 6 .
sudo echo 'user.info       /var/log/chat.log' > /etc/rsyslog.d/chat.conf
sudo service rsyslog restart
```

## II. Running
```bash
sudo service chat1 start
```
Reading log: 

```bash
tail -f /var/log/chat
```

## III. Stopping, Restarting

```bash
sudo service chat1 stop
sudo service chat1 restart
```

## IV. Run in Docker

You will need own domain name. Make sure that you domain linked with host IP address where you are running chat application.
Install Docker, docker-compose if not yet installed 
```bash
chmod a+x install-docker.sh && ./install-docker.sh
sudo docker-compose build
```


#### Get SSl certificates
rename docker/nginx/conf.d/default-ssl.conf -> docker/nginx/conf.d/default-ssl.conf.bak

```bash
mv nginx/conf.d/default-ssl.conf nginx/conf.d/default-ssl.conf.bak
mv nginx/conf.d/default.conf.bak nginx/conf.d/default.conf

./certbot.sh <domain-name>

mv nginx/conf.d/default-ssl.conf.bak nginx/conf.d/default-ssl.conf 
mv nginx/conf.d/default.conf nginx/conf.d/default.conf.bak
 
docker-compose restart nginx
```

Check that actual domain name is in `docker/nginx/conf.d/default.conf`
Check that actual domain name is in `docker/coturn/turnserver.conf`

```bash
sudo docker-compose up -d
```
##### build js clients code for production mode

```bash
sudo docker-compose exec chat gulp 
```

##### Run in different mode (development | production)

###### prod:
```bash
export NODE_ENV=production
docker-compose up -d
```

###### dev:
```bash
export NODE_ENV=development
docker-compose up -d
```

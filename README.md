#node.js chat


## I. Run in Docker

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
sudo docker-compose exec chat gulp -f app/gulpfile.js
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

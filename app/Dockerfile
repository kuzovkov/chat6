FROM node:16
ARG user
# The ARG instruction defines a variable that users can pass at build-time to the builder with the docker build
# command using the --build-arg <varname>=<value> flag
ARG user_id
ARG group_id

RUN deluser "node"
RUN addgroup --gid "$group_id" "$user"
RUN adduser --disabled-password --gecos "" --ingroup "$user" --uid "$user_id" "$user"
WORKDIR /usr/src/env
RUN apt-get update && apt-get install net-tools
RUN npm install --global gulp-cli
COPY package*.json ./
RUN npm install
COPY . ./app/
EXPOSE 8000
RUN chown -R "$user:$user"  /usr/src/env
RUN chown -R "$user:$user"  /usr/local
RUN groupadd admin
RUN gpasswd -a ${user} admin
USER ${user}
CMD ["node", "app/server_http.js"]

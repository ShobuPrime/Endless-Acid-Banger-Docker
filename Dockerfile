FROM nginx:latest

COPY -R ./dist /usr/share/nginx/html/
COPY -R ./js /usr/share/nginx/html/js/
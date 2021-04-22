FROM nginx:latest

COPY ./dist/ /usr/share/nginx/html/
COPY ./js/ /usr/share/nginx/html/js/

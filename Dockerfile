FROM nginx:alpine

COPY ./dist/ /usr/share/nginx/html/
COPY ./js/ /usr/share/nginx/html/js/

ENV PORT=80
EXPOSE ${PORT}

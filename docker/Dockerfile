FROM composer:2 AS dependencies
WORKDIR /app
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-interaction --prefer-dist --no-scripts --ignore-platform-reqs

FROM php:8.3-apache
RUN docker-php-ext-install pdo_mysql \
    && a2enmod rewrite
ENV APACHE_DOCUMENT_ROOT=/var/www/html/public
RUN sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/sites-available/*.conf \
    && sed -ri -e 's!/var/www/!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/apache2.conf /etc/apache2/conf-available/*.conf \
    && printf '<Directory ${APACHE_DOCUMENT_ROOT}>\n    AllowOverride All\n</Directory>\n' > /etc/apache2/conf-available/dashboard-builder.conf \
    && a2enconf dashboard-builder \
    && printf 'upload_max_filesize = 5M\npost_max_size = 6M\n' > /usr/local/etc/php/conf.d/uploads.ini
WORKDIR /var/www/html
COPY --from=dependencies /app/vendor ./vendor
COPY . .
RUN chown -R www-data:www-data public/uploads

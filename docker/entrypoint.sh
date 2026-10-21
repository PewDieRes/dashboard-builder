#!/bin/sh
set -e

# Hosting platforms such as Render inject the port to listen on; plain Docker keeps Apache's default.
listen_port="${PORT:-80}"
sed -ri "s/^Listen [0-9]+/Listen ${listen_port}/" /etc/apache2/ports.conf
sed -ri "s/<VirtualHost \*:[0-9]+>/<VirtualHost *:${listen_port}>/" /etc/apache2/sites-available/000-default.conf

php /var/www/html/scripts/install-database.php || echo "Database installation skipped: database unreachable" >&2

exec apache2-foreground

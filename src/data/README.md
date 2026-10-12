# Procedencia de los precios incluidos

- Titular y autor: Instituto Nacional de Protección de los Derechos del Consumidor (Pro Consumidor), Departamento de Análisis de Publicidad y Precios.
- Conjunto: «Precios de Productos de Primera Necesidad, 2026».
- Publicación: https://proconsumidor.gob.do/transparencia/index.php/precios-de-productos-de-primera-necesidad-2026.html
- Archivo utilizado: https://www.proconsumidor.gob.do/files/precios%20de%20productos%20de%20primera%20necesidad.csv
- Licencia indicada en el portal de datos abiertos: Open Data Commons Open Database License (ODbL), https://opendatacommons.org/licenses/odbl/1-0/.
- Período de los registros incluidos: abril–junio de 2026. No son precios de una sucursal ni ofertas actuales.

`precios-abiertos.json` es una transformación del CSV descargado el 27 de septiembre de 2026: se eliminaron filas vacías, espacios repetidos y una fila con el año 2035 que no coincide con el título del informe; los números se convirtieron de texto a importe decimal. Contiene 545 filas. Esta base transformada se ofrece bajo ODbL. El código de la aplicación es una obra separada.

Para regenerarla, ejecuta `python3 scripts/update_open_prices.py`. Comprueba siempre el período y los campos antes de publicar una nueva copia.

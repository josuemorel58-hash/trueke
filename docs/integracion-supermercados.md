# Integración de productos de supermercados en Refrigerio

Investigación realizada el 27 de septiembre de 2026.

## Qué se comprobó

- Sirena usa VTEX y su catálogo público responde a la ruta `GET https://www.sirena.do/api/catalog_system/pub/products/search/{busqueda}?_from=0&_to=19`. En una consulta de prueba devolvió nombre, marca, imagen, URL, EAN y oferta con precio en RD$. Documentación del proveedor: https://developers.vtex.com/docs/api-reference/search-api.
- Jumbo y Nacional tienen endpoints GraphQL de Adobe/Magento que respondieron a búsquedas de productos y devolvieron nombre, SKU, URL y precio en DOP. Documentación del proveedor: https://developer.adobe.com/commerce/webapi/graphql/schema/products/queries/products/. Los primeros resultados y precios de prueba coincidieron entre los dos sitios; hay que verificar el contexto de tienda/sucursal antes de tratarlos como precios independientes.
- Pro Consumidor publica un conjunto de datos de más de 500 precios: https://datos.gov.do/dataset/precios_productos_primera_necesidad. Su CSV ya se integró en la pestaña **Precios** de Refrigerio. Está organizado por mes y tipo de establecimiento, no por cadena/sucursal. El JSON publicado solo contiene IDs, sin precios; por eso se usa el CSV completo.

## Condiciones para incorporarlo a la app

Un endpoint accesible en el navegador no constituye una licencia para mostrar sus datos en otra aplicación. Los términos de Sirena excluyen el acceso automatizado salvo permiso expreso (apartado «Condiciones generales de uso», numeral 3): https://www.sirena.do/terminos-y-condiciones. Los términos de Nacional reservan las compilaciones de datos y restringen la reproducción/uso comercial sin acuerdo escrito: https://supermercadosnacional.com/terminos-y-condiciones.

Para publicar Refrigerio como comparador, pedir a las cadenas acceso o un feed autorizado que incluya producto, código de barras, presentación, precio, sucursal, disponibilidad, enlace y hora de actualización. Con el permiso, agregar un servicio backend programado que consulte esas fuentes y guarde productos normalizados en Supabase. La app buscaría en nuestro backend, nunca consultaría masivamente a las tiendas desde cada teléfono.

## Reglas de comparación

1. Agrupar productos preferentemente por EAN/GTIN idéntico. Si falta, comparar marca, variante y tamaño; no asumir equivalencia solo porque los nombres se parezcan.
2. Asegurar que ambos importes se refieren a la misma presentación y modalidad (precio web, entrega o tienda física). Usar precio unitario únicamente cuando el producto y unidad sean comparables.
3. Registrar supermercado, sucursal o zona y hora de captura; descartar ofertas vencidas o datos antiguos.
4. Si solo existe una oferta comparable, mostrar «precio disponible» en lugar de «el más barato».

La pantalla anterior de aportes de usuarios se retiró. La pantalla actual usa datos abiertos por segmento. La integración con cada supermercado por nombre queda pendiente de una fuente con autorización de reutilización.

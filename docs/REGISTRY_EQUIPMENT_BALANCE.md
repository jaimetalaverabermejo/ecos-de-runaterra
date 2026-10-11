# Registro regional y objetos · 0.16.3-test.2

- Las placas de diálogo muestran el nombre antes de una descripción separada por coma, punto medio o raya. Un ajuste por anchura real añade puntos suspensivos como protección; ni la placa ni la tipografía se agrandan.
- Cada Eco tiene una ranura en maestría 1–9, dos en 10–19 y tres desde 20. El desbloqueo es automático y gratuito; no depende del nivel del protagonista ni del avance de otro Eco. Los segundos objetos equipados en maestría 8/9 también se devuelven a la bolsa.
- Build y ficha muestran los huecos cerrados y su requisito. El servicio de equipamiento, los bonus de combate y la vida de progresión usan la misma regla.
- Al cargar/guardar, los objetos sobrantes de equipo y almacenamiento vuelven a la bolsa. Se conservan en orden las primeras ranuras disponibles; la migración es idempotente y no borra mejoras, dinero ni ecos. La vida actual se limita al nuevo máximo.
- El registro usa las regiones desbloqueadas y la región actual. Sus listas se derivan de apariciones regionales, encuentros de mapas y región principal de personajes con contenido; no de los 173 campeones planeados.
- Las apariciones corresponden al juego, no necesariamente al origen canónico: Kennen puede figurar en Bandle e Ionia. Los contadores generales deduplican estos casos y solo cuentan regiones disponibles.
- Doce tarjetas por página, cuatro columnas y tres filas. Retratos existentes para vistos/vinculados; nombre y retrato ocultos en desconocidos. Flechas superiores cambian región, inferiores página. Se recuerda región/página y se reinicia página al cambiar región.
- Verificación: `node scripts/check-equipment-registry.mjs`, TypeScript y build completa con regresiones de historias, mapas, interiores y mandos. Comprobación de geometría del registro a 960×540; pendiente revisión visual en dispositivo.

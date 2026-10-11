# Primera tanda de música

Los siete MP3 originales están en `audio/music/`. Vite los incorpora mediante imports de URL; no deben copiarse manualmente a `public` ni a `dist`.

| Contexto | Pista |
| --- | --- |
| Título, selección, Showdown y cinemática inicial | Intro Ecos de Runaterra |
| Aldea Bandle, casas y hangar | Ciudad de Bandle |
| Claro, rutas, Valle de Gnar y montañas | Rutas Bandle |
| Bosque Oscuro y Cueva de Gnar | Bosque |
| Combate normal en Bandle | Combate Bandle |
| Jefes Gnar y Kennen | Combate jefe |
| Combate normal en Jonia y Showdown | Combate jonia |
| Koeshin, Lhradi, Placidium e interiores de Jonia | Ciudad de Bandle, provisional |
| Acantilados Blancos y Arrozales | Rutas Bandle, provisional |

`MusicCatalog.ts` contiene las asignaciones temporales. `MusicManager.ts` mantiene un único reproductor entre escenas, carga solo la pista necesaria, conserva la posición cuando se solicita la misma canción, dispone de entrada suave y pausa al ocultar la página. Los efectos procedimentales existentes siguen en Phaser.

Música ON/OFF en selección de modo y menú de aventura; atajo M en esas pantallas. La preferencia se guarda localmente. El navegador puede requerir el primer toque o tecla para permitir reproducción.

Los archivos se reproducen enteros en repetición. No se han recortado ni certificado empalmes musicales sin costura: eso requiere una revisión de escucha posterior. Tampoco se ha aplicado normalización individual de las pistas. Se conserva un volumen de música moderado (0.32) para dejar espacio a los efectos.

Validación inicial: build completo, decodificación/metadatos de siete MP3, inclusión de siete archivos en producción y comprobaciones de asignación regional, jefes, continuidad, sustitución de reproductor, pausa/reanudación y silencio.

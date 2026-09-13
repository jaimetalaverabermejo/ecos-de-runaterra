# Probar Ecos de Runaterra desde iPad

## Ruta recomendada: GitHub Pages

GitHub hará el build del proyecto y publicará una URL web normal. El iPad sólo necesita Safari.

1. Crea un repositorio nuevo en GitHub, por ejemplo `ecos-de-runaterra`.
2. Sube todos los archivos de esta carpeta a la raíz del repositorio.
3. Confirma que la rama principal se llama `main`.
4. Abre `Settings` → `Pages`.
5. En `Build and deployment`, selecciona `GitHub Actions` como Source si GitHub no lo ha detectado automáticamente.
6. Abre la pestaña `Actions`. El workflow `Deploy to GitHub Pages` debería ejecutarse.
7. Cuando termine en verde, en `Settings` → `Pages` aparecerá la URL publicada.
8. Abre esa URL en Safari, preferiblemente con el iPad en horizontal.

Cada vez que actualices `main`, GitHub volverá a compilar y publicar automáticamente.

## StackBlitz

StackBlitz es un editor/entorno de desarrollo que funciona en el navegador. Es útil para abrir el repo, editar y ejecutar Vite sin ordenador.

1. Entra en https://stackblitz.com desde Safari.
2. Inicia sesión con GitHub.
3. Importa el repositorio `ecos-de-runaterra`.
4. StackBlitz instalará las dependencias y ejecutará el proyecto.
5. Si la preview integrada da problemas en Safari, ábrela en una pestaña independiente.

Para jugar/probar, usa preferentemente la URL de GitHub Pages. Para editar desde el iPad, usa StackBlitz.

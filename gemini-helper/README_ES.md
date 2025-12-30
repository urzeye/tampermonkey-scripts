# Gemini-helper

> Gemini Helper: Gestión y exportación de conversaciones, navegación por esquema, gestión de prompts, mejoras de pestañas (estado/privacidad/notificación), historial de lectura y restauración, ancla bidireccional/manual, eliminación de marca de agua, corrección de negritas, copia de fórmulas/tablas, bloqueo de modelo, embellecimiento de página, cambio de tema, modo oscuro inteligente (Gemini/Gemini Enterprise)

🌐 **Idioma**: [简体中文](README.md) | [English](README_EN.md) | [日本語](README_JA.md) | [한국어](README_KO.md) | [Deutsch](README_DE.md) | [Français](README_FR.md) | **Español** | [Português](README_PT.md) | [Русский](README_RU.md)

## ✨ Características

### 📝 Gestión de Prompts

- **Inserción rápida**: Insertar con un clic prompts frecuentemente usados en el chat
- **Gestión de categorías**: Filtrar, renombrar y eliminar categorías
- **Función de búsqueda**: Encontrar rápidamente los prompts que necesitas
- **Operaciones CRUD**: Personalizar y gestionar tu biblioteca de prompts
- **Función de copia**: Copiar con un clic el contenido del prompt al portapapeles
- **Arrastrar y ordenar**: Ajustar libremente el orden de visualización de prompts

### 📁 Gestión de Conversaciones

- **Archivo de carpetas**: Crear carpetas personalizadas para organizar el historial de chat
- **Etiquetas multicolor**: Más de 30 colores tradicionales chinos, soporta colores personalizados y gestión multi-etiqueta
- **Búsqueda en tiempo real**: Filtro rápido por título, soporta filtrado por combinación de etiquetas
- **Operaciones por lotes**: Multi-selección para eliminación, movimiento y archivo en lote
- **Exportar conversación**: Exportar a formato Markdown/JSON/TXT, imágenes convertibles a Base64
- **Sincronización fluida**: Sincronización automática de los últimos datos desde la barra lateral de Gemini (compatible con Standard/Enterprise)

### 📑 Navegación por Esquema

- **Extracción automática**: Extraer estructura de encabezados de respuestas IA (soporta Standard y Enterprise Shadow DOM)
- **Agrupación de consultas de usuario**: Agrupar esquema por turnos de conversación, consultas de usuario como encabezados de grupo (icono 💬)
- **Sangría inteligente**: Ajuste automático de sangría según el nivel más alto para reducir espacio en blanco izquierdo
- **Salto rápido**: Clic en elemento del esquema para desplazamiento suave y resaltado por 2 segundos
- **Desplazamiento sincronizado**: Resaltado automático del elemento del esquema correspondiente al desplazarse la página (conmutable en configuración)
- **Filtro de nivel**: Configurar visualización de nivel de encabezado, Nivel 0 para colapsar rápidamente solo a consultas de usuario
- **Control de alternancia**: Ocultar automáticamente pestaña de esquema cuando está desactivado

### 🚀 Navegación Rápida

- **Saltar al principio/final**: Posicionamiento rápido en conversaciones largas
- **Grupo de botones flotantes**: Accesible incluso cuando el panel está colapsado

### 📐 Ancho de Página

- **Ancho personalizado**: Soporta unidades de píxeles (px) y porcentaje (%)
- **Aplicación instantánea**: Aplicar inmediatamente después del ajuste, sin necesidad de actualizar
- **Configuración independiente**: Diferentes configuraciones para diferentes sitios

### ⚓ Sistema de Posicionamiento Inteligente

Dos sistemas independientes de registro de posición:

- **Historial de lectura (Reading Progress)**:
  - "Memoria de progreso de lectura" a largo plazo, soporta restauración entre actualizaciones/sesiones
  - Registro automático al desplazarse, persistido en GM_storage
  - Restauración automática al cargar página o cambiar conversación

- **Ancla Bidireccional**:
  - "Punto de retorno" a corto plazo, similar a retroceder en navegador o `git switch -`
  - Guardar automáticamente posición actual al hacer clic en botones esquema/arriba/abajo
  - Soporta alternancia ida y vuelta entre dos posiciones

### 🏷️ Mejoras de Pestañas

- **Visualización de estado de generación**: Mostrar automáticamente icono ⏳ (generando) o ✅ (completado) en el título de pestaña
- **Formato de título personalizado**: Soporta combinaciones de marcador de posición `{status}{title}[{model}]`
- **Modo Privacidad (Tecla Jefe)**: Disfrazar con un clic el título de pestaña como "Google", ocultar contenido de conversación
- **Notificación de finalización**: Enviar notificación de escritorio cuando la generación en segundo plano se complete
- **Enfoque automático de ventana**: Traer automáticamente la ventana del navegador al frente cuando la generación se complete

### ⚙️ Panel de Configuración

- **Cambio de pestaña**: Tres pestañas - Prompts, Esquema, Configuración
- **Configuración del panel**: Personalizar expandido/colapsado por defecto, ocultar automáticamente al clic exterior
- **Corrección de entrada china**: Interruptor opcional para corregir problema del primer carácter en Enterprise
- **Cambio de idioma**: Soporta Chino simplificado/Chino tradicional/Inglés

### 🎯 Adaptación Inteligente

- ✅ Gemini Standard (gemini.google.com)
- ✅ Gemini Enterprise (business.gemini.google)

### 🌓 Modo Oscuro Automático

- **Detección inteligente**: Seguimiento en tiempo real del cambio de modo claro/oscuro del sistema/página
- **Adaptación completa**: Esquema de colores del tema oscuro cuidadosamente ajustado, cómodo para los ojos

### 📋 Asistencia de Contenido

- **Copia de fórmula con doble clic**: Doble clic en fórmula matemática para copiar fuente LaTeX, agregar delimitadores automáticamente
- **Copia de tabla Markdown**: Agregar botón de copia en la esquina superior derecha de la tabla, copia directa en formato Markdown
- **Eliminación de marca de agua**: Eliminar automáticamente marca de agua NanoBanana de imágenes generadas por Gemini AI
- **Ajuste al borde**: Ocultar automáticamente al arrastrar panel al borde de la pantalla, mostrar al pasar el cursor
- **Ancla manual**: Establecer/volver/borrar posición de ancla con barra de herramientas rápida

## 📸 Vista Previa

- Panel flotante en el lado derecho, soporta arrastrar y mover (experiencia optimizada, sin selección accidental de texto)
- Tema degradado, apariencia hermosa
- Barra flotante muestra prompt actual, soporta borrado con un clic

![Conversaciones](https://raw.githubusercontent.com/urzeye/tampermonkey-scripts/refs/heads/main/gemini-helper/images/gemini-helper-6.png)

## 🔧 Uso

1. Instalar extensión de navegador Tampermonkey
2. Instalar este script
3. Abrir página de Gemini, el panel de gestión de prompts aparece en el lado derecho
4. Hacer clic en prompt para insertar rápidamente

## ⌨️ Operaciones Rápidas

| Operación | Descripción |
| --- | --- |
| Clic en prompt | Insertar en cuadro de entrada |
| 📋 Botón copiar | Copiar contenido del prompt |
| ☰ Manejador de arrastre | Arrastrar para ajustar orden |
| ✏ Botón editar | Editar prompt |
| 🗑 Botón eliminar | Eliminar prompt |
| ⚙ Gestión de categorías | Renombrar/eliminar categoría |
| Clic botón × | Borrar contenido insertado |
| Enter para enviar | Ocultar automáticamente barra flotante |
| Botones ⬆ / ⬇ | Saltar al principio/final de página |

## 🐛 Comentarios

Para problemas o sugerencias, por favor proporcione comentarios en [GitHub Issues](https://github.com/urzeye/tampermonkey-scripts/issues)

## 📄 Licencia

MIT License

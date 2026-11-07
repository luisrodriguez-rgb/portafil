/**
 * Módulo y Widget Web Component de Compañeros (MySkin × Portafil)
 * Funciona en navegador (<portafil-companion> + window.PortafilCompanion) y en Node.js (require).
 * Incluye el catálogo completo de las 53 skins (15 originales + 38 tributos), sus diálogos,
 * máquina de estados reactiva a GitHub, generadores de código y el Custom Element interactivo.
 */
(function (root) {
  "use strict";

  const SKINS = [
  {
    "id": "capybara",
    "name": "Capibara",
    "fullName": "Capibara Chill (El Favorito de Internet)",
    "category": "mascotas",
    "isOriginal": true,
    "detail": "Un paso a la vez.",
    "dialogues": {
      "alert": "Amigo, no te estreses, pero hay que entregar eso. Todo va a salir bien, solo dale push.",
      "victory": "Muy bien hecho. Ahora me voy a dar un baño calientito en el jacuzzi.",
      "focus": "La calma lo resuelve todo. Respira profundo y programa despacio.",
      "break": "Momento de contemplar la nada y comer una fruta fresca.",
      "sleep": "Dormir es sagrado. Aquí me quedo tranquilo como capibara al sol..."
    }
  },
  {
    "id": "labrador-retriever",
    "name": "Labrador",
    "fullName": "Labrador Retriever",
    "category": "mascotas",
    "isOriginal": true,
    "detail": "Compañero leal y alegre.",
    "dialogues": {
      "alert": "¡Guau! Parece que tienes una entrega pendiente. ¡Vamos juntos, tú puedes!",
      "victory": "¡Sí! ¡Pelota de tenis para celebrar! Excelente trabajo, amigo humano.",
      "focus": "Me quedo aquí echadito a tus pies sin hacer ruido mientras te concentras.",
      "break": "¡Hora de estirar las patas! Un paseo corto nos vendría genial a los dos.",
      "sleep": "Zzz... roncando suavemente en la alfombra al lado de tu escritorio."
    }
  },
  {
    "id": "little-girl",
    "name": "Lily",
    "fullName": "Lily Estudiante",
    "category": "mascotas",
    "isOriginal": true,
    "detail": "Curiosa y aplicada.",
    "dialogues": {
      "alert": "¡Oye! No olvides revisar el campus virtual, hay una tarea por entregar.",
      "victory": "¡Lo logramos! ¡Puse una estrellita dorada en nuestro cuaderno de metas!",
      "focus": "Silencio de biblioteca: lápiz afilado y mente brillante.",
      "break": "Vamos por un jugo o un snack dulce antes de continuar.",
      "sleep": "Abrazo a mi osito y a dormir temprano para tener energía mañana."
    }
  },
  {
    "id": "cat-mystic",
    "name": "Gato Negro",
    "fullName": "Gato Negro",
    "category": "mascotas",
    "isOriginal": true,
    "detail": "Pasos sigilosos y calma reconfortante.",
    "dialogues": {
      "alert": "Miau suave: una notificación importante ha aparecido en el radar.",
      "victory": "Ronroneo profundo y salto ágil de felicitación.",
      "focus": "Amasando tu atención con patitas suaves para que nada te perturbe.",
      "break": "Momento de estirar el lomo y mirar por la ventana.",
      "sleep": "Hecho una bolita cálida junto al teclado... zzz..."
    }
  },
  {
    "id": "shiba-inu",
    "name": "Shiba Inu",
    "fullName": "Shiba Inu",
    "category": "mascotas",
    "isOriginal": true,
    "detail": "Guardián leal y sonrisa amistosa.",
    "dialogues": {
      "alert": "¡Guau! Orejitas atentas: tienes una clase o tarea próxima.",
      "victory": "Giro en círculo alegre con cola enroscada. ¡Muy bien hecho!",
      "focus": "Postura erguida de guardián leal a tu lado.",
      "break": "Una caricia en el lomo y un paseo breve para despejar.",
      "sleep": "Hocico apoyado en las patas delanteras descansando en paz."
    }
  },
  {
    "id": "panda-zen",
    "name": "Panda Zen",
    "fullName": "Panda Zen",
    "category": "mascotas",
    "isOriginal": true,
    "detail": "Paz mental y cero estrés.",
    "dialogues": {
      "alert": "Respira hondo: esa entrega se resolverá con serenidad paso a paso.",
      "victory": "¡Bambú de la victoria! Gran avance conseguido sin agobios.",
      "focus": "Mente despejada como un bosque de montaña.",
      "break": "Un refrigerio nutritivo y un respiro reconfortante.",
      "sleep": "Zzz... rodando suavemente en la hierba en calma total."
    }
  },
  {
    "id": "arctic-penguin",
    "name": "Pingüino Antártico",
    "fullName": "Pingüino Antártico",
    "category": "mascotas",
    "isOriginal": true,
    "detail": "Deslízate sobre cada entrega.",
    "dialogues": {
      "alert": "¡Aleteo de alerta! El reloj avanza en tu entrega programada.",
      "victory": "¡Deslizamiento triunfal sobre el hielo con aletas al viento!",
      "focus": "Acomodando la bufanda y mirando tus notas con atención.",
      "break": "Un chapuzón refrescante para aclarar las ideas.",
      "sleep": "Acurrucado en el grupo polar en cálido descanso."
    }
  },
  {
    "id": "spiderman",
    "name": "Spider-Hero",
    "fullName": "Spider-Hero (El Trepamuros)",
    "category": "heroes",
    "isOriginal": false,
    "detail": "Tu sentido del foco.",
    "dialogues": {
      "alert": "Oye, mi sentido arácnido dice que ese deadline está cerca. ¿Nos movemos o qué?",
      "victory": "¡Boom! Ese PR quedó atrapado en mi telaraña sin un solo bug.",
      "focus": "Modo concentración arácnido. Nada de redes sociales por 25 minutos.",
      "break": "Tiempo fuera, amigo. Suelta el teclado antes de que se te peguen los dedos.",
      "sleep": "Si me necesitas... estaré colgando de mi telaraña descansando..."
    }
  },
  {
    "id": "captain-america",
    "name": "Capitán América",
    "fullName": "Capitán América",
    "category": "heroes",
    "isOriginal": false,
    "detail": "Disciplina inquebrantable.",
    "dialogues": {
      "alert": "¡Equipo, atención! Plazo detectado. Mantengamos la formación y avancemos.",
      "victory": "Podría hacer esto todo el día. Gran avance completado con honor.",
      "focus": "Escudo al frente y concentración total. Ningún bug pasará esta línea.",
      "break": "Cinco minutos de reagrupamiento táctico. Respiremos hondo.",
      "sleep": "Misión cumplida por hoy. A descansar, soldado; te lo has ganado."
    }
  },
  {
    "id": "iron-man",
    "name": "Iron Man",
    "fullName": "Iron Man",
    "category": "heroes",
    "isOriginal": false,
    "detail": "Ingenio tecnológico al máximo.",
    "dialogues": {
      "alert": "JARVIS detectó una entrega en el radar. Hora de ponerse la armadura.",
      "victory": "Soy Iron Man. Y este código funciona con un 3000% de eficiencia.",
      "focus": "Reactor Arc al 100%. Calibrando algoritmos y quemando problemas.",
      "break": "Tregua para una hamburguesa con queso mientras se enfrían los propulsores.",
      "sleep": "Activando protocolo de recarga nocturna. No toques nada sin mí."
    }
  },
  {
    "id": "thor-odinson",
    "name": "Thor Odinson",
    "fullName": "Thor Odinson",
    "category": "heroes",
    "isOriginal": false,
    "detail": "El poder del trueno.",
    "dialogues": {
      "alert": "¡Por Odín! Una batalla académica se aproxima en el horizonte.",
      "victory": "¡Otro triunfo digno del Valhalla! ¡Traed hidromiel para celebrar!",
      "focus": "Mjölnir reposa sereno mientras forjamos soluciones con la mente.",
      "break": "Un festín asgardiano breve antes de que vuelva a rugir la tormenta.",
      "sleep": "Que los vientos de Asgard cuiden tu descanso hasta el amanecer."
    }
  },
  {
    "id": "batman-detective",
    "name": "Batman",
    "fullName": "Batman",
    "category": "heroes",
    "isOriginal": false,
    "detail": "Estrategia y disciplina en las sombras.",
    "dialogues": {
      "alert": "La Batiseñal está en el cielo: una entrega requiere tu intervención inmediata.",
      "victory": "Caso cerrado. Gotham y tu repositorio descansan tranquilos.",
      "focus": "Analizando patrones en la Batcomputadora. Ningún error escapa.",
      "break": "Una ronda de vigilancia silenciosa antes de reanudar.",
      "sleep": "Vigilancia en modo automático desde las sombras de la Baticueva."
    }
  },
  {
    "id": "superman-man-of-steel",
    "name": "Superman",
    "fullName": "Superman",
    "category": "heroes",
    "isOriginal": false,
    "detail": "Nobleza y poder para cada desafío.",
    "dialogues": {
      "alert": "Puedo oír la alarma desde Metrópolis: hay una tarea que necesita tu atención.",
      "victory": "¡Arriba, arriba y adelante! Objetivo superado con honor.",
      "focus": "Visión de rayos X aplicada a la detección de soluciones.",
      "break": "Tomando energía de la luz solar para volver con más vigor.",
      "sleep": "Descanso sereno en la Fortaleza de la Soledad."
    }
  },
  {
    "id": "harry-potter",
    "name": "Harry Potter",
    "fullName": "Harry Potter",
    "category": "cine",
    "isOriginal": false,
    "detail": "Enfocado en la Snitch Dorada.",
    "dialogues": {
      "alert": "¡Atento al pergamino! Una entrega vuela hacia ti a la velocidad de una Snitch.",
      "victory": "¡Cincuenta puntos para Gryffindor! Merge perfecto sin un solo maleficio.",
      "focus": "Varita firme y mente despejada. Hora de conjurar avances extraordinarios.",
      "break": "Una cerveza de manteca en las Tres Escobas para reponer energías.",
      "sleep": "El mapa merodeador vigilará el escritorio mientras descansamos."
    }
  },
  {
    "id": "lord-voldemort",
    "name": "Lord Voldemort",
    "fullName": "Lord Voldemort",
    "category": "cine",
    "isOriginal": false,
    "detail": "Determinación solemne.",
    "dialogues": {
      "alert": "El tiempo no perdona a los débiles. Completa esa tarea de inmediato.",
      "victory": "La grandeza no se concede; se toma. Tu código ha prevalecido sin rival.",
      "focus": "Silencio absoluto. Conjurando líneas de poder implacable.",
      "break": "Una breve tregua. No te confíes, la excelencia exige vigilancia constante.",
      "sleep": "Incluso la magia más oscura requiere que las sombras se recarguen."
    }
  },
  {
    "id": "fantasy-wizard",
    "name": "Mago",
    "fullName": "Mago de Fantasía (El Hechicero)",
    "category": "cine",
    "isOriginal": true,
    "detail": "Haz espacio a la magia.",
    "dialogues": {
      "alert": "Las runas del semestre auguran peligro... ¡Haz esa entrega antes de que el tiempo se desvanezca!",
      "victory": "¡Por los fuegos de Arcania! El hechizo de compilación ha triunfado.",
      "focus": "Canalizando maná de concentración sobre el pergamino digital.",
      "break": "El maná requiere reposo. Cierra los grimorios unos minutos.",
      "sleep": "Soñando con constelaciones y bibliotecas antiguas..."
    }
  },
  {
    "id": "spartan",
    "name": "Leónidas",
    "fullName": "Leónidas (El Espartano de 300)",
    "category": "cine",
    "isOriginal": true,
    "detail": "Disciplina para tu día.",
    "dialogues": {
      "alert": "¡A las armas! Tienes 1 hora para tu entrega o el semestre caerá.",
      "victory": "¡Ahú, Ahú! Pull Request mezclado con honor espartano.",
      "focus": "¡Posiciones de falange! 25 minutos de estudio inquebrantable.",
      "break": "Descanso merecido, guerrero. Bebe agua y afila tu lanza.",
      "sleep": "Recuperando fuerzas para la proxima batalla academica..."
    }
  },
  {
    "id": "astro-lost",
    "name": "Astronauta",
    "fullName": "Astronauta Perdido (Explorador Espacial)",
    "category": "cine",
    "isOriginal": true,
    "detail": "Explora lo que sigue.",
    "dialogues": {
      "alert": "Houston, tenemos un problema si no entregas eso pronto... ¡Iniciemos la secuencia de push!",
      "victory": "¡Alunizaje exitoso! Bandera plantada en la rama principal del repositorio.",
      "focus": "Protocolo de navegación orbital activo. Cero interferencias por 25 minutos.",
      "break": "Saliendo a caminata espacial de descompresión.",
      "sleep": "Soporte vital en standby. Flotando en gravedad cero..."
    }
  },
  {
    "id": "darth-vader",
    "name": "Darth Vader",
    "fullName": "Darth Vader",
    "category": "cine",
    "isOriginal": false,
    "detail": "Dominio imperial de la productividad.",
    "dialogues": {
      "alert": "Siento una perturbación en el calendario. Atiende esa entrega.",
      "victory": "El poder del lado oscuro de la productividad es indiscutible.",
      "focus": "Tu falta de distracción es reconfortante.",
      "break": "Una pausa breve en la cámara de meditación.",
      "sleep": "Respiración pausada... la flota imperial permanece alerta."
    }
  },
  {
    "id": "master-yoda",
    "name": "Maestro Yoda",
    "fullName": "Maestro Yoda",
    "category": "cine",
    "isOriginal": false,
    "detail": "Hacer o no hacer, no hay intentar.",
    "dialogues": {
      "alert": "Hacer o no hacer, no existe el intentar. Esa entrega realizar debes.",
      "victory": "Gran logro conseguido has. Que la Fuerza te acompañe siempre.",
      "focus": "Despejada tu mente mantener debes. Fluye la Fuerza en ti.",
      "break": "Un té de raíces y una pausa breve tomar debemos.",
      "sleep": "Zzz... en Dagobah el descanso encontraré."
    }
  },
  {
    "id": "gandalf-grey",
    "name": "Gandalf el Gris",
    "fullName": "Gandalf el Gris",
    "category": "cine",
    "isOriginal": false,
    "detail": "Sabiduría y luz en cada entrega.",
    "dialogues": {
      "alert": "Un mago nunca llega tarde, ni pronto: llega exactamente cuando se propone cumplir.",
      "victory": "¡Victoria! El paso ha quedado despejado de obstáculos.",
      "focus": "El fuego secreto de la concentración ilumina este escritorio.",
      "break": "Una pipa de hierba para pipa y un momento de reflexión.",
      "sleep": "Descanso breve antes de cruzar las siguientes montañas."
    }
  },
  {
    "id": "cyber-ninja",
    "name": "Cyber Ninja",
    "fullName": "Cyber Ninja (Acción y Sigilo)",
    "category": "anime",
    "isOriginal": true,
    "detail": "Entra en tu zona.",
    "dialogues": {
      "alert": "El objetivo de tu semestre está a la vista. Ejecuta el ataque sin dejar rastro de bugs.",
      "victory": "Misión cumplida en las sombras. El repositorio está a salvo.",
      "focus": "Silencio absoluto. Katana envainada y código certero.",
      "break": "Retirada táctica temporal. Respira y vigila el entorno.",
      "sleep": "Modo camuflaje óptico activado. Vigilando en modo reposo..."
    }
  },
  {
    "id": "son-goku",
    "name": "Son Goku",
    "fullName": "Son Goku",
    "category": "anime",
    "isOriginal": false,
    "detail": "Supera cada límite.",
    "dialogues": {
      "alert": "¡Siento una energía aproximándose! Es momento de ponernos en guardia con tus pendientes.",
      "victory": "¡Lo logramos! ¡Superamos el límite con este merge!",
      "focus": "Entrenando la concentración. Acumulando Ki para resolver cada línea de código.",
      "break": "Una pausa para comer y recargar energías antes de la siguiente ronda.",
      "sleep": "A descansar un rato... mañana volvemos a entrenar al máximo."
    }
  },
  {
    "id": "vegeta-prince",
    "name": "Príncipe Vegeta",
    "fullName": "Príncipe Vegeta",
    "category": "anime",
    "isOriginal": false,
    "detail": "Orgullo y disciplina Saiyajin.",
    "dialogues": {
      "alert": "¡No te descuides, insecto! Esa entrega no se va a completar sola.",
      "victory": "Un resultado digno de la realeza Saiyajin. Bien hecho.",
      "focus": "Cámara de gravedad activada. Cero distracciones.",
      "break": "Un descanso táctico. No te acostumbres a bajar la guardia.",
      "sleep": "Descanso breve. Un verdadero guerrero siempre está listo."
    }
  },
  {
    "id": "naruto-uzumaki",
    "name": "Naruto Uzumaki",
    "fullName": "Naruto Uzumaki",
    "category": "anime",
    "isOriginal": false,
    "detail": "Camino ninja sin rendirse.",
    "dialogues": {
      "alert": "¡Deberas! Hay una misión urgente en tu pergamino de tareas.",
      "victory": "¡Ese es mi camino ninja! Merge exitoso sin dudar jamás.",
      "focus": "Entrenando el control de chakra para mantener el foco en la tarea.",
      "break": "¡Hora de un tazón de ramen para reponer fuerzas!",
      "sleep": "Cerrando los ojos... soñando con ser Hokage."
    }
  },
  {
    "id": "monkey-d-luffy",
    "name": "Monkey D. Luffy",
    "fullName": "Monkey D. Luffy",
    "category": "anime",
    "isOriginal": false,
    "detail": "Rumbo al Rey de los Desarrolladores.",
    "dialogues": {
      "alert": "¡Tierra a la vista! Prepárate, tenemos una entrega importante navegando hacia acá.",
      "victory": "¡Sugoiii! ¡Un commit legendario digno del Grand Line!",
      "focus": "Concentrándome al máximo... ¡para después celebrar con un gran banquete!",
      "break": "¡Carne! Necesito un refrigerio antes de seguir navegando.",
      "sleep": "Zzz... roncando feliz con el sombrero bien puesto."
    }
  },
  {
    "id": "roronoa-zoro",
    "name": "Roronoa Zoro",
    "fullName": "Roronoa Zoro",
    "category": "anime",
    "isOriginal": false,
    "detail": "Corte certero a cada tarea.",
    "dialogues": {
      "alert": "No pierdas el rumbo. Hay una entrega frente a nosotros.",
      "victory": "Corte perfecto. Nada se interpone ante el objetivo.",
      "focus": "Meditación de espadas. Mente afilada como el acero.",
      "break": "Momento de afilar las hojas y despejar la mente.",
      "sleep": "Siesta reparadora. Despiértame si hay acción."
    }
  },
  {
    "id": "satoru-gojo",
    "name": "Satoru Gojo",
    "fullName": "Satoru Gojo",
    "category": "anime",
    "isOriginal": false,
    "detail": "Vacío Infinito contra distracciones.",
    "dialogues": {
      "alert": "Tranquilo, yo me encargo de vigilar el tiempo. Tienes una entrega pronto.",
      "victory": "Demasiado fácil. Nuestro trabajo es impecable, después de todo soy el más fuerte.",
      "focus": "Activando Vacío Infinito: toda distracción se detiene antes de alcanzarnos.",
      "break": "Vamos por unos dulces para endulzar la jornada.",
      "sleep": "Descanso total. El infinito mantendrá todo a salvo."
    }
  },
  {
    "id": "tanjiro-kamado",
    "name": "Tanjiro Kamado",
    "fullName": "Tanjiro Kamado",
    "category": "anime",
    "isOriginal": false,
    "detail": "Respiración de concentración total.",
    "dialogues": {
      "alert": "Puedo oler la fecha límite acercándose. Mantengamos la calma y el paso firme.",
      "victory": "¡Respiración del Agua, forma final! Trabajo completado con honor.",
      "focus": "Inhalar hondo, exhalar con calma. Respiración de concentración total.",
      "break": "Un té caliente para calmar el cuerpo y seguir adelante.",
      "sleep": "Un sueño tranquilo para recuperar todas las fuerzas."
    }
  },
  {
    "id": "nezuko-kamado",
    "name": "Nezuko Kamado",
    "fullName": "Nezuko Kamado",
    "category": "anime",
    "isOriginal": false,
    "detail": "Compañera leal y protectora.",
    "dialogues": {
      "alert": "¡Mmmh! Señal de que una entrega importante requiere tu atención.",
      "victory": "¡Mmh mmh! Victoria impecable, todo quedó en orden.",
      "focus": "Acompañándote en silencio y cuidando que nada interrumpa tu tranquilidad.",
      "break": "Momento de estirar las piernas y tomar aire fresco.",
      "sleep": "Mmh... descansando en mi cajita protegida."
    }
  },
  {
    "id": "saitama-hero",
    "name": "Saitama",
    "fullName": "Saitama",
    "category": "anime",
    "isOriginal": false,
    "detail": "Resuelve de un solo golpe.",
    "dialogues": {
      "alert": "Oye, revisa el reloj... hay una entrega pendiente y hoy son las ofertas del súper.",
      "victory": "Listo. Resuelto de un solo golpe sin sudar.",
      "focus": "Leyendo el catálogo de ofertas mientras dejas el código terminado.",
      "break": "Un té y descanso, no te compliques demasiado.",
      "sleep": "Zzz... durmiendo plácidamente."
    }
  },
  {
    "id": "levi-ackerman",
    "name": "Capitán Levi",
    "fullName": "Capitán Levi",
    "category": "anime",
    "isOriginal": false,
    "detail": "Cero suciedad, precisión letal.",
    "dialogues": {
      "alert": "Esa entrega está a la vista. No permitas que un descuido arruine la operación.",
      "victory": "El área está limpia y el código en orden. Buen trabajo.",
      "focus": "Cero suciedad, cero distracciones. Concentración absoluta.",
      "break": "Una taza de té negro sujetada como corresponde.",
      "sleep": "Descanso breve sentado en la silla. Listos para el siguiente despliegue."
    }
  },
  {
    "id": "dev-avatar",
    "name": "Tu avatar",
    "fullName": "Mi Avatar Pixelado (Tú Mismo)",
    "category": "gaming",
    "isOriginal": true,
    "detail": "Tu siguiente gran idea.",
    "dialogues": {
      "alert": "¡No puede ser! ¿Esa entrega es para hoy? Dame otro café ya mismo.",
      "victory": "¡Uff, menos mal que pusimos ese commit! Una victoria más para el portafolio.",
      "focus": "Audífonos puestos, terminal abierta. Modo foco total.",
      "break": "Pausa para estirar la espalda y rellenar la taza de café.",
      "sleep": "Me quedé dormido sobre el teclado... zZ..."
    }
  },
  {
    "id": "ghost-dev",
    "name": "Dev fantasma",
    "fullName": "El Dev Fantasma (Especial de Código)",
    "category": "gaming",
    "isOriginal": true,
    "detail": "Código con compañía.",
    "dialogues": {
      "alert": "He visto muchos bugs en el más allá, pero esta entrega de verdad te va a perseguir.",
      "victory": "¡Magia espectral! El pipeline pasó en verde en la primera ejecución.",
      "focus": "Invocando código limpio desde las profundidades del kernel.",
      "break": "Flotando un rato fuera del plano material para despejar la memoria RAM.",
      "sleep": "Desvaneciéndome en la niebla espectral hasta el próximo commit..."
    }
  },
  {
    "id": "game-slime",
    "name": "Slime",
    "fullName": "Slime de Videojuego (La Mascota Rebotadora)",
    "category": "gaming",
    "isOriginal": true,
    "detail": "Pequeños pasos suman.",
    "dialogues": {
      "alert": "*Plop, plop* ¡Vamos! ¡Tú puedes con esa tarea! ¡Mucho ánimo!",
      "victory": "*¡Boing!* ¡Subimos de nivel! ¡Tres slimes felices rebotando por ti!",
      "focus": "*Squish* Me vuelvo un cubito concentrado para acompañarte a estudiar.",
      "break": "*Plop* ¡Hora de estirarse como chicle y tomar agüita!",
      "sleep": "*Squelch* Me derrito en un charquito suavecito a descansar..."
    }
  },
  {
    "id": "super-mario",
    "name": "Super Mario",
    "fullName": "Super Mario",
    "category": "gaming",
    "isOriginal": false,
    "detail": "Here we go! Al siguiente nivel.",
    "dialogues": {
      "alert": "¡Mamma mia! Tienes una entrega urgente que requiere un salto preciso.",
      "victory": "¡Here we go! Nivel superado y objetivos cumplidos.",
      "focus": "Golpeando bloques y recolectando monedas de concentración.",
      "break": "Una pausa para tomar un champiñón verde de energía.",
      "sleep": "Zzz... soñando con castillos y estrellas."
    }
  },
  {
    "id": "link-hero",
    "name": "Link (Héroe del Tiempo)",
    "fullName": "Link (Héroe del Tiempo)",
    "category": "gaming",
    "isOriginal": false,
    "detail": "Espada Maestra y concentración.",
    "dialogues": {
      "alert": "Escucha las campanas del templo: una entrega importante te espera.",
      "victory": "¡Sonido de cofre dorado! Desafío resuelto con éxito.",
      "focus": "Tocando la Canción del Tiempo para multiplicar el enfoque.",
      "break": "Reponiendo corazones junto a una fuente de hadas.",
      "sleep": "Descansando en paz con la Espada Maestra en su pedestal."
    }
  },
  {
    "id": "pikachu-electric",
    "name": "Pikachu",
    "fullName": "Pikachu",
    "category": "gaming",
    "isOriginal": false,
    "detail": "Energía eléctrica para tu jornada.",
    "dialogues": {
      "alert": "¡Pika-pika! Alerta de clase o entrega acercándose.",
      "victory": "¡Pikachu! ¡Impactrueno de celebración por esa tarea terminada!",
      "focus": "Cargando baterías y manteniendo la energía al 100%.",
      "break": "Comiendo una baya para recuperar vitalidad.",
      "sleep": "Pika... zzz... chispitas suaves de descanso."
    }
  },
  {
    "id": "sonic-hedgehog",
    "name": "Sonic the Hedgehog",
    "fullName": "Sonic the Hedgehog",
    "category": "gaming",
    "isOriginal": false,
    "detail": "Resolución a la velocidad del sonido.",
    "dialogues": {
      "alert": "¡Demasiado lento! Vamos a resolver esa entrega a la velocidad del sonido.",
      "victory": "¡Pan comido! Vuelta triunfal y pulgar arriba.",
      "focus": "Concentración supersónica. Ningún bug corre más rápido que yo.",
      "break": "Un chili dog rápido antes de la siguiente zona.",
      "sleep": "Recargando los turbos para la próxima carrera."
    }
  },
  {
    "id": "kirby-dream",
    "name": "Kirby",
    "fullName": "Kirby",
    "category": "gaming",
    "isOriginal": false,
    "detail": "Inhala distracciones, exhala foco.",
    "dialogues": {
      "alert": "¡Poyo! Tienes una notificación que necesita tu atención.",
      "victory": "¡Baile de Kirby con estrellitas mágicas de felicidad!",
      "focus": "Inhalando distracciones y transformándolas en foco total.",
      "break": "Un trozo de tarta de fresa para celebrar los avances.",
      "sleep": "Zzz... flotando suavemente en una nube estrella."
    }
  },
  {
    "id": "mega-man-blue",
    "name": "Mega Man",
    "fullName": "Mega Man",
    "category": "gaming",
    "isOriginal": false,
    "detail": "Precisión de Buster y disciplina robótica.",
    "dialogues": {
      "alert": "Señales de entrega detectadas en los sensores del sistema.",
      "victory": "¡Misión completada! Nueva habilidad de concentración adquirida.",
      "focus": "Cargando el Mega Buster al máximo poder analítico.",
      "break": "Enfriando circuitos y optimizando memoria de trabajo.",
      "sleep": "Entrando en modo stand-by para mantenimiento preventivo."
    }
  },
  {
    "id": "master-chief-117",
    "name": "Master Chief",
    "fullName": "Master Chief",
    "category": "gaming",
    "isOriginal": false,
    "detail": "Misión prioritaria, foco inquebrantable.",
    "dialogues": {
      "alert": "Objetivo marcado en el HUD: entrega próxima a su límite.",
      "victory": "Misión cumplida. El objetivo ha sido neutralizado con éxito.",
      "focus": "Escudos al máximo, miras alineadas y foco total.",
      "break": "Breve chequeo de armadura y recarga táctica.",
      "sleep": "Descanso en guardia. Listo para reanudar el combate."
    }
  },
  {
    "id": "kratos-war",
    "name": "Kratos",
    "fullName": "Kratos",
    "category": "gaming",
    "isOriginal": false,
    "detail": "Hacha en mano, cero excusas.",
    "dialogues": {
      "alert": "¡Muchacho! Una tarea requiere tu atención inmediata. No flaquees.",
      "victory": "El trabajo está hecho. Que los dioses tomen nota de tu temple.",
      "focus": "Afilando el hacha y templando la mente contra la distracción.",
      "break": "Descanso breve. La debilidad no es una opción.",
      "sleep": "Cierro los ojos, pero mi guardia permanece alerta."
    }
  },
  {
    "id": "sans-undertale",
    "name": "Sans el Esqueleto",
    "fullName": "Sans el Esqueleto",
    "category": "gaming",
    "isOriginal": false,
    "detail": "Sonrisa relajada y foco inesperado.",
    "dialogues": {
      "alert": "¿vas a dejar esa entrega para después? vas a pasar un mal rato, chico.",
      "victory": "vaya, lo lograste sin sudar un hueso. buen trabajo.",
      "focus": "tomándome las cosas en serio... por una vez.",
      "break": "hora de una siesta en el puesto de perritos calientes.",
      "sleep": "zzz... no me despiertes a menos que haya salsa tártara."
    }
  },
  {
    "id": "steve-craft",
    "name": "Steve",
    "fullName": "Steve",
    "category": "gaming",
    "isOriginal": false,
    "detail": "Bloque a bloque, construyendo logros.",
    "dialogues": {
      "alert": "Cuidado con el reloj: una entrega se acerca antes de que caiga la noche.",
      "victory": "¡Mineral de diamante extraído! Tarea completada con éxito.",
      "focus": "Bloque a bloque, construyendo soluciones sólidas.",
      "break": "Comiendo una manzana dorada para restaurar corazones.",
      "sleep": "Durmiendo en la cama para pasar la noche sin sobresaltos."
    }
  },
  {
    "id": "bugs-bunny",
    "name": "Bugs Bunny",
    "fullName": "Bugs Bunny",
    "category": "cartoons",
    "isOriginal": false,
    "detail": "¿Qué hay de nuevo, viejo?",
    "dialogues": {
      "alert": "¿Qué hay de nuevo, viejo? Parece que se acerca la hora de entregar eso.",
      "victory": "¡Eso es to, eso es to, eso es todo amigos! ¡Victoria limpia de campeonato!",
      "focus": "Mascando mi zanahoria mientras tú resuelves los problemas difíciles.",
      "break": "Momento de un descanso en Albuquerque antes de seguir el camino.",
      "sleep": "A mi madriguera a dormir como un lirón. ¡Hasta luego, viejo!"
    }
  },
  {
    "id": "spongebob-square",
    "name": "Bob Esponja",
    "fullName": "Bob Esponja",
    "category": "cartoons",
    "isOriginal": false,
    "detail": "¡Estoy listo! Pasión y foco alegre.",
    "dialogues": {
      "alert": "¡Estoy listo! ¡Estoy listo! ¡Una entrega emocionante nos llama!",
      "victory": "¡Bailando con burbujas de celebración por esa gran entrega!",
      "focus": "Concentración como haciendo una Cangreburger perfecta.",
      "break": "Hora de una pausa en el Crustáceo Cascarudo.",
      "sleep": "Zzz... contando medusas en los Campos de Medusas."
    }
  },
  {
    "id": "rick-sanchez",
    "name": "Rick Sanchez",
    "fullName": "Rick Sanchez",
    "category": "cartoons",
    "isOriginal": false,
    "detail": "Soluciones científicas interdimensionales.",
    "dialogues": {
      "alert": "Morty, digo colega, tenemos una entrega colapsando el continuo espacio-tiempo.",
      "victory": "¡Wubba Lubba Dub-Dub! Código resuelto en esta y otras dimensiones.",
      "focus": "No me hables, estoy sintetizando una solución cuántica.",
      "break": "Cinco minutos para recalibrar la pistola de portales.",
      "sleep": "Zzz... desmayado con la bata puesta en el garaje."
    }
  },
  {
    "id": "football-10",
    "name": "Futbolista 10",
    "fullName": "El Futbolista 10 (La Pulga)",
    "category": "deportes",
    "isOriginal": true,
    "detail": "Una tarea, un gol.",
    "dialogues": {
      "alert": "Falta poco para que termine el partido. Metámosle este commit y nos llevamos los tres puntos.",
      "victory": "¡Qué golazo metimos! Dedicado al cielo por este sprint completado.",
      "focus": "Cabeza fría y a jugar simple. 25 minutos de concentración táctica.",
      "break": "Minuto de hidratación. Caminá un poco que el partido sigue.",
      "sleep": "Descansando los gemelos para la final del semestre..."
    }
  },
  {
    "id": "neymar-jr",
    "name": "Neymar Jr.",
    "fullName": "Neymar Jr.",
    "category": "deportes",
    "isOriginal": false,
    "detail": "Magia y foco en cada jugada.",
    "dialogues": {
      "alert": "¡Presión alta en la salida! Hay que resolver esta entrega antes del pitazo.",
      "victory": "¡Golazo al ángulo! Baile de celebración para festejar este merge limpio.",
      "focus": "Pelota dominada. Cabeza levantada y lectura de juego perfecta.",
      "break": "Momento de hidratarse en la banca y planear la jugada del segundo tiempo.",
      "sleep": "Descanso de campeón. Mañana volvemos a la cancha con todo el talento."
    }
  },
  {
    "id": "lionel-messi",
    "name": "Lionel Messi",
    "fullName": "Lionel Messi",
    "category": "deportes",
    "isOriginal": false,
    "detail": "Magia y precisión hacia el cielo.",
    "dialogues": {
      "alert": "Vamos que queda poco tiempo. Una buena jugada y lo resolvemos.",
      "victory": "Mirando al cielo: ¡qué golazo de entrega hemos clavado!",
      "focus": "Paso a paso, pelota al pie y mirada fija en el objetivo.",
      "break": "Unos mates con calma antes del segundo tiempo.",
      "sleep": "Descansando bien para salir a ganar mañana."
    }
  },
  {
    "id": "cristiano-cr7",
    "name": "Cristiano Ronaldo",
    "fullName": "Cristiano Ronaldo",
    "category": "deportes",
    "isOriginal": false,
    "detail": "Disciplina y mentalidad Siuuu.",
    "dialogues": {
      "alert": "¡A trabajar! El talento sin disciplina no alcanza para la cima.",
      "victory": "¡Siuuu! Tarea resuelta como un tiro libre al ángulo.",
      "focus": "Dedicación 100%. Cada minuto de estudio cuenta para el récord.",
      "break": "Hidratación y estiramiento. Profesionalismo absoluto.",
      "sleep": "Recuperación muscular para seguir siendo el número uno."
    }
  },
  {
    "id": "michael-jordan-23",
    "name": "Michael Jordan",
    "fullName": "Michael Jordan",
    "category": "deportes",
    "isOriginal": false,
    "detail": "Vuelo legendario hacia la meta.",
    "dialogues": {
      "alert": "Cuarto cuarto, últimos segundos: momento de tomar el tiro decisivo.",
      "victory": "¡Canasta sobre la bocina! Campeones del semestre.",
      "focus": "Lengua afuera, bote bajo y ojos puestos en el aro.",
      "break": "Tiempo fuera pedido por el entrenador para repasar la estrategia.",
      "sleep": "Visualizando el próximo campeonato mientras descanso."
    }
  }
];

  const SKIN_MAP = Object.create(null);
  for (const s of SKINS) SKIN_MAP[s.id] = s;

  const STATE_DEFAULTS = {
    FOCUS: { row: 4, frames: 4, fps: 6, labelEs: "MODO FOCO", labelEn: "FOCUS MODE" },
    VICTORY_GITHUB: { row: 3, frames: 6, fps: 10, labelEs: "COMMIT MERGED", labelEn: "COMMIT MERGED" },
    WALK: { row: 1, frames: 6, fps: 10, labelEs: "EN PATRULLA", labelEn: "ON PATROL" },
    IDLE: { row: 0, frames: 4, fps: 6, labelEs: "EN GUARDIA", labelEn: "ON GUARD" },
    ALERT_SEMESTRE: { row: 2, frames: 4, fps: 8, labelEs: "ENTREGA PRÓXIMA", labelEn: "DEADLINE ALERT" },
    SLEEP: { row: 5, frames: 4, fps: 4, labelEs: "MODO SIESTA", labelEn: "SLEEP MODE" }
  };

  const STATES = Object.keys(STATE_DEFAULTS);

  const CATEGORIES = [
    { id: "all", labelEs: "Todas (53)", labelEn: "All (53)" },
    { id: "originals", labelEs: "★ Originales (15)", labelEn: "★ Originals (15)" },
    { id: "mascotas", labelEs: "Mascotas", labelEn: "Pets" },
    { id: "heroes", labelEs: "Superhéroes", labelEn: "Superheroes" },
    { id: "cine", labelEs: "Cine y Fantasía", labelEn: "Cinema & Fantasy" },
    { id: "anime", labelEs: "Anime", labelEn: "Anime" },
    { id: "gaming", labelEs: "Videojuegos", labelEn: "Gaming" },
    { id: "cartoons", labelEs: "Cartoons", labelEn: "Cartoons" },
    { id: "deportes", labelEs: "Deportes", labelEn: "Sports" }
  ];

  const THEMES = {
    ink: { bg: "#0e0f11", empty: "#16181c", border: "#23262c", text: "#f2eee7", muted: "#8c877e", accent: "#4be37a", sub: "#205a37" },
    paper: { bg: "#ffffff", empty: "#f1f0ec", border: "#e2dfd8", text: "#141518", muted: "#6b6860", accent: "#177245", sub: "#a7dab8" },
    dark: { bg: "#050807", empty: "#0a140e", border: "#12261b", text: "#d9ffe8", muted: "#68997c", accent: "#39d353", sub: "#006d32" },
    light: { bg: "#ffffff", empty: "#ebedf0", border: "#d0d7de", text: "#1f2328", muted: "#656d76", accent: "#2da44e", sub: "#9be9a8" },
    sand: { bg: "#f6f1e7", empty: "#ebe3d3", border: "#dcd1bc", text: "#2a2118", muted: "#7a6a58", accent: "#b55233", sub: "#e3a887" },
    cyberpunk: { bg: "#090614", empty: "#140e29", border: "#261a4a", text: "#f5e9ff", muted: "#9882b8", accent: "#00f0ff", sub: "#ff2a85" },
    neon_cyan: { bg: "#040812", empty: "#0a1426", border: "#132645", text: "#e4f3ff", muted: "#6c8db5", accent: "#00e5ff", sub: "#006699" },
    amber_terminal: { bg: "#0c0904", empty: "#1a1308", border: "#2e210e", text: "#ffe4b5", muted: "#9e7b47", accent: "#ffb000", sub: "#804c00" },
    ruby: { bg: "#0d0507", empty: "#1b0b10", border: "#31131d", text: "#ffe6ec", muted: "#a46a79", accent: "#ff3366", sub: "#7a122c" }
  };

  let cachedBundle = null;
  let bundlePromise = null;

  function getSkin(skinId) {
    return SKIN_MAP[skinId] || SKIN_MAP.capybara;
  }

  function filterSkins({ category = "all", query = "" } = {}) {
    const q = String(query || "").trim().toLowerCase();
    return SKINS.filter(skin => {
      if (category === "originals" && !skin.isOriginal) return false;
      if (category && category !== "all" && category !== "originals" && skin.category !== category) return false;
      if (!q) return true;
      return (
        skin.id.toLowerCase().includes(q) ||
        skin.name.toLowerCase().includes(q) ||
        skin.fullName.toLowerCase().includes(q) ||
        skin.category.toLowerCase().includes(q) ||
        (skin.detail && skin.detail.toLowerCase().includes(q))
      );
    });
  }

  function resolveState(signals = {}) {
    if (signals.urgentDeadlines && signals.urgentDeadlines > 0) return "ALERT_SEMESTRE";
    if (signals.mergedRecently || (signals.commitsToday !== undefined && signals.commitsToday > 0)) return "VICTORY_GITHUB";
    if (signals.daysSinceLastCommit !== undefined && signals.daysSinceLastCommit >= 7) return "SLEEP";
    if (signals.streakDays !== undefined && signals.streakDays >= 3) return "FOCUS";
    if (signals.streakDays !== undefined && signals.streakDays >= 1) return "WALK";
    return "IDLE";
  }

  function getDialogue(skinOrId, state = "FOCUS", lang = "es", customSay = "") {
    const trimmed = String(customSay || "").trim();
    if (trimmed) return trimmed.slice(0, 110);
    const skin = typeof skinOrId === "string" ? getSkin(skinOrId) : (skinOrId || getSkin("capybara"));
    const d = skin.dialogues || {};
    if (state === "FOCUS" && d.focus) return d.focus;
    if (state === "VICTORY_GITHUB" && d.victory) return d.victory;
    if (state === "ALERT_SEMESTRE" && d.alert) return d.alert;
    if (state === "SLEEP" && d.sleep) return d.sleep;
    if (d.break) return d.break;
    return skin.detail || skin.fullName;
  }

  function getStateConfig(state = "FOCUS") {
    return STATE_DEFAULTS[state] || STATE_DEFAULTS.FOCUS;
  }

  function setBundle(bundle) {
    if (bundle && bundle.skins) {
      cachedBundle = bundle;
    }
  }

  async function loadBundle(baseUrl = "") {
    if (cachedBundle) return cachedBundle;
    if (root.PortafilCompanionsBundle && root.PortafilCompanionsBundle.skins) {
      cachedBundle = root.PortafilCompanionsBundle;
      return cachedBundle;
    }
    if (bundlePromise) return bundlePromise;
    const url = baseUrl
      ? baseUrl.replace(/\/$/, "") + "/shared/companions-bundle.json"
      : "shared/companions-bundle.json";
    bundlePromise = fetch(url)
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (data && data.skins) cachedBundle = data;
        return cachedBundle;
      })
      .catch(() => null);
    return bundlePromise;
  }

  function getSpritesheetDataUrl(skinId) {
    if (cachedBundle && cachedBundle.skins && cachedBundle.skins[skinId]) {
      return cachedBundle.skins[skinId].spritesheetDataUrl;
    }
    return "";
  }

  function generateMarkdownSnippet(opts = {}) {
    const user = opts.user || "tu-usuario";
    const skin = getSkin(opts.skin || "capybara").id;
    const variant = ["card", "divider", "badge"].includes(opts.variant) ? opts.variant : "card";
    const state = opts.state || "auto";
    const theme = THEMES[opts.theme] ? opts.theme : "ink";
    const lang = opts.lang === "en" ? "en" : "es";
    const say = String(opts.say || "").trim();
    const base = (opts.site || (root.Brand && root.Brand.site) || "https://perfila-lr.vercel.app").replace(/\/$/, "");

    const buildUrl = (t) => {
      const p = new URLSearchParams();
      p.set("theme", t);
      if (lang === "es") p.set("lang", "es");
      if (skin !== "capybara") p.set("skin", skin);
      if (variant !== "card") p.set("variant", variant);
      if (state && state !== "auto") p.set("state", state);
      if (say) p.set("say", say.slice(0, 110));
      return `${base}/api/companion/${encodeURIComponent(user)}.svg?${p.toString()}`;
    };

    const pairs = { ink: ["ink", "paper"], paper: ["ink", "paper"], dark: ["dark", "light"], light: ["dark", "light"], sand: ["amber_terminal", "sand"] };
    if (pairs[theme] && opts.adaptive !== false) {
      const [darkT, lightT] = pairs[theme];
      return [
        "<picture>",
        `  <source media="(prefers-color-scheme: dark)" srcset="${buildUrl(darkT)}">`,
        `  <source media="(prefers-color-scheme: light)" srcset="${buildUrl(lightT)}">`,
        `  <img alt="@${user} companion by Portafil" src="${buildUrl(lightT)}" width="${variant === "badge" ? "390" : "100%"}">`,
        "</picture>"
      ].join("\n");
    }
    return `<img alt="@${user} companion by Portafil" src="${buildUrl(theme)}" width="${variant === "badge" ? "390" : "100%"}">`;
  }

  function generateActionYaml(opts = {}) {
    const user = opts.user || "tu-usuario";
    const skin = getSkin(opts.skin || "capybara").id;
    const variant = ["card", "divider", "badge"].includes(opts.variant) ? opts.variant : "card";
    const state = opts.state || "auto";
    const theme = THEMES[opts.theme] ? opts.theme : "ink";
    const lang = opts.lang === "en" ? "en" : "es";
    const say = String(opts.say || "").trim();

    const p = new URLSearchParams();
    p.set("kind", "companion");
    p.set("skin", skin);
    if (variant !== "card") p.set("variant", variant);
    if (state !== "auto") p.set("state", state);
    p.set("theme", theme);
    if (lang === "es") p.set("lang", "es");
    if (say) p.set("say", say.slice(0, 110));

    return [
      "name: Portafil Companion",
      "on:",
      "  schedule:",
      "    - cron: \"0 */6 * * *\"",
      "  workflow_dispatch:",
      "permissions:",
      "  contents: write",
      "jobs:",
      "  companion:",
      "    runs-on: ubuntu-latest",
      "    steps:",
      "      - uses: actions/checkout@v4",
      "      - uses: luisrodriguez-rgb/portafil@v1",
      "        with:",
      `          github_user_name: ${user}`,
      "          outputs: |",
      `            dist/portafil-companion.svg?${p.toString()}`,
      "      - name: Commit & Push",
      "        run: |",
      "          git config user.name \"github-actions[bot]\"",
      "          git config user.email \"41898282+github-actions[bot]@users.noreply.github.com\"",
      "          git add dist/portafil-companion.svg",
      "          git diff --staged --quiet || git commit -m \"chore: update Portafil companion\"",
      "          git push"
    ].join("\n");
  }

  function generateEmbedCode(opts = {}) {
    const user = opts.user || "luisrodriguez-rgb";
    const skin = getSkin(opts.skin || "capybara").id;
    const theme = THEMES[opts.theme] ? opts.theme : "ink";
    const state = opts.state && opts.state !== "auto" ? opts.state : "WALK";
    const mode = ["dock", "inline", "roam"].includes(opts.mode) ? opts.mode : "dock";
    const position = opts.position === "bottom-left" ? "bottom-left" : "bottom-right";
    const lang = opts.lang === "en" ? "en" : "es";
    const say = String(opts.say || "").trim();
    const base = (opts.site || (root.Brand && root.Brand.site) || "https://perfila-lr.vercel.app").replace(/\/$/, "");

    const attrs = [
      `user="${user}"`,
      `skin="${skin}"`,
      `theme="${theme}"`,
      `state="${state}"`,
      `mode="${mode}"`
    ];
    if (mode === "dock") attrs.push(`position="${position}"`);
    if (lang === "en") attrs.push(`lang="en"`);
    if (say) attrs.push(`say="${say.replace(/"/g, "&quot;")}"`);

    return [
      `<!-- Widget interactivo de Compañero (MySkin × Portafil) -->`,
      `<script src="${base}/shared/companion-widget.js" defer></script>`,
      `<portafil-companion ${attrs.join(" ")}></portafil-companion>`
    ].join("\n");
  }

  function registerCustomElement() {
    if (typeof customElements === "undefined" || typeof HTMLElement === "undefined") return;
    if (customElements.get("portafil-companion")) return;

    class PortafilCompanionElement extends HTMLElement {
      static get observedAttributes() {
        return ["user", "skin", "theme", "state", "mode", "position", "say", "lang"];
      }

      constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this._stateIndex = 0;
        this._panelOpen = false;
        this._pomoRemaining = 25 * 60;
        this._pomoTimer = null;
      }

      connectedCallback() {
        this._render();
        loadBundle().then(() => this._updateSprite());
      }

      disconnectedCallback() {
        if (this._pomoTimer) clearInterval(this._pomoTimer);
      }

      attributeChangedCallback() {
        if (this.isConnected) {
          this._render();
          this._updateSprite();
        }
      }

      setSkin(skinId) {
        this.setAttribute("skin", getSkin(skinId).id);
      }

      setState(state) {
        if (STATE_DEFAULTS[state]) this.setAttribute("state", state);
      }

      say(message) {
        this.setAttribute("say", String(message || ""));
      }

      _cycleState() {
        const current = this.getAttribute("state") || "WALK";
        const idx = (STATES.indexOf(current) + 1) % STATES.length;
        const next = STATES[idx];
        this.setAttribute("state", next);
        this.dispatchEvent(new CustomEvent("companion-state", { detail: { state: next, skin: this.getAttribute("skin") || "capybara" } }));
      }

      _togglePomo() {
        if (this._pomoTimer) {
          clearInterval(this._pomoTimer);
          this._pomoTimer = null;
          this.setAttribute("state", "IDLE");
        } else {
          this.setAttribute("state", "FOCUS");
          this._pomoTimer = setInterval(() => {
            if (this._pomoRemaining > 0) {
              this._pomoRemaining--;
              this._updatePomoLabel();
            } else {
              clearInterval(this._pomoTimer);
              this._pomoTimer = null;
              this._pomoRemaining = 25 * 60;
              this.setAttribute("state", "VICTORY_GITHUB");
            }
          }, 1000);
        }
        this._updatePomoLabel();
      }

      _updatePomoLabel() {
        const btn = this.shadowRoot && this.shadowRoot.getElementById("pomoBtn");
        if (!btn) return;
        const mins = String(Math.floor(this._pomoRemaining / 60)).padStart(2, "0");
        const secs = String(this._pomoRemaining % 60).padStart(2, "0");
        btn.textContent = this._pomoTimer ? `⏸ ${mins}:${secs}` : `▶ Pomodoro ${mins}:${secs}`;
      }

      _updateSprite() {
        if (!this.shadowRoot) return;
        const skin = getSkin(this.getAttribute("skin") || "capybara");
        const spriteEl = this.shadowRoot.getElementById("spriteSheet");
        if (!spriteEl) return;
        const dataUrl = getSpritesheetDataUrl(skin.id);
        if (dataUrl) {
          spriteEl.style.backgroundImage = `url("${dataUrl}")`;
        }
      }

      _render() {
        const skin = getSkin(this.getAttribute("skin") || "capybara");
        const themeKey = this.getAttribute("theme") || "ink";
        const tokens = THEMES[themeKey] || THEMES.ink;
        const mode = ["dock", "inline", "roam"].includes(this.getAttribute("mode")) ? this.getAttribute("mode") : "dock";
        const pos = this.getAttribute("position") === "bottom-left" ? "bottom-left" : "bottom-right";
        const lang = this.getAttribute("lang") === "en" ? "en" : "es";
        const rawState = this.getAttribute("state") || (mode === "roam" ? "WALK" : "FOCUS");
        const state = STATE_DEFAULTS[rawState] ? rawState : "FOCUS";
        const cfg = getStateConfig(state);
        const quote = getDialogue(skin, state, lang, this.getAttribute("say") || "");
        const user = this.getAttribute("user") || "";
        const size = 64;
        const rowY = -(cfg.row * size);
        const endX = -(cfg.frames * size);
        const duration = +(cfg.frames / cfg.fps).toFixed(2);
        const stateLabel = lang === "en" ? cfg.labelEn : cfg.labelEs;
        const dataUrl = getSpritesheetDataUrl(skin.id);

        this.shadowRoot.innerHTML = `
          <style>
            :host {
              display: ${mode === "dock" ? "block" : "inline-block"};
              font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
              color: ${tokens.text};
              z-index: 9990;
              ${mode === "dock" ? `position: fixed; bottom: 18px; ${pos === "bottom-left" ? "left: 18px;" : "right: 18px;"}` : "position: relative; width: 100%;"}
            }
            .wrap {
              display: flex;
              align-items: center;
              gap: 12px;
              background: ${tokens.bg};
              border: 1.5px solid ${tokens.border};
              border-radius: 14px;
              padding: 10px 14px;
              box-shadow: 0 12px 32px rgba(0,0,0,0.45);
              max-width: ${mode === "dock" ? "380px" : "100%"};
              transition: transform 0.2s ease, border-color 0.2s ease;
            }
            .wrap:hover {
              border-color: ${tokens.accent};
            }
            .stage {
              position: relative;
              width: ${size}px;
              height: ${size}px;
              flex-shrink: 0;
              background: ${tokens.empty};
              border: 1px solid ${tokens.border};
              border-radius: 10px;
              overflow: hidden;
              cursor: pointer;
            }
            .sprite {
              width: ${size * 6}px;
              height: ${size * 6}px;
              background-size: ${size * 6}px ${size * 6}px;
              background-repeat: no-repeat;
              image-rendering: -moz-crisp-edges;
              image-rendering: pixelated;
              transform: translate3d(0, ${rowY}px, 0);
              animation: spriteStep ${duration}s steps(${cfg.frames}) infinite;
            }
            @keyframes spriteStep {
              from { transform: translate3d(0, ${rowY}px, 0); }
              to { transform: translate3d(${endX}px, ${rowY}px, 0); }
            }
            .info {
              min-width: 0;
              flex: 1;
            }
            .head {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 8px;
              margin-bottom: 4px;
            }
            .name {
              font-size: 12px;
              font-weight: 700;
              color: ${tokens.text};
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .badge {
              font-size: 10px;
              font-weight: 700;
              color: ${tokens.accent};
              white-space: nowrap;
            }
            .quote {
              font-size: 11px;
              line-height: 1.35;
              color: ${tokens.muted};
              margin: 0 0 6px 0;
              display: -webkit-box;
              -webkit-line-clamp: 2;
              -webkit-box-orient: vertical;
              overflow: hidden;
            }
            .actions {
              display: flex;
              align-items: center;
              gap: 6px;
              flex-wrap: wrap;
            }
            button {
              font-family: inherit;
              font-size: 10px;
              font-weight: 600;
              padding: 3px 8px;
              border-radius: 6px;
              border: 1px solid ${tokens.border};
              background: ${tokens.empty};
              color: ${tokens.text};
              cursor: pointer;
            }
            button:hover {
              border-color: ${tokens.accent};
              color: ${tokens.accent};
            }
            .close-btn {
              margin-left: auto;
              opacity: 0.7;
            }
            @media (prefers-reduced-motion: reduce) {
              .sprite { animation: none; }
            }
          </style>
          <div class="wrap" part="card">
            <div class="stage" id="spriteStage" title="${lang === "en" ? "Click to change animation" : "Haz clic para cambiar de animación"}">
              <div class="sprite" id="spriteSheet" style="${dataUrl ? `background-image: url(&quot;${dataUrl}&quot;)` : ""}"></div>
            </div>
            <div class="info">
              <div class="head">
                <span class="name">${skin.name}${user ? ` · @${user}` : ""}</span>
                <span class="badge">● ${stateLabel}</span>
              </div>
              <p class="quote">“${quote}”</p>
              <div class="actions">
                <button type="button" id="cycleBtn">${lang === "en" ? "State" : "Estado"}</button>
                <button type="button" id="pomoBtn">▶ Pomodoro 25:00</button>
                ${mode === "dock" ? `<button type="button" class="close-btn" id="hideBtn" title="Cerrar">✕</button>` : ""}
              </div>
            </div>
          </div>
        `;

        const stage = this.shadowRoot.getElementById("spriteStage");
        const cycleBtn = this.shadowRoot.getElementById("cycleBtn");
        const pomoBtn = this.shadowRoot.getElementById("pomoBtn");
        const hideBtn = this.shadowRoot.getElementById("hideBtn");

        if (stage) stage.addEventListener("click", () => this._cycleState());
        if (cycleBtn) cycleBtn.addEventListener("click", () => this._cycleState());
        if (pomoBtn) {
          this._updatePomoLabel();
          pomoBtn.addEventListener("click", () => this._togglePomo());
        }
        if (hideBtn) hideBtn.addEventListener("click", () => this.remove());
      }
    }

    customElements.define("portafil-companion", PortafilCompanionElement);
  }

  function mount(opts = {}, container = null) {
    if (typeof document === "undefined") return null;
    registerCustomElement();
    const el = document.createElement("portafil-companion");
    for (const [k, v] of Object.entries(opts)) {
      if (v !== undefined && v !== null && v !== "") el.setAttribute(k, String(v));
    }
    const target = container || document.body;
    if (target) target.appendChild(el);
    return el;
  }

  registerCustomElement();

  const PortafilCompanion = {
    SKINS,
    SKIN_MAP,
    STATES,
    STATE_DEFAULTS,
    CATEGORIES,
    THEMES,
    getSkin,
    filterSkins,
    resolveState,
    getDialogue,
    getStateConfig,
    setBundle,
    loadBundle,
    getSpritesheetDataUrl,
    generateMarkdownSnippet,
    generateActionYaml,
    generateEmbedCode,
    registerCustomElement,
    mount
  };

  root.PortafilCompanion = PortafilCompanion;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = PortafilCompanion;
  }
})(typeof window !== "undefined" ? window : globalThis);

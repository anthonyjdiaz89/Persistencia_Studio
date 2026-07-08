/**
 * Pre-built episode scripts for "La Isla Mágica"
 * Each episode is organized in blocks (Scenes) with 10-second clips.
 *
 * Structure: Episode → Blocks → Clips (10s each)
 * Characters: @Tomas, @Lia, @Noah, @Coco
 * Location: @Isla
 *
 * EP2 data sourced from ep2_frames.ts (79 clips, 11 blocks).
 * EP1, EP3–EP6 are structured storyboard skeletons ready to be filled.
 */

import { SceneBlueprint, ClipBlueprint } from "../components/AIDirectorPanel";

/* ─── helpers ─────────────────────────────────────────── */
function cam(
  style = "auto",
  pan = "none",
  tilt = "none",
  zoom = "none",
  speed = "normal",
  timeOfDay = "day"
): ClipBlueprint["cameraSettings"] {
  return { style, pan, tilt, zoom, roll: "none", speed, timeOfDay, motionCurve: "ease-in-out" };
}

function clip(
  n: number,
  title: string,
  prompt: string,
  camSettings?: Partial<ClipBlueprint["cameraSettings"]>
): ClipBlueprint {
  return {
    clipNumber: n,
    title,
    prompt,
    cameraSettings: { ...cam(), ...camSettings },
    duration: 10,
    generate_audio: true,
    consistencyExplanation: "",
  };
}

/* ═══════════════════════════════════════════════════════════════════
 * EPISODIO 1 — "El gran invento" (Pilot)
 * ═══════════════════════════════════════════════════════════════════ */
export const EP1_SCENES: SceneBlueprint[] = [
  {
    sceneTitle: "B00 · COLD OPEN · La llegada a la isla",
    sceneDescription: "Presentación de la isla y los personajes principales.",
    directorCommentary: "Plano aéreo que revela la isla, luego baja al muelle.",
    referenceImageUrl: "",
    clips: [
      clip(1, "Drone sobre la isla", "@Isla vista aérea completa al amanecer, palmeras, playa de arena blanca, muelle de madera, cabaña rústica visible, océano turquesa cristalino", { style: "drone", zoom: "in", timeOfDay: "dawn" }),
      clip(2, "Descenso al muelle", "@Isla drone desciende hacia el muelle de madera, olas suaves rompiendo, gaviotas volando", { style: "drone", tilt: "down", timeOfDay: "dawn" }),
      clip(3, "Plano del muelle", "@Isla muelle de madera vista frontal, olas pequeñas, palmeras al fondo", { style: "static", timeOfDay: "day" }),
      clip(4, "@Tomas llega al muelle", "@Tomas camina por el muelle de @Isla con su cinturón de herramientas, sonriendo al horizonte", { style: "dolly", pan: "right" }),
      clip(5, "@Lia y @Coco en la playa", "@Lia y @Coco juegan en la orilla de @Isla, @Lia construye castillos de arena, @Coco imita", { style: "handheld" }),
    ],
  },
  {
    sceneTitle: "B01 · OPENING · Identidad de serie",
    sceneDescription: "Secuencia de apertura con los cuatro personajes.",
    directorCommentary: "Montaje de momentos icónicos de la isla.",
    referenceImageUrl: "",
    clips: [
      clip(1, "Montaje isla amanecer", "@Isla amanecer sobre el océano, telas del taller moviéndose con la brisa", { style: "static", timeOfDay: "dawn" }),
      clip(2, "Los cuatro juntos", "@Tomas, @Lia, @Noah y @Coco caminando juntos por la playa de @Isla", { style: "dolly", pan: "right" }),
      clip(3, "Taller exterior", "@Tomas en el taller exterior de @Isla construyendo algo con herramientas", { style: "handheld" }),
      clip(4, "Logo Isla Mágica", "@Isla vista aérea amplia, horizonte limpio, luz tropical cálida, cielo despejado", { style: "drone", zoom: "out" }),
    ],
  },
  {
    sceneTitle: "B02 · PLANTEAMIENTO · El problema de la semilla",
    sceneDescription: "@Lia encuentra una semilla misteriosa y pregunta cómo hacerla crecer.",
    directorCommentary: "Diálogo entre Lia y Tomas con la semilla como objeto central.",
    referenceImageUrl: "",
    clips: [
      clip(1, "Zoom al taller", "@Isla taller exterior, @Tomas trabaja con madera, brisa mueve las telas", { style: "dolly", zoom: "in" }),
      clip(2, "@Lia entra con la semilla", "@Lia entra al taller de @Isla sosteniendo una semilla extraña en la palma de la mano", { style: "handheld", pan: "right" }),
      clip(3, "@Lia pregunta a @Tomas", "@Lia muestra la semilla a @Tomas en @Isla, gesto de pregunta, bocas claras para sincronía", { style: "static" }),
      clip(4, "@Tomas observa la semilla", "@Tomas examina la semilla con lupa en @Isla, expresión curiosa y fascinada", { style: "static", zoom: "in" }),
      clip(5, "@Noah y @Coco se acercan", "@Noah y @Coco se acercan curiosos al taller de @Isla para ver la semilla", { style: "handheld" }),
      clip(6, "Grupo examina la semilla", "@Tomas, @Lia, @Noah y @Coco se reúnen en @Isla alrededor de la semilla, expresiones curiosas", { style: "static" }),
    ],
  },
  {
    sceneTitle: "B03 · EXPERIMENTO 1 · ¿Qué necesita una semilla?",
    sceneDescription: "El grupo aprende qué elementos necesita una semilla para crecer.",
    directorCommentary: "Experimento didáctico: tierra, agua, sol, aire.",
    referenceImageUrl: "",
    clips: [
      clip(1, "La bandeja con tierra", "@Tomas trae bandeja con tierra oscura al taller de @Isla, @Lia observa", { style: "static", zoom: "in" }),
      clip(2, "@Lia planta la semilla", "@Lia planta la semilla en la tierra de la bandeja en @Isla con cuidado", { style: "handheld", zoom: "in" }),
      clip(3, "@Coco riega con gesto", "@Coco imita regar la semilla con las patas en @Isla, cómico pero tierno", { style: "static" }),
      clip(4, "Primer plano semilla", "Primer plano de la semilla en tierra húmeda, @Isla, luz natural cálida", { style: "static", zoom: "in" }),
      clip(5, "@Noah: sobre el sol", "@Noah señala el sol sobre @Isla y explica que la semilla necesita luz solar", { style: "handheld" }),
      clip(6, "Coloca la bandeja al sol", "@Lia y @Tomas colocan la bandeja con la semilla al sol en @Isla, satisfechos", { style: "dolly" }),
    ],
  },
  {
    sceneTitle: "B04 · CANCIÓN 1 · Crece, semillita",
    sceneDescription: "Canción educativa sobre el ciclo de vida de las plantas.",
    directorCommentary: "Secuencia musical imaginaria con animación vibrante.",
    referenceImageUrl: "",
    clips: [
      clip(1, "Apertura musical", "@Lia canta mirando la semilla en @Isla, luz cálida, ambiente musical animado", { style: "static", timeOfDay: "day" }),
      clip(2, "Imaginario: jardín mágico", "Visión imaginaria: jardín tropical mágico creciendo acelerado en @Isla, colores vibrantes", { style: "crane", zoom: "out" }),
      clip(3, "@Coco baila", "@Coco baila alrededor de la bandeja en @Isla, movimientos divertidos, @Lia ríe", { style: "handheld" }),
      clip(4, "@Noah y @Lia danzan", "@Noah y @Lia danzan juntos cerca del taller de @Isla, movimientos alegres", { style: "orbit" }),
      clip(5, "Cierre musical", "@Tomas observa sonriendo a los niños danzar en @Isla, plano familiar cálido", { style: "static", zoom: "out" }),
    ],
  },
  {
    sceneTitle: "B05 · EXPERIMENTO 2 · El poder del agua",
    sceneDescription: "El grupo experimenta con diferentes cantidades de agua.",
    directorCommentary: "Experimento comparativo con múltiples macetas.",
    referenceImageUrl: "",
    clips: [
      clip(1, "Tres macetas preparadas", "@Tomas prepara tres macetas idénticas en @Isla con distintas cantidades de agua", { style: "static", zoom: "in" }),
      clip(2, "@Lia riega poco", "@Lia riega la primera maceta con muy poca agua en @Isla, cara concentrada", { style: "handheld" }),
      clip(3, "@Noah riega normal", "@Noah riega la segunda maceta con agua normal en @Isla, técnica correcta", { style: "handheld" }),
      clip(4, "@Coco riega demasiado", "@Coco vuelca accidentalmente demasiada agua en la tercera maceta en @Isla, todos sorprendidos", { style: "static" }),
      clip(5, "Comparación resultados", "Tres macetas comparadas en @Isla: una seca, una floreciendo, una inundada", { style: "static", zoom: "in" }),
      clip(6, "@Tomas explica el equilibrio", "@Tomas explica la cantidad justa de agua a @Lia y @Noah en @Isla", { style: "static" }),
    ],
  },
  {
    sceneTitle: "B06 · CLIP MUSICAL · La danza del agua",
    sceneDescription: "Secuencia musical sobre el ciclo del agua.",
    directorCommentary: "Clip visual con movimiento de agua en la isla.",
    referenceImageUrl: "",
    clips: [
      clip(1, "Olas en la playa", "@Isla olas suaves rompiendo en la orilla, luz dorada, ritmo constante", { style: "static", timeOfDay: "afternoon" }),
      clip(2, "Los niños corren hacia el mar", "@Lia, @Noah y @Coco corren hacia las olas de @Isla, alegría", { style: "handheld", zoom: "out" }),
      clip(3, "@Tomas y @Lia en el agua", "@Tomas y @Lia salpican agua en @Isla, risas, plano familiar", { style: "handheld" }),
      clip(4, "Puesta de sol reflejada", "@Isla puesta de sol reflejada en el océano, los cuatro silueteados mirando el horizonte", { style: "static", timeOfDay: "sunset", zoom: "out" }),
    ],
  },
  {
    sceneTitle: "B07 · REGRESO AL TALLER · La semilla creció",
    sceneDescription: "Al volver, encuentran que la semilla ha brotado.",
    directorCommentary: "Momento de sorpresa y descubrimiento.",
    referenceImageUrl: "",
    clips: [
      clip(1, "El grupo regresa", "@Tomas, @Lia, @Noah y @Coco regresan al taller de @Isla al atardecer", { style: "dolly", pan: "right", timeOfDay: "sunset" }),
      clip(2, "La bandeja con brote", "Primer plano: la semilla ha brotado en la bandeja, pequeño tallo verde visible", { style: "static", zoom: "in" }),
      clip(3, "@Lia sorprendida", "@Lia descubre el brote en @Isla, expresión de maravilla y alegría", { style: "handheld" }),
      clip(4, "El grupo celebra", "@Tomas, @Lia, @Noah y @Coco celebran juntos el crecimiento del brote en @Isla", { style: "handheld" }),
    ],
  },
  {
    sceneTitle: "B08 · CIERRE · Lección aprendida",
    sceneDescription: "@Lia reflexiona sobre lo aprendido y lo comparte.",
    directorCommentary: "Momento calmado, reflexivo, mirando a la cámara.",
    referenceImageUrl: "",
    clips: [
      clip(1, "@Lia mira a cámara", "@Lia mira a cámara desde @Isla y resume la lección del día, boca clara", { style: "static" }),
      clip(2, "@Tomas abraza a @Lia", "@Tomas pone el brazo sobre @Lia en @Isla, plano cálido familiar", { style: "static", zoom: "out" }),
      clip(3, "Puesta de sol final", "@Isla puesta de sol sobre el océano, los cuatro personajes como siluetas al fondo", { style: "static", timeOfDay: "sunset" }),
    ],
  },
  {
    sceneTitle: "B09 · CRÉDITOS · La isla de noche",
    sceneDescription: "Créditos sobre imágenes nocturnas de la isla.",
    directorCommentary: "Planos nocturnos de la isla.",
    referenceImageUrl: "",
    clips: [
      clip(1, "Isla de noche", "@Isla de noche, estrellas reflejadas en el océano, taller iluminado suavemente", { style: "static", timeOfDay: "night" }),
      clip(2, "Luciérnagas en la playa", "@Isla noche mágica, luciérnagas volando sobre la arena, palmeras silueteadas", { style: "static", timeOfDay: "night" }),
    ],
  },
];

/* ═══════════════════════════════════════════════════════════════════
 * EPISODIO 2 — "El viento y las olas" (El aire como fuerza invisible)
 * Source: ep2_frames.ts — 11 bloques, 79 clips
 * ═══════════════════════════════════════════════════════════════════ */
export const EP2_SCENES: SceneBlueprint[] = [
  {
    sceneTitle: "B00 · COLD OPEN · Misterio del aire y del mar",
    sceneDescription: "Una ola misteriosa empuja el barquito de Lia. ¿Quién fue?",
    directorCommentary: "Drone sobre isla → playa → Lia con barquito → ola empuja → imaginarios → pregunta al aire.",
    referenceImageUrl: "",
    clips: [
      clip(1, "Drone isla completa", "@Isla drone subjetivo musical sobre la isla completa, descubre la geografía, luz tropical cálida, agua turquesa", { style: "drone", timeOfDay: "day" }),
      clip(2, "Zoom a sitios especiales", "@Isla drone zoom pasando por 4-5 lugares especiales, último destino el muelle", { style: "drone", zoom: "in" }),
      clip(3, "Muelle olas más movidas", "@Isla muelle de madera, mar más movido, olas pequeñas constantes golpeando la madera", { style: "static" }),
      clip(4, "@Lia con barquito / @Coco llega", "@Lia sostiene su barquito artesanal en la orilla de @Isla, @Coco llega imitando con una hoja", { style: "handheld" }),
      clip(5, "@Lia coloca el barco / @Coco imita", "@Lia coloca el barquito en el agua de @Isla, @Coco coloca su hoja junto a él", { style: "static", zoom: "in" }),
      clip(6, "Ola empuja el barquito", "@Isla orilla, una ola pequeña empuja el barquito hacia atrás claramente", { style: "static", zoom: "in" }),
      clip(7, "@Lia pregunta ¿quién te empujó?", "@Lia sorprendida pregunta al barquito quién lo empujó, orilla de @Isla, boca clara para sincronía", { style: "static" }),
      clip(8, "@Lia mira alrededor, nadie", "@Lia mira alrededor en la playa de @Isla buscando a alguien, no hay nadie", { style: "handheld", pan: "right" }),
      clip(9, "@Coco se encoge de hombros", "@Coco se encoge de hombros cómicamente junto a @Lia en la orilla de @Isla", { style: "static" }),
      clip(10, "@Lia a cámara ¿vieron eso?", "@Lia mira a cámara desde @Isla preguntando a los niños si vieron lo que pasó", { style: "static" }),
      clip(11, "Imaginario: @Tomas gigante molino", "Visión imaginaria de @Lia: @Tomas gigante moviendo un molino de agua causando las olas en @Isla", { style: "crane", zoom: "out" }),
      clip(12, "Regreso a realidad, @Lia no convencida", "@Lia regresa a la realidad en @Isla, expresión escéptica, no convencida", { style: "static" }),
      clip(13, "Imaginario: @Noah pingüinos iceberg", "Visión imaginaria de @Lia: @Noah coordina pingüinos en un iceberg creando olas que llegan a @Isla", { style: "crane" }),
      clip(14, "@Coco levanta arena, @Lia siente viento", "@Coco corre levantando arena en @Isla, brisa despeina el pelo de @Lia, siente el viento", { style: "handheld" }),
      clip(15, "@Lia ¿fue el aire?", "@Lia en @Isla realizando: '¿Fue el aire?... ¿El aire empuja el mar?', boca clara", { style: "static", zoom: "in" }),
    ],
  },
  {
    sceneTitle: "B01 · OPENING · Identidad de serie",
    sceneDescription: "Secuencia opening con montaje de momentos icónicos.",
    directorCommentary: "8 shots de montaje rápido: telas, cometas, olas, grupo, campamento, basura, taller, logo.",
    referenceImageUrl: "",
    clips: [
      clip(1, "Telas moviéndose en taller", "@Isla taller exterior, telas colgantes moviéndose suavemente con la brisa", { style: "static", zoom: "in" }),
      clip(2, "Cometas en el cielo", "@Isla playa con cometas volando en el cielo despejado", { style: "static", zoom: "out" }),
      clip(3, "Olas en el muelle", "@Isla muelle de madera, olas pequeñas rompiendo suavemente", { style: "static", zoom: "in" }),
      clip(4, "Los cuatro juntos", "@Tomas, @Lia, @Noah y @Coco pescando y jugando juntos en @Isla", { style: "static" }),
      clip(5, "Acampando y estrellas", "@Lia, @Noah y @Coco acampando en @Isla viendo las estrellas", { style: "static", timeOfDay: "night" }),
      clip(6, "Recogiendo basura del mar", "@Lia, @Noah y @Coco recogen basura reciclable de la orilla de @Isla", { style: "handheld" }),
      clip(7, "Reciclando y construyendo", "@Tomas y los niños reciclan materiales en el taller interior de @Isla", { style: "static" }),
      clip(8, "Logo La Isla Mágica", "@Isla vista aérea amplia, horizonte limpio, identidad visual de la serie", { style: "drone", zoom: "out" }),
    ],
  },
  {
    sceneTitle: "B02 · PLANTEAMIENTO · Lo invisible también trabaja",
    sceneDescription: "@Lia llega al taller preguntando quién mueve las olas. @Tomas desafía su forma de pensar.",
    directorCommentary: "13 shots de diálogo en taller exterior. Personaje clave: @Noah con el vaso de agua.",
    referenceImageUrl: "",
    clips: [
      clip(1, "Zoom desde logo hacia taller", "@Isla taller exterior, zoom desde identidad hacia taller, telas moviéndose", { style: "dolly", zoom: "in" }),
      clip(2, "Viento mueve telas, @Tomas sostiene madera", "@Tomas sostiene una pieza de madera en @Isla mientras el viento mueve las telas", { style: "static" }),
      clip(3, "@Lia entra decidida", "@Lia entra al taller exterior de @Isla decidida, mirando las telas que se mueven", { style: "handheld" }),
      clip(4, "@Lia: @Tomas… ¿quién mueve las olas?", "@Lia pregunta a @Tomas en @Isla quién mueve las olas del mar, boca clara", { style: "static" }),
      clip(5, "@Tomas: ¿Quién crees tú?", "@Tomas responde calmadamente a @Lia en @Isla preguntando qué cree ella", { style: "static" }),
      clip(6, "@Lia: no vio a nadie empujando", "@Lia explica a @Tomas en @Isla que no vio a nadie empujando las olas", { style: "static", zoom: "in" }),
      clip(7, "@Tomas/@Noah: ¿Y si es algo?", "@Tomas y @Noah en @Isla introducen la idea de que algo invisible puede hacerlo", { style: "static" }),
      clip(8, "@Lia confundida busca a @Coco", "@Lia confundida busca apoyo en @Coco en el taller exterior de @Isla", { style: "static" }),
      clip(9, "@Coco comiendo su pata, se apena", "@Coco está distraído mordiéndose la pata trasera en @Isla, se avergüenza al notarse observado", { style: "static" }),
      clip(10, "@Noah con vaso de agua", "@Noah aparece sosteniendo un vaso de agua transparente en @Isla y explica que lo invisible también trabaja", { style: "static" }),
      clip(11, "@Coco sopla sobre el vaso", "@Coco sopla fuerte sobre el vaso de agua de @Noah en @Isla, el agua se mueve visiblemente", { style: "static", zoom: "in" }),
      clip(12, "@Lia: ¡@Coco las hizo! @Tomas propone mar pequeño", "@Lia sorprendida señala a @Coco en @Isla, @Tomas propone hacer un mar pequeño", { style: "static" }),
      clip(13, "@Lia pregunta a niños, transición experimento", "@Lia mira a cámara desde @Isla invitando a los niños a hacer un mar pequeño", { style: "static", zoom: "in" }),
    ],
  },
  {
    sceneTitle: "B03 · EXPERIMENTO 1 · Mar en bandeja",
    sceneDescription: "El grupo usa una bandeja con agua para simular el mar y estudiar cómo el viento crea olas.",
    directorCommentary: "Experimento central del episodio. Bandeja de agua en mesa del taller.",
    referenceImageUrl: "",
    clips: [
      clip(1, "Océano aparente revela bandeja", "@Isla taller interior, primer plano de agua que parece océano, la cámara se aleja revelando la bandeja en la mesa", { style: "static", zoom: "out" }),
      clip(2, "@Tomas marca orilla con palito", "@Tomas marca una orilla en la bandeja con un palito pequeño en @Isla", { style: "static", zoom: "in" }),
      clip(3, "@Tomas: si algo empuja el agua…", "@Tomas explica en @Isla que si algo empuja el agua, el agua responde", { style: "static" }),
      clip(4, "@Lia sopla suave", "@Lia sopla suavemente sobre la bandeja de agua en el taller de @Isla", { style: "static" }),
      clip(5, "Mini olas en la bandeja", "Primer plano de mini olas cruzando la bandeja hacia la orilla marcada en @Isla", { style: "static", zoom: "in" }),
      clip(6, "@Lia: ¡Las hice!", "@Lia emocionada celebra haber creado mini olas en @Isla", { style: "static" }),
      clip(7, "@Coco imita y sopla más fuerte", "@Coco imita a @Lia y sopla más fuerte sobre la bandeja en @Isla", { style: "static" }),
      clip(8, "Olas más grandes, sorpresa", "Olas más grandes en la bandeja, @Coco y @Lia sorprendidos en @Isla", { style: "static", zoom: "in" }),
      clip(9, "@Noah: más empuje, más movimiento", "@Noah explica en @Isla que más empuje genera más movimiento", { style: "static" }),
      clip(10, "@Lia: viento como mano gigante / @Tomas: mano invisible", "@Lia y @Tomas conectan el viento con una mano invisible en @Isla", { style: "static" }),
    ],
  },
  {
    sceneTitle: "B04 · CANCIÓN 1 · Imaginario de la bandeja en playa",
    sceneDescription: "Secuencia musical imaginaria: la bandeja se convierte en playa real.",
    directorCommentary: "Transición mágica de la bandeja al océano real.",
    referenceImageUrl: "",
    clips: [
      clip(1, "Apertura canción imaginaria", "@Lia canta mirando la bandeja en @Isla, transición imaginaria inicio, boca clara", { style: "static", timeOfDay: "day" }),
      clip(2, "Bandeja se convierte en playa", "Visión mágica: bandeja del taller de @Isla se transforma en playa tropical real, zoom out mágico", { style: "crane", zoom: "out" }),
      clip(3, "@Tomas gigante sopla el mar", "Visión imaginaria: @Tomas gigante sopla sobre el océano de @Isla, creando olas enormes", { style: "crane" }),
      clip(4, "@Coco sobre cometa gigante", "Visión imaginaria: @Coco montado sobre una cometa gigante sobre @Isla", { style: "drone" }),
      clip(5, "@Noah midiendo el viento", "Visión imaginaria: @Noah con instrumentos midiendo la fuerza del viento en @Isla", { style: "crane" }),
      clip(6, "Todos juntos en la canción", "@Tomas, @Lia, @Noah y @Coco juntos en @Isla durante la secuencia musical", { style: "orbit" }),
      clip(7, "Regreso a realidad / grupo", "La visión mágica regresa a la realidad, el grupo de vuelta en el taller de @Isla", { style: "static" }),
    ],
  },
  {
    sceneTitle: "B05 · EXPERIMENTO 2 · Cometa y energía",
    sceneDescription: "El grupo construye una cometa para medir la fuerza del viento.",
    directorCommentary: "Secuencia de construcción + vuelo de la cometa en la playa.",
    referenceImageUrl: "",
    clips: [
      clip(1, "@Tomas propone construir cometa", "@Tomas propone a @Lia y @Noah construir una cometa en @Isla para capturar el viento", { style: "static" }),
      clip(2, "Construcción de la cometa", "@Tomas, @Lia y @Noah construyen la cometa en el taller de @Isla con materiales reciclados", { style: "handheld" }),
      clip(3, "@Coco pega la cinta sin querer", "@Coco accidentalmente pega cinta en la cola de la cometa en @Isla, cómico", { style: "static" }),
      clip(4, "El grupo en las dunas con cometa", "@Tomas, @Lia, @Noah y @Coco caminan hacia las dunas de @Isla con la cometa terminada", { style: "dolly", pan: "right" }),
      clip(5, "@Noah lanza la cometa", "@Noah lanza la cometa al viento en @Isla, asciende rápidamente", { style: "handheld", zoom: "out" }),
      clip(6, "La cometa vuela alto", "La cometa vuela alta sobre @Isla, vista aérea con toda la isla al fondo", { style: "drone", zoom: "out" }),
      clip(7, "@Lia siente la tensión del hilo", "@Lia siente la fuerza del viento a través del hilo de la cometa en @Isla, asombro", { style: "static" }),
      clip(8, "@Tomas: el viento tiene fuerza", "@Tomas explica a @Lia en @Isla que el viento tiene energía que mueve cosas", { style: "static" }),
    ],
  },
  {
    sceneTitle: "B06 · CLIP MUSICAL · Niños y @Tomas en dunas",
    sceneDescription: "Secuencia musical en las dunas de la isla.",
    directorCommentary: "Clip musical con coreografía en las dunas, ritmo físico legible.",
    referenceImageUrl: "",
    clips: [
      clip(1, "Apertura musical dunas", "@Isla dunas de arena cálida, viento mueve la arena suavemente, palmeras al fondo", { style: "static", timeOfDay: "afternoon" }),
      clip(2, "@Lia y @Noah bailan en dunas", "@Lia y @Noah bailan en las dunas de @Isla al compás de la música", { style: "handheld" }),
      clip(3, "@Coco hace acrobacias", "@Coco hace acrobacias cómicas en las dunas de @Isla, rueda cuesta abajo", { style: "handheld" }),
      clip(4, "@Tomas se une al baile", "@Tomas baila con @Lia y @Noah en las dunas de @Isla, movimientos grandes y divertidos", { style: "handheld", zoom: "out" }),
      clip(5, "Los cuatro en la cima de la duna", "@Tomas, @Lia, @Noah y @Coco en la cima de la duna de @Isla, vista panorámica", { style: "static", zoom: "out", timeOfDay: "sunset" }),
    ],
  },
  {
    sceneTitle: "B07 · REGRESO AL TALLER · @Lia y @Noah",
    sceneDescription: "@Lia y @Noah regresan al taller y reflexionan sobre el viento.",
    directorCommentary: "Momento tranquilo de reflexión y síntesis del aprendizaje.",
    referenceImageUrl: "",
    clips: [
      clip(1, "@Lia y @Noah regresan al taller", "@Lia y @Noah caminan de regreso al taller de @Isla al atardecer", { style: "dolly", timeOfDay: "sunset" }),
      clip(2, "@Lia reflexiona mirando el mar", "@Lia se sienta en el muelle de @Isla mirando el mar, @Noah junto a ella", { style: "static", timeOfDay: "sunset" }),
      clip(3, "@Noah: el viento trabaja sin verse", "@Noah explica a @Lia en @Isla que el viento trabaja sin poder verse", { style: "static" }),
      clip(4, "@Lia: como los amigos que ayudan", "@Lia compara el viento con los amigos que ayudan sin que los veas, @Isla de fondo", { style: "static", zoom: "in" }),
      clip(5, "@Coco abraza a @Lia", "@Coco abraza a @Lia en @Isla de forma tierna y inesperada", { style: "static" }),
    ],
  },
  {
    sceneTitle: "B08 · CIERRE · Conexión con energía",
    sceneDescription: "El grupo reflexiona sobre el viento como energía renovable.",
    directorCommentary: "Cierre pedagógico y emocional del episodio.",
    referenceImageUrl: "",
    clips: [
      clip(1, "@Tomas habla sobre energía eólica", "@Tomas reúne al grupo en @Isla y explica que el viento genera energía eléctrica", { style: "static" }),
      clip(2, "Imaginario: molinos de viento", "Visión imaginaria: molinos de viento gigantes en @Isla generando electricidad", { style: "drone", zoom: "out" }),
      clip(3, "@Lia a cámara: lección aprendida", "@Lia mira a cámara desde @Isla y resume lo que aprendió sobre el viento, boca clara", { style: "static" }),
      clip(4, "El grupo mira al horizonte", "@Tomas, @Lia, @Noah y @Coco miran al horizonte de @Isla juntos", { style: "static", timeOfDay: "sunset", zoom: "out" }),
    ],
  },
  {
    sceneTitle: "B09 · CRÉDITOS · Misterios en el cielo",
    sceneDescription: "Créditos sobre imágenes nocturnas con viento.",
    directorCommentary: "Planos nocturnos con movimiento de telas y estrellas.",
    referenceImageUrl: "",
    clips: [
      clip(1, "@Isla de noche con viento", "@Isla de noche, telas del taller moviéndose con el viento, estrellas visibles", { style: "static", timeOfDay: "night" }),
      clip(2, "Cometa solitaria de noche", "La cometa del episodio vuela sola de noche sobre @Isla, luna llena visible", { style: "static", timeOfDay: "night" }),
    ],
  },
  {
    sceneTitle: "B10 · POST-CRÉDITOS · La semilla de la idea",
    sceneDescription: "Escena corta post-créditos con la siguiente idea del grupo.",
    directorCommentary: "Gancho para el próximo episodio.",
    referenceImageUrl: "",
    clips: [
      clip(1, "@Coco encuentra algo raro", "@Coco encuentra algo extraño en la playa de @Isla al amanecer, expresión sorprendida", { style: "static", timeOfDay: "dawn" }),
      clip(2, "¿Qué encontró @Coco?", "@Coco sostiene algo misterioso hallado en @Isla, la cámara hace zoom pero no revela qué es", { style: "static", zoom: "in" }),
    ],
  },
];

/* ═══════════════════════════════════════════════════════════════════
 * EPISODIO 3 — "La semilla valiente"
 * ═══════════════════════════════════════════════════════════════════ */
export const EP3_SCENES: SceneBlueprint[] = [
  {
    sceneTitle: "B00 · COLD OPEN · Una semilla solitaria",
    sceneDescription: "@Lia encuentra una semilla sola en la arena.",
    directorCommentary: "Plano tranquilo en la playa al amanecer.",
    referenceImageUrl: "",
    clips: [
      clip(1, "Amanecer en la isla", "@Isla amanecer, horizonte rosa, olas suaves, arena húmeda", { style: "static", timeOfDay: "dawn" }),
      clip(2, "@Lia caminando sola", "@Lia camina sola por la playa de @Isla al amanecer", { style: "dolly", pan: "right", timeOfDay: "dawn" }),
      clip(3, "@Lia encuentra semilla", "@Lia descubre una pequeña semilla sola en la arena de @Isla, se agacha a verla", { style: "handheld", zoom: "in" }),
    ],
  },
  {
    sceneTitle: "B01 · OPENING · Identidad de serie",
    sceneDescription: "Opening estándar de la serie.",
    directorCommentary: "Montaje opening con los cuatro personajes.",
    referenceImageUrl: "",
    clips: [
      clip(1, "Opening montaje isla", "@Isla amanecer, los cuatro personajes en actividades cotidianas, montaje rápido", { style: "static" }),
      clip(2, "Logo La Isla Mágica", "@Isla vista aérea, logo de la serie, horizonte limpio", { style: "drone", zoom: "out" }),
    ],
  },
  {
    sceneTitle: "B02 · PLANTEAMIENTO · ¿Dónde viven las semillas?",
    sceneDescription: "El grupo investiga qué necesita la semilla para encontrar su hogar.",
    directorCommentary: "Diálogo en el taller con @Tomas como guía.",
    referenceImageUrl: "",
    clips: [
      clip(1, "@Lia muestra la semilla al grupo", "@Lia muestra la semilla encontrada al grupo en el taller de @Isla", { style: "static" }),
      clip(2, "@Tomas examina la semilla", "@Tomas examina la semilla de @Lia en @Isla con curiosidad y respeto", { style: "static", zoom: "in" }),
      clip(3, "@Noah busca en libros", "@Noah busca información sobre la semilla en sus libros en el taller de @Isla", { style: "handheld" }),
      clip(4, "@Coco muerde la semilla accidentalmente", "@Coco muerde accidentalmente la semilla en @Isla, todos gritan, la escupe rápido", { style: "static" }),
      clip(5, "@Tomas: la semilla necesita su lugar exacto", "@Tomas explica en @Isla que cada semilla tiene el lugar perfecto para crecer", { style: "static" }),
      clip(6, "@Lia decide encontrar ese lugar", "@Lia decide en @Isla que van a encontrar el lugar perfecto para la semilla", { style: "static", zoom: "in" }),
    ],
  },
  {
    sceneTitle: "B03 · EXPERIMENTO 1 · Tipos de suelo",
    sceneDescription: "El grupo compara arena, tierra y rocas para ver cuál es mejor.",
    directorCommentary: "Experimento comparativo con tres contenedores.",
    referenceImageUrl: "",
    clips: [
      clip(1, "Tres contenedores preparados", "@Tomas prepara tres contenedores con arena, tierra y grava en @Isla", { style: "static" }),
      clip(2, "Plantar en arena", "@Lia planta una semilla en el contenedor de arena de @Isla", { style: "static", zoom: "in" }),
      clip(3, "Plantar en tierra", "@Noah planta una semilla en el contenedor de tierra de @Isla", { style: "static", zoom: "in" }),
      clip(4, "@Coco planta en grava", "@Coco intenta plantar en la grava de @Isla con dificultad, cómico", { style: "static" }),
      clip(5, "Observación después de días", "Las tres semillas: comparación, la de tierra ha germinado, las otras no", { style: "static", zoom: "in" }),
      clip(6, "@Tomas explica el suelo rico", "@Tomas explica en @Isla por qué la tierra es el mejor suelo para crecer", { style: "static" }),
    ],
  },
  {
    sceneTitle: "B04 · CANCIÓN 1 · El hogar de la semilla",
    sceneDescription: "Canción sobre encontrar el lugar correcto.",
    directorCommentary: "Secuencia musical en el jardín.",
    referenceImageUrl: "",
    clips: [
      clip(1, "Apertura canción jardín", "@Lia canta en el pequeño jardín de @Isla, plantas alrededor, luz cálida", { style: "static" }),
      clip(2, "Imaginario: bosque tropical", "Visión imaginaria: semilla creciendo acelerada convirtiéndose en árbol tropical en @Isla", { style: "crane", zoom: "out" }),
      clip(3, "Los cuatro bailan entre plantas", "@Tomas, @Lia, @Noah y @Coco bailan entre las plantas del jardín de @Isla", { style: "orbit" }),
    ],
  },
  {
    sceneTitle: "B05 · EXPERIMENTO 2 · La luz que guía",
    sceneDescription: "Experimento sobre fototropismo: las plantas buscan la luz.",
    directorCommentary: "Experimento visual con caja y agujero de luz.",
    referenceImageUrl: "",
    clips: [
      clip(1, "La caja oscura con agujero", "@Tomas prepara una caja oscura con un agujero de luz en @Isla", { style: "static" }),
      clip(2, "Planta dentro de la caja", "La planta pequeña dentro de la caja oscura en @Isla, solo entra luz por un lado", { style: "static", zoom: "in" }),
      clip(3, "La planta crece hacia la luz", "La planta en @Isla se inclina hacia el agujero de luz, fototropismo visible", { style: "static", zoom: "in" }),
      clip(4, "@Lia sorprendida por el resultado", "@Lia sorprendida al abrir la caja de @Isla y ver la planta inclinada hacia la luz", { style: "static" }),
      clip(5, "@Tomas: las plantas saben buscar la luz", "@Tomas explica en @Isla que las plantas naturalmente buscan la fuente de luz", { style: "static" }),
    ],
  },
  {
    sceneTitle: "B06 · REGRESO · Plantamos la semilla valiente",
    sceneDescription: "El grupo planta la semilla encontrada en su lugar perfecto.",
    directorCommentary: "Momento emocional de plantar la semilla solitaria.",
    referenceImageUrl: "",
    clips: [
      clip(1, "El grupo busca el lugar perfecto", "@Tomas, @Lia, @Noah y @Coco caminan por @Isla buscando el lugar perfecto", { style: "dolly", pan: "right" }),
      clip(2, "@Lia elige el lugar", "@Lia señala el lugar perfecto en @Isla junto a un árbol grande que dará sombra", { style: "static" }),
      clip(3, "@Lia planta la semilla", "@Lia planta cuidadosamente la semilla solitaria en @Isla, gesto tierno", { style: "static", zoom: "in" }),
      clip(4, "El grupo riega juntos", "@Tomas, @Lia, @Noah y @Coco riegan la semilla recién plantada en @Isla", { style: "static" }),
      clip(5, "@Lia le habla a la semilla", "@Lia se agacha y le habla suavemente a la semilla recién plantada en @Isla", { style: "static", zoom: "in" }),
    ],
  },
  {
    sceneTitle: "B07 · CIERRE · Crecer lleva tiempo",
    sceneDescription: "Reflexión sobre la paciencia y el proceso de crecer.",
    directorCommentary: "Momento calmado y reflexivo al atardecer.",
    referenceImageUrl: "",
    clips: [
      clip(1, "@Lia mira donde plantó la semilla", "@Lia mira el lugar donde plantó la semilla en @Isla, expectante", { style: "static", timeOfDay: "sunset" }),
      clip(2, "@Tomas: crecer lleva tiempo", "@Tomas se sienta junto a @Lia en @Isla y le explica que crecer toma tiempo", { style: "static", timeOfDay: "sunset" }),
      clip(3, "@Lia a cámara: la lección", "@Lia mira a cámara desde @Isla y comparte la lección del día, boca clara", { style: "static" }),
      clip(4, "Los cuatro al atardecer", "@Tomas, @Lia, @Noah y @Coco al atardecer en @Isla mirando el horizonte", { style: "static", timeOfDay: "sunset", zoom: "out" }),
    ],
  },
  {
    sceneTitle: "B08 · CRÉDITOS",
    sceneDescription: "Créditos sobre la isla.",
    directorCommentary: "Planos nocturnos de la isla.",
    referenceImageUrl: "",
    clips: [
      clip(1, "@Isla de noche tranquila", "@Isla de noche, estrellas, mar en calma, luciérnagas", { style: "static", timeOfDay: "night" }),
    ],
  },
];

/* ═══════════════════════════════════════════════════════════════════
 * EPISODIO 4 — "La semillita" (Con canción)
 * Source: ep4_planteamiento_clip1.json
 * ═══════════════════════════════════════════════════════════════════ */
export const EP4_SCENES: SceneBlueprint[] = [
  {
    sceneTitle: "B00 · COLD OPEN · La mañana en el huerto",
    sceneDescription: "@Tomas riega el pequeño huerto al amanecer.",
    directorCommentary: "Plano que establece el huerto y el ritual matutino de Tomas.",
    referenceImageUrl: "",
    clips: [
      clip(1, "Amanecer en la isla, huerto", "@Isla amanecer, huerto pequeño con tierra oscura, un pequeño brote de maíz visible, luz tropical suave", { style: "static", timeOfDay: "dawn" }),
      clip(2, "@Tomas riega el huerto", "@Tomas riega el huerto de @Isla con regadera, arco de agua brillando con la luz solar, cuerpo moviéndose suavemente", { style: "static", timeOfDay: "dawn" }),
      clip(3, "Primer plano del brote", "Primer plano del pequeño brote de maíz en el huerto de @Isla, agua cayendo alrededor", { style: "static", zoom: "in" }),
    ],
  },
  {
    sceneTitle: "B01 · OPENING · Identidad de serie",
    sceneDescription: "Opening estándar.",
    directorCommentary: "Montaje y logo.",
    referenceImageUrl: "",
    clips: [
      clip(1, "Opening montaje isla", "@Isla montaje de actividades cotidianas de los cuatro personajes, luz cálida", { style: "static" }),
      clip(2, "Logo La Isla Mágica", "@Isla vista aérea amplia con logo de la serie", { style: "drone", zoom: "out" }),
    ],
  },
  {
    sceneTitle: "B02 · PLANTEAMIENTO · La canción de la semillita",
    sceneDescription: "@Tomas canta mientras riega. Los niños llegan y se unen.",
    directorCommentary: "Secuencia musical al 131.88 BPM. Tomas en el huerto.",
    referenceImageUrl: "",
    clips: [
      clip(1, "@Tomas solo en el huerto cantando", "@Tomas solo en el huerto de @Isla, riega cantando silenciosamente, cuerpo meciéndose al ritmo", { style: "static" }),
      clip(2, "Plano bajo del suelo y la semilla", "Plano bajo desde el suelo del huerto de @Isla, @Tomas en segundo plano, la semilla en primer plano con agua cayendo", { style: "static", zoom: "in" }),
      clip(3, "@Tomas perfil caminando por el huerto", "@Tomas camina por el borde del huerto de @Isla en perfil, regadera en mano, un paso por dos tiempos", { style: "static" }),
      clip(4, "@Lia y @Noah llegan al huerto", "@Lia y @Noah llegan al huerto de @Isla y ven a @Tomas cantando, curiosos", { style: "handheld" }),
      clip(5, "@Coco llega imitando a @Tomas", "@Coco llega al huerto de @Isla imitando el baile de @Tomas con una ramita como regadera", { style: "static" }),
      clip(6, "Los cuatro en el huerto cantando", "@Tomas, @Lia, @Noah y @Coco en el huerto de @Isla, todos mimetizando el riego", { style: "static", zoom: "out" }),
    ],
  },
  {
    sceneTitle: "B03 · EXPERIMENTO 1 · ¿Qué come una planta?",
    sceneDescription: "El grupo aprende sobre la fotosíntesis de forma simple.",
    directorCommentary: "Experimento didáctico con hojas y luz.",
    referenceImageUrl: "",
    clips: [
      clip(1, "@Tomas: las plantas hacen su comida", "@Tomas le explica al grupo en @Isla que las plantas fabrican su propio alimento", { style: "static" }),
      clip(2, "Experimento con hoja y luz", "@Tomas pone una hoja al sol en @Isla y explica el proceso de fotosíntesis simplificado", { style: "static", zoom: "in" }),
      clip(3, "@Lia: ¿la planta se hace su almuerzo?", "@Lia sorprendida pregunta si la planta se hace su propio almuerzo en @Isla", { style: "static" }),
      clip(4, "@Coco intenta comer tierra", "@Coco intenta comer tierra imitando a la planta en @Isla, todos ríen", { style: "static" }),
      clip(5, "@Tomas explica agua + sol + aire", "@Tomas explica en @Isla que las plantas necesitan agua, sol y aire para crear comida", { style: "static" }),
    ],
  },
  {
    sceneTitle: "B04 · CANCIÓN 2 · La danza de la fotosíntesis",
    sceneDescription: "Canción-danza sobre el proceso de fotosíntesis.",
    directorCommentary: "Clip musical vibrante con los cuatro personajes.",
    referenceImageUrl: "",
    clips: [
      clip(1, "Apertura baile en el huerto", "@Lia empieza a bailar en el huerto de @Isla al ritmo de la canción", { style: "static" }),
      clip(2, "Imaginario: planta gigante creciendo", "Visión imaginaria: planta gigante creciendo en @Isla, absorbiendo luz solar", { style: "crane", zoom: "out" }),
      clip(3, "Los cuatro bailan juntos", "@Tomas, @Lia, @Noah y @Coco bailan el proceso de fotosíntesis en @Isla", { style: "orbit" }),
    ],
  },
  {
    sceneTitle: "B05 · EXPERIMENTO 2 · El huerto crece",
    sceneDescription: "El grupo observa el crecimiento del huerto a lo largo del día.",
    directorCommentary: "Time-lapse imaginario del crecimiento.",
    referenceImageUrl: "",
    clips: [
      clip(1, "El huerto en la mañana", "@Isla huerto en la mañana, brotes pequeños, @Tomas los observa", { style: "static", timeOfDay: "day" }),
      clip(2, "El huerto al mediodía", "@Isla huerto al mediodía, sol intenso, plantas creciendo visiblemente", { style: "static", timeOfDay: "afternoon" }),
      clip(3, "@Lia mide el crecimiento", "@Lia mide el crecimiento de las plantas del huerto de @Isla con una regla pequeña", { style: "static", zoom: "in" }),
      clip(4, "El grupo celebra el crecimiento", "@Tomas, @Lia, @Noah y @Coco celebran el crecimiento visible del huerto de @Isla", { style: "static" }),
    ],
  },
  {
    sceneTitle: "B06 · CIERRE · El huerto de todos",
    sceneDescription: "El huerto es de todos y todos lo cuidan.",
    directorCommentary: "Momento emocional de pertenencia colectiva.",
    referenceImageUrl: "",
    clips: [
      clip(1, "El grupo cuida el huerto juntos", "@Tomas, @Lia, @Noah y @Coco cuidan el huerto de @Isla juntos al atardecer", { style: "static", timeOfDay: "sunset" }),
      clip(2, "@Lia a cámara: lección de hoy", "@Lia mira a cámara desde @Isla y comparte la lección sobre cuidar las plantas", { style: "static" }),
      clip(3, "Los cuatro al atardecer", "@Tomas, @Lia, @Noah y @Coco contemplan el huerto al atardecer en @Isla", { style: "static", timeOfDay: "sunset", zoom: "out" }),
    ],
  },
  {
    sceneTitle: "B07 · CRÉDITOS",
    sceneDescription: "Créditos nocturnos.",
    directorCommentary: "El huerto de noche bajo la luna.",
    referenceImageUrl: "",
    clips: [
      clip(1, "Huerto de noche bajo la luna", "@Isla huerto de noche, luna llena iluminando las plantas, ambiente mágico", { style: "static", timeOfDay: "night" }),
    ],
  },
];

/* ═══════════════════════════════════════════════════════════════════
 * EPISODIO 5 — "El agua que viaja"
 * ═══════════════════════════════════════════════════════════════════ */
export const EP5_SCENES: SceneBlueprint[] = [
  {
    sceneTitle: "B00 · COLD OPEN · La lluvia llega",
    sceneDescription: "Una lluvia inesperada sorprende al grupo.",
    directorCommentary: "Tormenta rápida sobre la isla.",
    referenceImageUrl: "",
    clips: [
      clip(1, "Nubes grises sobre la isla", "@Isla nubes grises acercándose, el cielo cambia rápidamente", { style: "drone", timeOfDay: "afternoon" }),
      clip(2, "Primeras gotas de lluvia", "@Isla primeras gotas de lluvia cayendo en el mar turquesa", { style: "static", zoom: "in" }),
      clip(3, "@Noah descubre las nubes", "@Noah mira al cielo de @Isla con asombro, señala las nubes de tormenta", { style: "handheld" }),
    ],
  },
  {
    sceneTitle: "B01 · OPENING · Identidad de serie",
    sceneDescription: "Opening estándar.",
    directorCommentary: "Montaje y logo.",
    referenceImageUrl: "",
    clips: [
      clip(1, "Opening montaje isla", "@Isla montaje rápido de momentos icónicos, los cuatro personajes", { style: "static" }),
      clip(2, "Logo La Isla Mágica", "@Isla vista aérea con logo", { style: "drone", zoom: "out" }),
    ],
  },
  {
    sceneTitle: "B02 · PLANTEAMIENTO · ¿De dónde viene la lluvia?",
    sceneDescription: "El grupo pregunta sobre el origen de la lluvia.",
    directorCommentary: "Diálogo bajo techo con lluvia al fondo.",
    referenceImageUrl: "",
    clips: [
      clip(1, "El grupo se refugia en el taller", "@Tomas, @Lia, @Noah y @Coco se refugian del aguacero en el taller de @Isla", { style: "static" }),
      clip(2, "@Lia: ¿de dónde viene el agua?", "@Lia pregunta de dónde viene la lluvia en el taller de @Isla, lluvia al fondo", { style: "static" }),
      clip(3, "@Tomas: el ciclo del agua", "@Tomas inicia la explicación del ciclo del agua en @Isla con gestos", { style: "static" }),
      clip(4, "@Noah dibuja el ciclo", "@Noah dibuja el ciclo del agua en un papel en el taller de @Isla", { style: "static", zoom: "in" }),
      clip(5, "@Coco sale bajo la lluvia", "@Coco sale corriendo bajo la lluvia de @Isla y regresa empapado", { style: "handheld" }),
    ],
  },
  {
    sceneTitle: "B03 · EXPERIMENTO 1 · Evaporación visible",
    sceneDescription: "Experimento para ver el agua evaporarse.",
    directorCommentary: "Experimento con calor y agua en el taller.",
    referenceImageUrl: "",
    clips: [
      clip(1, "@Tomas calienta agua", "@Tomas calienta agua en recipiente en @Isla, vapor visible", { style: "static", zoom: "in" }),
      clip(2, "El vapor sube", "Primer plano del vapor de agua subiendo en @Isla, luz natural iluminándolo", { style: "static", zoom: "in" }),
      clip(3, "@Lia toca el vapor", "@Lia toca el vapor con la mano en @Isla, sensación de calor húmedo", { style: "static" }),
      clip(4, "@Tomas: así se forman las nubes", "@Tomas explica en @Isla que así el agua sube y forma nubes en el cielo", { style: "static" }),
      clip(5, "@Noah muestra el dibujo del ciclo", "@Noah muestra su dibujo del ciclo del agua al grupo en @Isla", { style: "static" }),
    ],
  },
  {
    sceneTitle: "B04 · CANCIÓN · El agua que viaja",
    sceneDescription: "Canción sobre el ciclo del agua.",
    directorCommentary: "Clip musical sobre el viaje del agua.",
    referenceImageUrl: "",
    clips: [
      clip(1, "Apertura canción agua", "@Lia canta mirando la lluvia desde el taller de @Isla, melodía suave", { style: "static" }),
      clip(2, "Imaginario: gota que viaja", "Visión imaginaria: una gota de agua viajando desde el océano hasta las nubes en @Isla", { style: "crane", zoom: "out" }),
      clip(3, "Los cuatro danzan con agua", "@Tomas, @Lia, @Noah y @Coco danzan con el agua de la lluvia en @Isla", { style: "orbit" }),
    ],
  },
  {
    sceneTitle: "B05 · EXPERIMENTO 2 · Hacemos una nube",
    sceneDescription: "El grupo crea condensación en una botella.",
    directorCommentary: "Experimento de condensación en botella.",
    referenceImageUrl: "",
    clips: [
      clip(1, "@Tomas prepara la botella", "@Tomas prepara botella de agua caliente cubierta con hielo en @Isla", { style: "static" }),
      clip(2, "Vapor y condensación visible", "Gotas de agua formándose en el interior frío de la botella en @Isla", { style: "static", zoom: "in" }),
      clip(3, "@Lia: ¡hicimos una nube!", "@Lia emocionada señala las gotas en la botella de @Isla gritando que hicieron una nube", { style: "static" }),
      clip(4, "@Tomas: así funciona el cielo", "@Tomas explica en @Isla que el cielo funciona igual que la botella", { style: "static" }),
    ],
  },
  {
    sceneTitle: "B06 · CIERRE · El agua que regresa",
    sceneDescription: "La lluvia pasa y el grupo observa el arcoíris.",
    directorCommentary: "Momento visual con arcoíris sobre la isla.",
    referenceImageUrl: "",
    clips: [
      clip(1, "Para de llover", "@Isla deja de llover, cielo despejándose, arena húmeda brillante", { style: "static" }),
      clip(2, "El arcoíris aparece", "@Isla arcoíris apareciendo sobre el océano, los cuatro salen a verlo", { style: "static", zoom: "out" }),
      clip(3, "@Lia a cámara: el ciclo del agua", "@Lia mira a cámara desde @Isla y explica el ciclo del agua de forma simple", { style: "static" }),
      clip(4, "Los cuatro mirando el arcoíris", "@Tomas, @Lia, @Noah y @Coco mirando el arcoíris sobre @Isla", { style: "static", timeOfDay: "afternoon", zoom: "out" }),
    ],
  },
  {
    sceneTitle: "B07 · CRÉDITOS",
    sceneDescription: "Créditos nocturnos.",
    directorCommentary: "La isla después de la lluvia.",
    referenceImageUrl: "",
    clips: [
      clip(1, "@Isla brillante después de la lluvia", "@Isla mojada y brillante al atardecer, plantas con gotas, horizonte limpio", { style: "static", timeOfDay: "sunset" }),
    ],
  },
];

/* ═══════════════════════════════════════════════════════════════════
 * EPISODIO 6 — "La luz que todo lo puede"
 * ═══════════════════════════════════════════════════════════════════ */
export const EP6_SCENES: SceneBlueprint[] = [
  {
    sceneTitle: "B00 · COLD OPEN · El gran apagón",
    sceneDescription: "La isla se queda sin energía por primera vez.",
    directorCommentary: "Noche oscura, taller sin luz, sorpresa.",
    referenceImageUrl: "",
    clips: [
      clip(1, "@Isla de noche, sin energía", "@Isla de noche, completamente oscura excepto la luna, ambiente misterioso", { style: "static", timeOfDay: "night" }),
      clip(2, "@Tomas intenta encender la luz", "@Tomas en el taller oscuro de @Isla intenta encender la luz sin éxito", { style: "handheld", timeOfDay: "night" }),
      clip(3, "@Lia y @Noah asustados", "@Lia y @Noah en el taller oscuro de @Isla, asustados pero curiosos", { style: "static", timeOfDay: "night" }),
    ],
  },
  {
    sceneTitle: "B01 · OPENING · Identidad de serie",
    sceneDescription: "Opening estándar.",
    directorCommentary: "Montaje y logo.",
    referenceImageUrl: "",
    clips: [
      clip(1, "Opening montaje isla", "@Isla montaje de los cuatro personajes en actividades cotidianas", { style: "static" }),
      clip(2, "Logo La Isla Mágica", "@Isla vista aérea con logo de la serie, luz cálida", { style: "drone", zoom: "out" }),
    ],
  },
  {
    sceneTitle: "B02 · PLANTEAMIENTO · ¿De dónde viene la energía?",
    sceneDescription: "El grupo investiga cómo obtener energía en la isla.",
    directorCommentary: "Diálogo a la luz de velas en el taller.",
    referenceImageUrl: "",
    clips: [
      clip(1, "El grupo con velas encendidas", "@Tomas, @Lia, @Noah y @Coco con velas en el taller oscuro de @Isla", { style: "static", timeOfDay: "night" }),
      clip(2, "@Lia: ¿cómo hacemos luz?", "@Lia pregunta cómo pueden hacer luz propia en @Isla, cara curiosa", { style: "static", timeOfDay: "night" }),
      clip(3, "@Tomas: la isla tiene muchas fuentes", "@Tomas explica que la isla tiene sol, viento y agua para generar energía", { style: "static" }),
      clip(4, "@Noah menciona los paneles solares", "@Noah menciona los paneles solares que vio en un libro en @Isla", { style: "static" }),
      clip(5, "@Tomas: mañana construimos uno", "@Tomas propone al grupo en @Isla construir un panel solar casero al día siguiente", { style: "static" }),
    ],
  },
  {
    sceneTitle: "B03 · EXPERIMENTO 1 · El calor del sol",
    sceneDescription: "El grupo experimenta cómo el sol calienta superficies.",
    directorCommentary: "Experimento de absorción de calor solar.",
    referenceImageUrl: "",
    clips: [
      clip(1, "Dos superficies al sol", "@Tomas prepara superficie negra y blanca al sol de @Isla para comparar", { style: "static" }),
      clip(2, "@Lia toca la superficie negra", "@Lia toca la superficie negra en @Isla, retira la mano rápido por el calor", { style: "static", zoom: "in" }),
      clip(3, "@Lia toca la superficie blanca", "@Lia toca la superficie blanca en @Isla, fresca al tacto", { style: "static", zoom: "in" }),
      clip(4, "@Noah: el negro absorbe más calor", "@Noah explica en @Isla que el color oscuro absorbe más energía solar", { style: "static" }),
      clip(5, "@Coco se pinta de negro para probar", "@Coco se pinta la panza de negro en @Isla para probar si se calienta más, todos ríen", { style: "static" }),
    ],
  },
  {
    sceneTitle: "B04 · CANCIÓN · La danza de la luz",
    sceneDescription: "Canción sobre la energía solar.",
    directorCommentary: "Clip musical vibrante con el sol como protagonista.",
    referenceImageUrl: "",
    clips: [
      clip(1, "Amanecer musical en la isla", "@Isla amanecer, primeros rayos del sol, @Lia canta bienvenida al sol", { style: "static", timeOfDay: "dawn" }),
      clip(2, "Imaginario: isla llena de paneles solares", "Visión imaginaria: @Isla cubierta de paneles solares brillantes, energía limpia", { style: "drone", zoom: "out" }),
      clip(3, "Los cuatro bailan con el sol", "@Tomas, @Lia, @Noah y @Coco bailan con los rayos del sol en @Isla", { style: "orbit", timeOfDay: "day" }),
    ],
  },
  {
    sceneTitle: "B05 · EXPERIMENTO 2 · Construimos un calentador solar",
    sceneDescription: "El grupo construye un calentador solar simple.",
    directorCommentary: "Construcción con materiales reciclados de la isla.",
    referenceImageUrl: "",
    clips: [
      clip(1, "@Tomas diseña el calentador", "@Tomas dibuja el diseño del calentador solar en papel en @Isla", { style: "static", zoom: "in" }),
      clip(2, "El grupo construye juntos", "@Tomas, @Lia, @Noah y @Coco construyen el calentador solar con materiales reciclados en @Isla", { style: "handheld" }),
      clip(3, "@Coco pega el papel aluminio", "@Coco pega papel aluminio al calentador en @Isla con entusiasmo excesivo", { style: "static" }),
      clip(4, "Ponen el calentador al sol", "El grupo pone el calentador solar terminado al sol de @Isla", { style: "static" }),
      clip(5, "El agua se calienta", "El agua dentro del calentador de @Isla empieza a calentarse, vapor suave visible", { style: "static", zoom: "in" }),
      clip(6, "@Lia: ¡funciona!", "@Lia emocionada grita que funciona el calentador en @Isla", { style: "static" }),
    ],
  },
  {
    sceneTitle: "B06 · CIERRE · La isla brillante",
    sceneDescription: "El grupo reflexiona sobre la energía renovable.",
    directorCommentary: "Cierre optimista con la isla iluminada.",
    referenceImageUrl: "",
    clips: [
      clip(1, "@Tomas sobre energía limpia", "@Tomas explica en @Isla que el sol da energía limpia sin contaminar", { style: "static" }),
      clip(2, "La isla con sus primeras luces solares", "@Isla con pequeñas luces solares encendidas al atardecer, mágico", { style: "static", timeOfDay: "sunset" }),
      clip(3, "@Lia a cámara: lección de hoy", "@Lia mira a cámara desde @Isla y comparte la lección sobre energía solar", { style: "static" }),
      clip(4, "Los cuatro bajo las estrellas y la luz solar", "@Tomas, @Lia, @Noah y @Coco bajo las estrellas de @Isla con luz solar propia", { style: "static", timeOfDay: "night", zoom: "out" }),
    ],
  },
  {
    sceneTitle: "B07 · CRÉDITOS",
    sceneDescription: "Créditos con la isla brillante.",
    directorCommentary: "La isla de noche con sus nuevas luces.",
    referenceImageUrl: "",
    clips: [
      clip(1, "@Isla de noche con luces solares", "@Isla de noche con pequeñas luces solares brillando, estrellas y luna visibles", { style: "static", timeOfDay: "night" }),
    ],
  },
];

/* ─── Episode registry ─────────────────────────────────────────── */
export interface Episode {
  id: string;
  title: string;
  subtitle: string;
  scenes: SceneBlueprint[];
}

export const EPISODES: Episode[] = [
  { id: "EP01", title: "EP 01", subtitle: "El gran invento", scenes: EP1_SCENES },
  { id: "EP02", title: "EP 02", subtitle: "El viento y las olas", scenes: EP2_SCENES },
  { id: "EP03", title: "EP 03", subtitle: "La semilla valiente", scenes: EP3_SCENES },
  { id: "EP04", title: "EP 04", subtitle: "La semillita", scenes: EP4_SCENES },
  { id: "EP05", title: "EP 05", subtitle: "El agua que viaja", scenes: EP5_SCENES },
  { id: "EP06", title: "EP 06", subtitle: "La luz que todo lo puede", scenes: EP6_SCENES },
];

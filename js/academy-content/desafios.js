/*
 * Basket Lab Academy · Desafíos tácticos
 *
 * Cada desafío parte de una situación que ya existe en el simulador de una guía,
 * usa sus pizarras y cita sus fuentes ([S1]..[Sn] remiten a la bibliografía de esa guía).
 * Las evaluaciones son una interpretación técnica de BasketIQ a partir de esas guías:
 * cuando hay más de una solución razonable, hay más de una respuesta recomendada.
 *
 * Coordenadas en metros, iguales a las del simulador de cada guía.
 */
(function (root, factory) {
    var challenges = factory();
    if (typeof module === "object" && module.exports) module.exports = challenges;
    if (root) {
        if (root.BasketChallenges) challenges.forEach(function (c) { root.BasketChallenges.register(c); });
        else root.BasketChallengesQueue = (root.BasketChallengesQueue || []).concat(challenges);
    }
})(typeof window !== "undefined" ? window : null, function () {
    "use strict";

    return [
        {
            id: "zona23-poste-alto",
            articleId: "zona-2-3",
            topic: "Defensa zonal",
            title: "Zona 2-3: pase al poste alto",
            kind: "interpretation",
            refs: ["S2"],
            situation: {
                variant: "base",
                position: "top",
                override: { pos: { o5: [5.4, 7.5] } },
                arrows: [["cut", [1, 14.3], "o5"], ["pass", "o1", "o5"]],
                caption: "Zona 2-3 con X1 sobre el balón. El 5 sube desde la esquina izquierda a la línea de libres y el 1 le pasa."
            },
            context: "El balón está por entrar al poste alto: el receptor va a quedar en el centro de la zona y de frente al aro.",
            question: "¿Cómo ajusta la zona 2-3 cuando el balón entra al poste alto?",
            options: [
                {
                    id: "a",
                    label: "Los dos bases se cierran sobre el poste desde arriba, los aleros se hunden hacia los postes bajos y X5 se queda entre el balón y el aro.",
                    verdict: "best",
                    analysis: "Es la variante A de la guía, basada en el principio de WABC de presionar el poste alto desde los bases [S2]. X5 sigue protegiendo el aro. Lo que se concede es el tiro de las alas si el balón sale rápido, así que los bases tienen que estar listos para volver a cerrar. Conviene contra postes altos que penetran."
                },
                {
                    id: "b",
                    label: "X5 sube a contener al poste, X3 y X4 se juntan delante del aro y los bases se abren hacia las alas.",
                    verdict: "best",
                    analysis: "Es la variante B de la guía, una variante de la app: no es mejor ni peor que la A. Contiene al poste y deja a los bases cerca de las alas, pero expone más el fondo y los cortes por la línea final. Conviene contra postes altos que tiran de media distancia."
                },
                {
                    id: "c",
                    label: "X5 sube a contener al poste y los dos bases también se cierran sobre él.",
                    verdict: "poor",
                    analysis: "Mezcla las dos respuestas, algo que la guía pide evitar. Con tres defensores sobre un mismo atacante, nadie corta los pases a las alas y el aro queda sin su protector: un pase rápido afuera o a un corte por el fondo encuentra a alguien solo."
                },
                {
                    id: "d",
                    label: "Nadie cambia de lugar: cada uno se queda en su ubicación de la alineación.",
                    verdict: "poor",
                    analysis: "El poste alto queda cómodo en el centro y de frente al aro, que es justamente lo que vuelve peligroso ese pase. Puede tirar, penetrar o pasar a los postes bajos sin que nadie lo moleste."
                }
            ],
            explanation: [
                "El receptor en el poste alto queda en el centro de la zona y de frente al aro: puede tirar, penetrar o pasar a los postes bajos. Por eso WABC propone presionarlo desde los bases con al menos un brazo por delante del atacante, desde antes de que reciba [S2].",
                "Si el balón entra igual, hay dos respuestas habituales y cada una protege un espacio distinto. En la variante A, X5 cubre el aro y se concede el tiro de las alas. En la variante B, X5 contiene al poste y se concede el fondo. Lo importante es que todo el equipo sepa cuál juega y no mezcle las dos."
            ],
            alternatives: [
                "Negar el pase antes de que llegue: el base del lado del corte se cruza en el camino del 5 con el brazo delante [S2]. Si el pase no entra, no hace falta ajustar.",
                "Elegir la respuesta según el rival: la A contra postes que penetran, la B contra postes que tiran de media distancia.",
                "En la pestaña Simular de la guía podés comparar las dos con el balón en el poste alto: «Base: línea de recogida» y «El pívot defiende el poste alto»."
            ],
            boards: [
                { label: "Variante A", board: "poste-alto-a" },
                { label: "Variante B", board: "poste-alto-b" }
            ],
            related: { tab: "aprender", section: "explicacion", label: "5.5 Defensa del poste alto" }
        },
        {
            id: "tres-contra-dos-pase",
            articleId: "superioridades",
            topic: "Superioridades",
            title: "3 contra 2: el pase que genera la ventaja",
            kind: "interpretation",
            refs: ["S2"],
            situation: {
                variant: "tres-espera",
                position: "pasar",
                caption: "3 contra 2 contra una defensa en «I». X1 no salió al balón, el 1 pasó al ala y X2 salió a tomar al 2. El 3 ataca el aro y el 1 fue al codo."
            },
            context: "X1 bajó hacia el aro para cortar el pase al 3.",
            question: "El 2 tiene el balón en el ala. ¿Qué pase genera la ventaja?",
            options: [
                {
                    id: "a",
                    label: "Pase de vuelta al 1, en el codo.",
                    verdict: "best",
                    analysis: "X1 bajó a cortar el pase al 3 y X2 está con el 2: el libre es el 1. El manual señala que el error más común en el 3 contra 2 es no devolverle el balón al base [S2]. El 1 tiene que recibir listo para tirar o penetrar antes de que X2 recupere."
                },
                {
                    id: "b",
                    label: "Pase al 3, que corta hacia el aro.",
                    verdict: "risky",
                    analysis: "Sería la opción si X1 se hubiera quedado arriba. Acá X1 bajó justo a esa línea de pase: el pase puede ser interceptado o llegar con un defensor encima."
                },
                {
                    id: "c",
                    label: "Penetrar hacia el aro con el balón.",
                    verdict: "poor",
                    analysis: "X2 está delante del 2 y X1 cerca del aro: el carril de penetración está defendido. El principio del contraataque es pasar cuando el carril está defendido y seguir hasta el aro cuando no lo está [S1]."
                },
                {
                    id: "d",
                    label: "Frenar y esperar a los compañeros para armar el ataque.",
                    verdict: "poor",
                    analysis: "La ventaja dura hasta que llega el defensor que recupera [S2]. Esperar es uno de los errores frecuentes de la guía: se cambia un 3 contra 2 por un ataque contra la defensa ya ordenada."
                }
            ],
            explanation: [
                "En el 3 contra 2 el objetivo es que un defensor se comprometa con el balón y, con un pase, convertir la jugada en un 2 contra 1 [S2]. Contra una defensa en «I», si el de arriba no sale, el pase al ala obliga al de abajo a dejar la zona: el alero contrario ataca el aro y el base va al codo del lado del balón [S2].",
                "En ese momento X1 tiene que elegir entre el que corta y el base. Si baja a cortar el pase al 3, el libre es el 1. Por eso el que pasa sigue siendo una amenaza: tiene que poder tirar o penetrar si el balón vuelve [S2]."
            ],
            alternatives: [
                "Si X1 se queda arriba con el 1, el pase al 3, que corta al aro, es la opción [S2].",
                "Si el primer defensor sale al balón desde el principio, la ventaja aparece antes: pase rápido al ala y 2 contra 1 contra el defensor de abajo [S2]. Lo podés ver en la segunda pizarra.",
                "Con un buen tirador en el codo, el 1 puede tirar apenas recibe; si X2 vuelve a cerrar, penetra."
            ],
            boards: [
                { label: "Pizarra de la guía", board: "tres-contra-dos" },
                { label: "Si X1 sale al balón", title: "3 contra 2: el primer defensor sale al balón", intro: "Secuencia del simulador de la guía con la variante en la que X1 se compromete con el balón [S2].", sim: { variant: "tres-sale", positions: ["inicio", "fijar", "pasar"] } }
            ],
            related: { tab: "aprender", section: "explicacion", label: "5.3 El pase de vuelta" }
        },
        {
            id: "spacing-receptor",
            articleId: "spacing",
            topic: "Conceptos de ataque",
            title: "Spacing: dónde se ubica el receptor",
            kind: "interpretation",
            refs: ["S5"],
            situation: {
                variant: "base",
                position: "penetracion",
                override: { pos: { o4: [1.3, 0.9] } },
                arrows: [["dribble", [6.7, 2.4], "o2"]],
                caption: "Cinco abiertos. El 2 penetra desde el ala derecha con los dos pies dentro de la zona y X5 sale a frenarlo desde el lado débil."
            },
            context: "El 4 está en la esquina del lado del balón, con X4 entre él y la zona.",
            question: "¿Qué espacio debería ocupar el 4 mientras el 2 penetra?",
            options: [
                {
                    id: "a",
                    label: "Subir detrás del que penetra, a distancia de pase, como salida.",
                    verdict: "best",
                    analysis: "Es lo que propone el manual: el receptor del lado del balón se coloca detrás del que penetra como salida, sin acercarse demasiado para que su defensor no moleste [S5]. Si X4 ayuda, el pase hacia atrás encuentra al 4 libre."
                },
                {
                    id: "b",
                    label: "Quedarse abierto en la esquina.",
                    verdict: "valid",
                    analysis: "Puede funcionar: la esquina estira la ayuda de X4 y la guía la menciona como opción según el lado. Frente a la salida detrás del balón, tiene una desventaja: si el 2 se frena en la zona, no tiene un pase de seguridad hacia atrás."
                },
                {
                    id: "c",
                    label: "Acercarse al que penetra para pedir un pase corto.",
                    verdict: "poor",
                    analysis: "Trae a su propio defensor a la ayuda: X4 puede frenar la penetración y seguir cerca del 4 a la vez. Es uno de los errores frecuentes de la guía, con la consigna «¡Dale lugar!»."
                }
            ],
            explanation: [
                "Un buen espacio de recepción está lejos del defensor que ayuda y en la línea de un pase directo desde el balón. Cuando un compañero penetra, el manual WABC ubica a los receptores: el del lado contrario se abre para tirar, el del lado del balón se coloca detrás del que penetra y el de arriba se queda para el equilibrio defensivo [S5].",
                "Así cada defensor tiene que elegir: si ayuda, deja a su jugador a un pase directo; si no ayuda, la penetración sigue hasta el aro. Si el receptor se acerca al balón, la elección desaparece, porque un mismo defensor alcanza a cubrir a dos."
            ],
            alternatives: [
                "Si X5 sale a frenar desde el lado débil, la descarga es a la esquina que dejó libre, la del 5 [S5].",
                "Si nadie frena, el que penetra piensa primero en anotar [S5].",
                "Si el que penetra es el de arriba, el que se ubica detrás del balón es el ala de ese lado [S5]."
            ],
            boards: [
                { label: "Pizarra de la guía", board: "penetracion-receptores" },
                { label: "Con jugadores agrupados", title: "La misma penetración con jugadores agrupados", intro: "Secuencia del simulador de la guía: con los atacantes cerca del balón, las ayudas son cortas y la penetración choca.", sim: { variant: "agrupados", positions: ["inicio", "penetracion"] } }
            ],
            related: { tab: "aprender", section: "explicacion", label: "5.5 Las penetraciones" }
        },
        {
            id: "pick-and-roll-drop",
            articleId: "pick-and-roll",
            topic: "Conceptos de ataque",
            title: "Pick and roll: leer el drop",
            kind: "interpretation",
            refs: ["S5"],
            situation: {
                variant: "drop",
                position: "lectura",
                caption: "Pick and roll central contra drop: X5 se quedó atrás, entre el balón y el aro, y X1 persigue al base por detrás. El 5 continúa."
            },
            context: "El 1 salió del bloqueo con dribbling y X5 no sube a frenarlo.",
            question: "¿Qué lectura hace el base?",
            options: [
                {
                    id: "a",
                    label: "Tiro de media distancia o flotadora tras el dribbling.",
                    verdict: "best",
                    analysis: "Es el espacio que el drop concede a propósito: X5 queda lejos del base para proteger el aro y la continuación. Es la mejor opción si el base tiene ese tiro; si no lo tiene, la cobertura cumplió su objetivo."
                },
                {
                    id: "b",
                    label: "Pase bombeado o picado a la continuación del 5.",
                    verdict: "valid",
                    analysis: "Es la otra respuesta habitual contra el drop. Con X5 atrás, el pase tiene que pasar por encima o al costado de él, y X3 y X4 se hunden para que no sea cómodo. Gana valor si X5 sube al tiro: ahí el 5 queda libre."
                },
                {
                    id: "c",
                    label: "Descarga a la esquina del lado del balón.",
                    verdict: "risky",
                    analysis: "X2 se quedó con el tirador de esa esquina y no ayudó: el pase no encuentra a nadie libre y el base pierde la ventaja que tenía."
                },
                {
                    id: "d",
                    label: "Seguir con el dribbling hasta el aro.",
                    verdict: "poor",
                    analysis: "Es justo lo que el drop protege: X5 está entre el balón y el aro, y X3 se hunde desde el ala contraria como primera ayuda."
                }
            ],
            explanation: [
                "En el drop, el defensor del bloqueador se queda atrás conteniendo y el del balón pasa por arriba y persigue. Protege el aro y la continuación y concede el tiro de media distancia. La idea es cercana a «contener» del manual WABC de nivel 3 [S5].",
                "Por eso el base lee a X5: si se queda atrás, el tiro o la flotadora están disponibles; si sube a ese tiro, se abre la continuación. Qué cobertura conviene depende del rival: el drop es cómodo contra bases que no tiran de media distancia y peligroso si el bloqueador es tirador."
            ],
            alternatives: [
                "Pick and pop: si el bloqueador tira, abrirse en lugar de continuar castiga el drop.",
                "Si X4 se va a frenar la continuación, queda disponible el pase a la esquina contraria: cuando un defensor ayuda, el pase que sale es a su atacante.",
                "Contra un switch la lectura cambia: atacar con dribbling al interior que quedó en el perímetro o meter el balón al bloqueador sellado. Lo podés ver en la segunda pizarra."
            ],
            boards: [
                { label: "Drop", title: "Drop: uso del bloqueo, continuación y lectura", intro: "Secuencia del simulador de la guía con la cobertura drop.", sim: { variant: "drop", positions: ["uso", "continuacion", "lectura"] } },
                { label: "Contra el switch", title: "Switch: uso del bloqueo y lectura", intro: "La misma acción contra una defensa que cambia de marca.", sim: { variant: "switch", positions: ["uso", "lectura"] } }
            ],
            related: { tab: "aprender", section: "explicacion", label: "5.3 Drop (contener)" }
        },
        {
            id: "presion-rotacion",
            articleId: "presion",
            topic: "Presión",
            title: "Presión: quién toma el pase que sale del doble",
            kind: "interpretation",
            refs: ["S1"],
            situation: {
                variant: "individual",
                position: "trampa",
                arrows: [["pass", "o1", "o5"]],
                caption: "Presión individual a toda la cancha. X1 encauzó al 1 por la banda y X5 dobló desde adelante. El 1 suelta el pase al 5, que quedó sin marca."
            },
            context: "X2 y X4 están interceptando y X3 cuida el aro.",
            question: "¿Qué defensor debe tomar al 5?",
            options: [
                {
                    id: "x2",
                    label: "X2, el interceptor que está entre el 2 y el 5.",
                    verdict: "best",
                    analysis: "X2 es quien ve el pase, y la regla del manual es que la rotación la hace el defensor que ve el pase [S1]. Mientras tanto, X5 ayuda al que ayudó y va hacia el 2."
                },
                {
                    id: "x5",
                    label: "X5, que vuelve a su marca.",
                    verdict: "poor",
                    analysis: "X5 está en el doble, del otro lado del balón: llega tarde y el 5 avanza sin oposición. En la rotación, X5 va hacia el 2, el atacante que dejó X2 [S1]."
                },
                {
                    id: "x4",
                    label: "X4, que deja la línea de pase al 4.",
                    verdict: "risky",
                    analysis: "X4 está cortando el pase de vuelta al 4. Si sale hacia el 5, el 4 queda libre para el pase siguiente y el balón vuelve a circular sin presión."
                },
                {
                    id: "x3",
                    label: "X3, que sale del aro.",
                    verdict: "poor",
                    analysis: "X3 cuida el aro y no entra en las rotaciones [S1]. Si sale, un pase largo puede terminar en bandeja."
                }
            ],
            explanation: [
                "En la presión individual, el doble llega desde adelante del balón después de encauzar, y los defensores lejos del balón pasan a interceptar [S1]. El doble siempre deja a un atacante libre: lo que decide si la presión funciona es la rotación después del pase.",
                "La regla es que el defensor que ve el pase toma al receptor. Cuando un defensor cambia de marca, el más cercano ayuda al que ayudó y el que quedó libre rota al jugador sin marca. El último defensor cuida el aro y no participa de esas rotaciones [S1]."
            ],
            alternatives: [
                "Si el pase sale hacia atrás, al 4, lo toma X4, que estaba cortando esa línea.",
                "Si la presión se supera, la prioridad es el aro: el último defensor puede amagar hacia el balón, pero vuelve al aro [S2].",
                "Contra un rival que sale bien de los dobles, se puede presionar sin doblar: hacer girar y encauzar al que dribblea, con todos en la línea del balón [S1]."
            ],
            boards: [
                { label: "Doble y rotación", title: "Doble desde adelante y rotación", intro: "Secuencia del simulador de la guía: el balón sale del doble y el que ve el pase lo toma [S1].", sim: { variant: "individual", positions: ["trampa", "rotacion"] } },
                { label: "Otra situación, misma regla", board: "girar-encauzar-doblar" }
            ],
            related: { tab: "aprender", section: "explicacion", label: "5.4 Rotaciones" }
        }
    ];
});

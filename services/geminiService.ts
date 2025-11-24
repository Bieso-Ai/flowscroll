import { TaskType } from "../types";

// NOTE: Client-side GoogleGenAI import and API_KEY have been removed for security.
// We now fetch from /.netlify/functions/generate-task

// --- CATEGORIZATION ENGINE (Local Data for Odd One Out) ---
// Level 1: Concrete, Visual, Basic
// Level 2: Everyday Objects, Functional
// Level 3: Abstract, Conceptual, Specific

interface CategoryDef {
    level: number;
    words: string[];
}

const CATEGORIES: Record<string, CategoryDef> = {
    // LEVEL 1 (Basic)
    ANIMALS: { level: 1, words: ["Katze", "Hund", "Löwe", "Tiger", "Bär", "Wolf", "Fuchs", "Hase", "Maus", "Pferd", "Kuh", "Schwein", "Schaf", "Elefant", "Giraffe", "Affe"] },
    FRUITS: { level: 1, words: ["Apfel", "Banane", "Orange", "Traube", "Zitrone", "Birne", "Pfirsich", "Kirsche", "Beere", "Melone", "Kiwi", "Ananas"] },
    COLORS: { level: 1, words: ["Rot", "Blau", "Grün", "Gelb", "Pink", "Lila", "Orange", "Schwarz", "Weiß", "Grau", "Braun", "Türkis", "Gold", "Silber"] },
    FURNITURE: { level: 1, words: ["Stuhl", "Tisch", "Bett", "Sofa", "Schreibtisch", "Lampe", "Teppich", "Regal", "Schrank", "Sessel", "Hocker"] },
    CLOTHES: { level: 1, words: ["Hemd", "Hose", "Schuh", "Hut", "Mantel", "Socke", "Kleid", "Rock", "Jacke", "Handschuh", "Schal", "Mütze"] },
    
    // LEVEL 2 (Intermediate)
    VEHICLES: { level: 2, words: ["Auto", "Bus", "LKW", "Fahrrad", "Zug", "Flugzeug", "Boot", "Schiff", "Taxi", "Motorrad", "U-Bahn"] },
    TOOLS: { level: 2, words: ["Hammer", "Säge", "Bohrer", "Zange", "Schraube", "Nagel", "Axt", "Feile", "Pinsel", "Schlüssel"] },
    JOBS: { level: 2, words: ["Arzt", "Koch", "Pilot", "Maler", "Bäcker", "Bauer", "Polizist", "Richter", "Lehrer", "Anwalt", "Feuerwehrmann"] },
    SPORTS: { level: 2, words: ["Fußball", "Tennis", "Golf", "Rugby", "Hockey", "Judo", "Yoga", "Schwimmen", "Laufen", "Boxen"] },
    INSTRUMENTS: { level: 2, words: ["Klavier", "Gitarre", "Trommel", "Flöte", "Geige", "Bass", "Harfe", "Trompete", "Saxophon"] },

    // LEVEL 3 (Abstract/Advanced)
    EMOTIONS: { level: 3, words: ["Glück", "Trauer", "Wut", "Angst", "Freude", "Liebe", "Hass", "Hoffnung", "Neid", "Stolz", "Scham", "Mut"] },
    MATH_TERMS: { level: 3, words: ["Plus", "Minus", "Summe", "Faktor", "Graph", "Linie", "Fläche", "Wurzel", "Teiler", "Bruch"] },
    WEATHER: { level: 3, words: ["Regen", "Schnee", "Wind", "Sturm", "Wolke", "Hagel", "Nebel", "Hitze", "Frost", "Donner", "Blitz"] },
    PLANETS: { level: 3, words: ["Erde", "Mars", "Venus", "Jupiter", "Saturn", "Pluto", "Mond", "Sonne", "Stern", "Komet"] },
    METALS: { level: 3, words: ["Gold", "Silber", "Eisen", "Stahl", "Kupfer", "Zink", "Blei", "Zinn", "Messing", "Bronze", "Platin"] }
};

export const generateOddOneOutContent = (difficulty: number) => {
    // Determine Logic Complexity
    let targetCatLevel = 1;
    if (difficulty > 3) targetCatLevel = 2;
    if (difficulty > 7) targetCatLevel = 3;

    // Filter categories
    const eligibleCats = Object.keys(CATEGORIES).filter(k => CATEGORIES[k].level === targetCatLevel);
    
    // Pick Base Category
    const baseCatKey = eligibleCats[Math.floor(Math.random() * eligibleCats.length)];
    const baseCat = CATEGORIES[baseCatKey];

    // Pick Odd Category
    let oddCatKey = baseCatKey;
    let attempts = 0;
    while (oddCatKey === baseCatKey && attempts < 10) {
        const allKeys = Object.keys(CATEGORIES);
        oddCatKey = allKeys[Math.floor(Math.random() * allKeys.length)];
        attempts++;
    }
    const oddCat = CATEGORIES[oddCatKey];

    let numOptions = 3;
    if (difficulty > 2) numOptions = 4;
    
    // Select Words
    const baseWords = [...baseCat.words].sort(() => 0.5 - Math.random()).slice(0, numOptions - 1);
    const oddWord = oddCat.words[Math.floor(Math.random() * oddCat.words.length)];

    // Shuffle
    const options = [...baseWords, oddWord];
    for (let i = options.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [options[i], options[j]] = [options[j], options[i]];
    }

    const oddIndex = options.indexOf(oddWord);

    return {
        options,
        oddIndex,
        hint: `Eines ist ${oddCatKey}, die anderen sind ${baseCatKey}.` 
    };
};

// --- NEW: MASSIVE GERMAN WORD DATABASE (Compact Format) ---

interface CompactWordDef {
    l: number; // Level 1-4
    pos: 'adj' | 'verb' | 'noun';
    syns?: string[]; // Synonyms
    ants?: string[]; // Antonyms
}

// Key = The Word itself
const COMPACT_DB: Record<string, CompactWordDef> = {
    // --- ADJECTIVES (Eigenschaften) ---
    // Basics (Level 1)
    "gut": { l: 1, pos: 'adj', syns: ["toll", "super", "prima", "fein"], ants: ["schlecht", "böse", "mies", "übel"] },
    "schlecht": { l: 1, pos: 'adj', syns: ["mies", "übel", "furchtbar"], ants: ["gut", "toll", "super"] },
    "groß": { l: 1, pos: 'adj', syns: ["riesig", "gigantisch", "hoch"], ants: ["klein", "winzig", "niedrig"] },
    "klein": { l: 1, pos: 'adj', syns: ["winzig", "zwergenhaft", "gering"], ants: ["groß", "riesig"] },
    "schnell": { l: 1, pos: 'adj', syns: ["rasch", "flink", "zügig"], ants: ["langsam", "träge"] },
    "langsam": { l: 1, pos: 'adj', syns: ["träge", "gemächlich"], ants: ["schnell", "rasant"] },
    "heiß": { l: 1, pos: 'adj', syns: ["kochend", "warm", "brennend"], ants: ["kalt", "eisig", "kühl"] },
    "kalt": { l: 1, pos: 'adj', syns: ["eisig", "kühl", "frostig"], ants: ["heiß", "warm"] },
    "neu": { l: 1, pos: 'adj', syns: ["aktuell", "frisch", "modern"], ants: ["alt", "antik", "veraltet"] },
    "alt": { l: 1, pos: 'adj', syns: ["betagt", "antik", "historisch"], ants: ["neu", "jung", "modern"] },
    "jung": { l: 1, pos: 'adj', syns: ["frisch", "jugendlich"], ants: ["alt", "senior"] },
    "laut": { l: 1, pos: 'adj', syns: ["lärmend", "geräuschvoll"], ants: ["leise", "ruhig", "still"] },
    "leise": { l: 1, pos: 'adj', syns: ["ruhig", "still", "lautlos"], ants: ["laut", "krachig"] },
    "hell": { l: 1, pos: 'adj', syns: ["leuchtend", "strahlend", "klar"], ants: ["dunkel", "finster"] },
    "dunkel": { l: 1, pos: 'adj', syns: ["finster", "schwarz", "düster"], ants: ["hell", "licht"] },
    "teuer": { l: 1, pos: 'adj', syns: ["kostspielig", "wertvoll"], ants: ["billig", "günstig"] },
    "billig": { l: 1, pos: 'adj', syns: ["günstig", "preiswert"], ants: ["teuer", "kostenintensiv"] },
    "reich": { l: 1, pos: 'adj', syns: ["vermögend", "wohlhabend"], ants: ["arm", "bedürftig"] },
    "arm": { l: 1, pos: 'adj', syns: ["bedürftig", "mittellos"], ants: ["reich", "vermögend"] },
    "schwer": { l: 1, pos: 'adj', syns: ["gewichtig", "mühsam", "kompliziert"], ants: ["leicht", "einfach"] },
    "leicht": { l: 1, pos: 'adj', syns: ["federleicht", "einfach", "simpel"], ants: ["schwer", "kompliziert"] },
    "hart": { l: 1, pos: 'adj', syns: ["fest", "steinern", "zäh"], ants: ["weich", "zart"] },
    "weich": { l: 1, pos: 'adj', syns: ["zart", "flauschig", "sanft"], ants: ["hart", "rau", "fest"] },
    "nass": { l: 1, pos: 'adj', syns: ["feucht", "durchnässt"], ants: ["trocken", "dürr"] },
    "trocken": { l: 1, pos: 'adj', syns: ["dürr", "ausgetrocknet"], ants: ["nass", "feucht"] },
    "voll": { l: 1, pos: 'adj', syns: ["gefüllt", "besetzt"], ants: ["leer", "hohl"] },
    "leer": { l: 1, pos: 'adj', syns: ["hohl", "unbesetzt", "nichtig"], ants: ["voll", "gefüllt"] },

    // Intermediate (Level 2)
    "klug": { l: 2, pos: 'adj', syns: ["schlau", "intelligent", "gewitzt"], ants: ["dumm", "blöd", "töricht"] },
    "dumm": { l: 2, pos: 'adj', syns: ["blöd", "töricht", "unwissend"], ants: ["klug", "schlau", "intelligent"] },
    "mutig": { l: 2, pos: 'adj', syns: ["tapfer", "kühn", "heldenhaft"], ants: ["feige", "ängstlich"] },
    "feige": { l: 2, pos: 'adj', syns: ["ängstlich", "furchtsam"], ants: ["mutig", "tapfer"] },
    "glücklich": { l: 2, pos: 'adj', syns: ["froh", "fröhlich", "zufrieden"], ants: ["traurig", "unglücklich"] },
    "traurig": { l: 2, pos: 'adj', syns: ["betrübt", "niedergeschlagen"], ants: ["glücklich", "froh"] },
    "sauber": { l: 2, pos: 'adj', syns: ["rein", "gepflegt"], ants: ["schmutzig", "dreckig"] },
    "schmutzig": { l: 2, pos: 'adj', syns: ["dreckig", "unrein"], ants: ["sauber", "rein"] },
    "gesund": { l: 2, pos: 'adj', syns: ["fit", "wohlauf", "kräftig"], ants: ["krank", "kränklich"] },
    "krank": { l: 2, pos: 'adj', syns: ["unwohl", "leidend"], ants: ["gesund", "fit"] },
    "fleißig": { l: 2, pos: 'adj', syns: ["emsig", "arbeitsam"], ants: ["faul", "träge"] },
    "faul": { l: 2, pos: 'adj', syns: ["träge", "bequem"], ants: ["fleißig", "aktiv"] },
    "lustig": { l: 2, pos: 'adj', syns: ["witzig", "humorvoll", "komisch"], ants: ["ernst", "langweilig"] },
    "ernst": { l: 2, pos: 'adj', syns: ["seriös", "streng"], ants: ["lustig", "albern"] },
    "falsch": { l: 2, pos: 'adj', syns: ["inkorrekt", "fehlerhaft"], ants: ["richtig", "korrekt", "wahr"] },
    "richtig": { l: 2, pos: 'adj', syns: ["korrekt", "wahr", "stimmig"], ants: ["falsch", "unwahr"] },
    "breit": { l: 2, pos: 'adj', syns: ["weit", "ausgedehnt"], ants: ["schmal", "eng"] },
    "schmal": { l: 2, pos: 'adj', syns: ["eng", "dünn"], ants: ["breit", "weit"] },
    
    // Advanced (Level 3)
    "gigantisch": { l: 3, pos: 'adj', syns: ["riesig", "kolossal", "enorm"], ants: ["winzig", "mikroskopisch"] },
    "winzig": { l: 3, pos: 'adj', syns: ["klein", "mikroskopisch"], ants: ["gigantisch", "riesig"] },
    "komplex": { l: 3, pos: 'adj', syns: ["kompliziert", "vielschichtig"], ants: ["simpel", "einfach"] },
    "simpel": { l: 3, pos: 'adj', syns: ["einfach", "schlicht"], ants: ["komplex", "aufwendig"] },
    "modern": { l: 3, pos: 'adj', syns: ["aktuell", "zeitgemäß", "neuartig"], ants: ["antik", "altmodisch"] },
    "antik": { l: 3, pos: 'adj', syns: ["alt", "historisch", "vergangen"], ants: ["modern", "futuristisch"] },
    "global": { l: 3, pos: 'adj', syns: ["weltweit", "international"], ants: ["lokal", "regional"] },
    "lokal": { l: 3, pos: 'adj', syns: ["örtlich", "regional"], ants: ["global", "international"] },
    "permanent": { l: 3, pos: 'adj', syns: ["dauerhaft", "ständig"], ants: ["temporär", "vorübergehend"] },
    "temporär": { l: 3, pos: 'adj', syns: ["zeitweise", "befristet"], ants: ["permanent", "ewig"] },
    "optimistisch": { l: 3, pos: 'adj', syns: ["zuversichtlich", "hoffnungsvoll"], ants: ["pessimistisch", "negativ"] },
    "pessimistisch": { l: 3, pos: 'adj', syns: ["negativ", "trübsinnig"], ants: ["optimistisch", "positiv"] },
    "aggressiv": { l: 3, pos: 'adj', syns: ["angriffslustig", "streitbar"], ants: ["friedlich", "sanft"] },
    "friedlich": { l: 3, pos: 'adj', syns: ["ruhig", "harmonisch"], ants: ["aggressiv", "kriegerisch"] },

    // --- VERBS (Tätigkeiten) ---
    // Level 1
    "gehen": { l: 1, pos: 'verb', syns: ["laufen", "schreiten"], ants: ["stehen", "bleiben"] },
    "stehen": { l: 1, pos: 'verb', syns: ["verharren", "bleiben"], ants: ["gehen", "laufen", "liegen"] },
    "kommen": { l: 1, pos: 'verb', syns: ["eintreffen", "erscheinen"], ants: ["gehen", "verlassen"] },
    "essen": { l: 1, pos: 'verb', syns: ["speisen", "verzehren", "futtern"], ants: ["hungern", "fasten"] },
    "trinken": { l: 1, pos: 'verb', syns: ["schlürfen", "saufen"], ants: ["verdursten"] },
    "schlafen": { l: 1, pos: 'verb', syns: ["ruhen", "schlummern", "dösen"], ants: ["wachen", "aufstehen"] },
    "wachen": { l: 1, pos: 'verb', syns: ["aufpassen", "wach sein"], ants: ["schlafen", "träumen"] },
    "geben": { l: 1, pos: 'verb', syns: ["schenken", "reichen"], ants: ["nehmen", "behalten"] },
    "nehmen": { l: 1, pos: 'verb', syns: ["greifen", "erhalten"], ants: ["geben", "schenken"] },
    "lieben": { l: 1, pos: 'verb', syns: ["mögen", "verehren"], ants: ["hassen", "verabscheuen"] },
    "hassen": { l: 1, pos: 'verb', syns: ["verabscheuen", "nicht leiden"], ants: ["lieben", "mögen"] },
    "fragen": { l: 1, pos: 'verb', syns: ["erkundigen", "verhören"], ants: ["antworten", "sagen"] },
    "antworten": { l: 1, pos: 'verb', syns: ["erwidern", "reagieren"], ants: ["fragen", "schweigen"] },

    // Level 2
    "kaufen": { l: 2, pos: 'verb', syns: ["erwerben", "shoppen"], ants: ["verkaufen"] },
    "verkaufen": { l: 2, pos: 'verb', syns: ["veräußern", "anbieten"], ants: ["kaufen", "erwerben"] },
    "öffnen": { l: 2, pos: 'verb', syns: ["aufmachen", "aufschließen"], ants: ["schließen", "zumachen"] },
    "schließen": { l: 2, pos: 'verb', syns: ["zumachen", "beenden"], ants: ["öffnen", "aufmachen"] },
    "beginnen": { l: 2, pos: 'verb', syns: ["starten", "anfangen"], ants: ["enden", "aufhören"] },
    "enden": { l: 2, pos: 'verb', syns: ["aufhören", "abschließen"], ants: ["beginnen", "starten"] },
    "gewinnen": { l: 2, pos: 'verb', syns: ["siegen", "erfolgreich sein"], ants: ["verlieren", "scheitern"] },
    "verlieren": { l: 2, pos: 'verb', syns: ["scheitern", "einbüßen"], ants: ["gewinnen", "siegen"] },
    "lachen": { l: 2, pos: 'verb', syns: ["kichern", "grinsen"], ants: ["weinen", "heulen"] },
    "weinen": { l: 2, pos: 'verb', syns: ["heulen", "schluchzen", "jammern"], ants: ["lachen", "freuen"] },
    "suchen": { l: 2, pos: 'verb', syns: ["forschen", "fahnden"], ants: ["finden", "entdecken"] },
    "finden": { l: 2, pos: 'verb', syns: ["entdecken", "aufspüren"], ants: ["suchen", "verlieren"] },
    "bauen": { l: 2, pos: 'verb', syns: ["errichten", "konstruieren"], ants: ["zerstören", "abreißen"] },
    "zerstören": { l: 2, pos: 'verb', syns: ["kaputtmachen", "vernichten"], ants: ["bauen", "reparieren"] },

    // Level 3
    "erlauben": { l: 3, pos: 'verb', syns: ["gestatten", "genehmigen"], ants: ["verbieten", "untersagen"] },
    "verbieten": { l: 3, pos: 'verb', syns: ["untersagen", "sperren"], ants: ["erlauben", "gestatten"] },
    "steigen": { l: 3, pos: 'verb', syns: ["klettern", "zunehmen", "wachsen"], ants: ["sinken", "fallen"] },
    "sinken": { l: 3, pos: 'verb', syns: ["fallen", "abnehmen", "untergehen"], ants: ["steigen", "zunehmen"] },
    "beschützen": { l: 3, pos: 'verb', syns: ["verteidigen", "bewahren"], ants: ["angreifen", "bedrohen"] },
    "angreifen": { l: 3, pos: 'verb', syns: ["attackieren", "stürmen"], ants: ["verteidigen", "schützen"] },
    "flüstern": { l: 3, pos: 'verb', syns: ["tuscheln", "hauchen"], ants: ["schreien", "brüllen"] },
    "schreien": { l: 3, pos: 'verb', syns: ["brüllen", "rufen"], ants: ["flüstern", "schweigen"] },

    // --- NOUNS (Dinge/Konzepte) ---
    // Level 1
    "Mann": { l: 1, pos: 'noun', syns: ["Herr", "Kerl"], ants: ["Frau", "Dame"] },
    "Frau": { l: 1, pos: 'noun', syns: ["Dame", "Lady"], ants: ["Mann", "Herr"] },
    "Tag": { l: 1, pos: 'noun', syns: ["Tageszeit"], ants: ["Nacht", "Dunkelheit"] },
    "Nacht": { l: 1, pos: 'noun', syns: ["Dunkelheit"], ants: ["Tag", "Morgen"] },
    "Sommer": { l: 1, pos: 'noun', syns: ["Jahreszeit", "Hitze"], ants: ["Winter", "Kälte"] },
    "Winter": { l: 1, pos: 'noun', syns: ["Kälte", "Schneezeit"], ants: ["Sommer", "Hitze"] },
    "Freund": { l: 1, pos: 'noun', syns: ["Kumpel", "Partner", "Gefährte"], ants: ["Feind", "Gegner"] },
    "Feind": { l: 1, pos: 'noun', syns: ["Gegner", "Widersacher"], ants: ["Freund", "Verbündeter"] },
    "Morgen": { l: 1, pos: 'noun', syns: ["Früh", "Tagesbeginn"], ants: ["Abend", "Nacht"] },
    "Abend": { l: 1, pos: 'noun', syns: ["Dämmerung", "Spät"], ants: ["Morgen", "Mittag"] },

    // Level 2
    "Anfang": { l: 2, pos: 'noun', syns: ["Beginn", "Start", "Ursprung"], ants: ["Ende", "Schluss"] },
    "Ende": { l: 2, pos: 'noun', syns: ["Schluss", "Finale", "Abschluss"], ants: ["Anfang", "Start"] },
    "Frage": { l: 2, pos: 'noun', syns: ["Problem", "Rätsel"], ants: ["Antwort", "Lösung"] },
    "Antwort": { l: 2, pos: 'noun', syns: ["Lösung", "Ergebnis"], ants: ["Frage", "Rätsel"] },
    "Himmel": { l: 2, pos: 'noun', syns: ["Firmament", "Höhe"], ants: ["Hölle", "Erde", "Boden"] },
    "Hölle": { l: 2, pos: 'noun', syns: ["Unterwelt", "Fegefeuer"], ants: ["Himmel", "Paradies"] },
    "Sieg": { l: 2, pos: 'noun', syns: ["Gewinn", "Triumph", "Erfolg"], ants: ["Niederlage", "Pleite"] },
    "Niederlage": { l: 2, pos: 'noun', syns: ["Verlust", "Pleite", "Misserfolg"], ants: ["Sieg", "Gewinn"] },
    "Krieg": { l: 2, pos: 'noun', syns: ["Kampf", "Schlacht", "Konflikt"], ants: ["Frieden", "Harmonie"] },
    "Frieden": { l: 2, pos: 'noun', syns: ["Harmonie", "Stille", "Eintracht"], ants: ["Krieg", "Streit"] },

    // Level 3
    "Wahrheit": { l: 3, pos: 'noun', syns: ["Fakt", "Realität", "Echtheit"], ants: ["Lüge", "Fiktion"] },
    "Lüge": { l: 3, pos: 'noun', syns: ["Unwahrheit", "Täuschung"], ants: ["Wahrheit", "Ehrlichkeit"] },
    "Vorteil": { l: 3, pos: 'noun', syns: ["Nutzen", "Pluspunkt", "Bonus"], ants: ["Nachteil", "Manko"] },
    "Nachteil": { l: 3, pos: 'noun', syns: ["Schaden", "Minus", "Manko"], ants: ["Vorteil", "Nutzen"] },
    "Erfolg": { l: 3, pos: 'noun', syns: ["Gelingen", "Sieg"], ants: ["Misserfolg", "Scheitern"] },
    "Misserfolg": { l: 3, pos: 'noun', syns: ["Scheitern", "Fehlschlag"], ants: ["Erfolg", "Gelingen"] },
    "Theorie": { l: 3, pos: 'noun', syns: ["Annahme", "Hypothese", "Idee"], ants: ["Praxis", "Realität"] },
    "Praxis": { l: 3, pos: 'noun', syns: ["Anwendung", "Tat", "Ausführung"], ants: ["Theorie", "Planung"] },
    "Chaos": { l: 3, pos: 'noun', syns: ["Unordnung", "Durcheinander"], ants: ["Ordnung", "Struktur"] },
    "Ordnung": { l: 3, pos: 'noun', syns: ["Struktur", "Regelmäßigkeit"], ants: ["Chaos", "Unordnung"] },
    "Zukunft": { l: 3, pos: 'noun', syns: ["Kommendes", "Perspektive"], ants: ["Vergangenheit", "Geschichte"] },
    "Vergangenheit": { l: 3, pos: 'noun', syns: ["Geschichte", "Vorzeit"], ants: ["Zukunft", "Gegenwart"] }
};

// --- RUNTIME DATABASE GENERATOR ---
// Parses the Compact DB into the format used by the game engine

interface WordEntry {
    id: string;
    text: string;
    level: number;
    pos: 'adj' | 'verb' | 'noun';
}

interface Relation {
    type: 'synonym' | 'antonym';
    tId: string; // Target
    pId: string; // Partner
}

let GENERATED_WORDS: WordEntry[] = [];
let GENERATED_RELATIONS: Relation[] = [];
let DB_INITIALIZED = false;

const initializeDatabase = () => {
    if (DB_INITIALIZED) return;
    
    let idCounter = 1;
    const wordToIdMap: Record<string, string> = {};

    // 1. Create Words and Assign IDs
    Object.keys(COMPACT_DB).forEach(wordText => {
        const def = COMPACT_DB[wordText];
        const id = `w_${idCounter++}`;
        wordToIdMap[wordText] = id;
        
        GENERATED_WORDS.push({
            id,
            text: wordText,
            level: def.l,
            pos: def.pos
        });
    });

    // 2. Generate Relations
    Object.keys(COMPACT_DB).forEach(wordText => {
        const def = COMPACT_DB[wordText];
        const targetId = wordToIdMap[wordText];
        
        if (!targetId) return;

        // Add Synonyms
        if (def.syns) {
            def.syns.forEach(synText => {
                // Check if synonym exists in our DB (it might be a distractor-only word if not in keys)
                // For this game, we prefer relations where both exist to be targets.
                // However, we can create one-way relations if the partner is just text.
                // BUT: To be robust, we try to find the ID.
                const partnerId = wordToIdMap[synText];
                
                // If partner exists, add relation
                if (partnerId) {
                    GENERATED_RELATIONS.push({ type: 'synonym', tId: targetId, pId: partnerId });
                } else {
                    // OPTIONAL: Create a 'ghost' word entry if we want unmatched answers?
                    // For now, skip to ensure quality.
                }
            });
        }

        // Add Antonyms
        if (def.ants) {
            def.ants.forEach(antText => {
                const partnerId = wordToIdMap[antText];
                if (partnerId) {
                    GENERATED_RELATIONS.push({ type: 'antonym', tId: targetId, pId: partnerId });
                }
            });
        }
    });

    DB_INITIALIZED = true;
    console.log(`Database Initialized: ${GENERATED_WORDS.length} words, ${GENERATED_RELATIONS.length} relations.`);
};

// --- CONNECT TASK GENERATOR ---

export const generateConnectTaskContent = (difficulty: number) => {
    initializeDatabase(); // Ensure DB is ready

    // 1. Decide Mode based on Difficulty
    // Level 1-2: Antonyms (Easier logic)
    // Level 3+: Mixed
    let mode: 'synonym' | 'antonym' = Math.random() > 0.5 ? 'antonym' : 'synonym';
    if (difficulty <= 2) mode = 'antonym'; 

    // 2. Filter Relations
    // We want relations where the Target Word's level is close to User Difficulty
    // Map Difficulty (1-100) to Word Levels (1-3)
    let targetLevel = 1;
    if (difficulty > 3) targetLevel = 2;
    if (difficulty > 8) targetLevel = 3;

    const relevantRelations = GENERATED_RELATIONS.filter(r => {
        if (r.type !== mode) return false;
        const targetWord = GENERATED_WORDS.find(w => w.id === r.tId);
        // Allow slightly easier or harder words (+/- 1 level)
        return targetWord && Math.abs(targetWord.level - targetLevel) <= 1;
    });

    // Fallback if no specific level found
    const pool = relevantRelations.length > 0 ? relevantRelations : GENERATED_RELATIONS.filter(r => r.type === mode);
    
    // Pick Relation
    const relation = pool[Math.floor(Math.random() * pool.length)];
    
    const targetWordObj = GENERATED_WORDS.find(w => w.id === relation.tId)!;
    const answerWordObj = GENERATED_WORDS.find(w => w.id === relation.pId)!;

    // 3. Pick Distractors
    // Must be same POS, not target, not answer
    const potentialDistractors = GENERATED_WORDS.filter(w => 
        w.id !== targetWordObj.id && 
        w.id !== answerWordObj.id &&
        w.pos === targetWordObj.pos
    );

    // Number of options
    const numOptions = difficulty > 4 ? 4 : 3;
    
    // Shuffle and pick distractors
    const distractors = potentialDistractors
        .sort(() => 0.5 - Math.random())
        .slice(0, numOptions - 1);

    // 4. Assemble Options
    const options = [answerWordObj, ...distractors].map(d => d.text);
    
    // Shuffle options
    for (let i = options.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [options[i], options[j]] = [options[j], options[i]];
    }

    const correctIndex = options.indexOf(answerWordObj.text);

    return {
        mode,
        target: targetWordObj.text,
        options,
        correctIndex,
        answer: answerWordObj.text
    };
};


// --- Legacy Fallbacks (Kept for safety) ---
const FALLBACK_DATA = {
    SYNONYMS: [
        { word: "Big", synonyms: ["Large", "Huge", "Giant", "Massive"], hint: "Opposite of small" }
    ],
    RHYMES: [
        { word: "Cat", rhymes: ["Bat", "Hat", "Mat", "Rat", "Sat"], hint: "Animal" }
    ],
    SENTENCES: [
        { word1: "Sun", word2: "Ice", exampleSentence: "The sun melted the ice." }
    ]
};

export const generateLanguageTaskContent = async (type: TaskType, difficulty: number): Promise<any> => {
  if (type === TaskType.LANG_ODD_ONE_OUT) {
      return generateOddOneOutContent(difficulty);
  }

  if (type === TaskType.LANG_CONNECT) {
      return generateConnectTaskContent(difficulty);
  }

  // Legacy Fallback for other types
  return getFallbackContent(type);
};

const getFallbackContent = (type: TaskType) => {
  const getRandom = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];
  if (type === TaskType.LANG_SYNONYM) return getRandom(FALLBACK_DATA.SYNONYMS);
  if (type === TaskType.LANG_RHYME) return getRandom(FALLBACK_DATA.RHYMES);
  return {};
};

export const validateSentenceWithGemini = async (word1: string, word2: string, sentence: string): Promise<boolean> => {
  const hasWord1 = sentence.toLowerCase().includes(word1.toLowerCase());
  const hasWord2 = sentence.toLowerCase().includes(word2.toLowerCase());
  const isLongEnough = sentence.length > 8;
  return hasWord1 && hasWord2 && isLongEnough;
};
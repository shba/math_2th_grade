import { g, join, type Txt } from '../content/he/text'
import { blank, n, op } from '../exercises/helpers'
import type { Token, TopicId, Visual } from '../exercises/types'

export interface Slide {
  speaker: 'hero' | 'pet'
  text: Txt
  visual?: Visual
  tokens?: Token[]
  /** Required whenever tokens contain a blank: the child answers by tapping one of the choices. */
  ask?: { answer: number; choices: number[] }
}

const welcome = (place: string, what: string): Slide => ({
  speaker: 'hero',
  text: join(g('שָׁלוֹם! בְּרוּכָה הַבָּאָה', 'שָׁלוֹם! בָּרוּךְ הַבָּא'), `${place}! ${what}`),
})

const yourTurn: Slide = { speaker: 'pet', text: g('עַכְשָׁו תּוֹרֵךְ! בּוֹאִי נְתַרְגֵּל.', 'עַכְשָׁו תּוֹרְךָ! בּוֹא נְתַרְגֵּל.') }

export const LESSONS: Record<TopicId, Slide[]> = {
  'add-sub-20': [
    welcome('לְיַעַר הַחִבּוּר', 'כָּאן נְחַבֵּר וּנְחַסֵּר עַד 20.'),
    { speaker: 'pet', text: 'יֵשׁ לִי 8 תַּפּוּחִים. קִבַּלְתִּי עוֹד 5. כַּמָּה יֵשׁ לִי עַכְשָׁו?', visual: { kind: 'items', icon: '🍎', count: 13, added: 5, slots: 20 }, tokens: [n(8), op('+'), n(5), op('='), blank()], ask: { answer: 13, choices: [12, 13, 14] } },
    { speaker: 'hero', text: 'הִנֵּה טְרִיק קָסוּם: קֹדֶם מַשְׁלִימִים לְ־10. 8 וְעוֹד 2 זֶה 10, וְעוֹד 3 זֶה 13.', visual: { kind: 'items', icon: '🍎', count: 13, added: 5, slots: 20 }, tokens: [n(8), op('+'), n(5), op('='), n(13)] },
    { speaker: 'pet', text: 'וּבְחִסּוּר? 13 פָּחוֹת 5: קֹדֶם מוֹרִידִים 3 וּמַגִּיעִים לְ־10, וְאָז עוֹד 2. יוֹצֵא 8.', visual: { kind: 'items', icon: '🍎', count: 13, crossed: 5, slots: 20 }, tokens: [n(13), op('-'), n(5), op('='), n(8)] },
    { speaker: 'hero', text: g('שִׂימִי לֵב לַסִּימָן: + אוֹמֵר לְהוֹסִיף, − אוֹמֵר לְהוֹרִיד.', 'שִׂים לֵב לַסִּימָן: + אוֹמֵר לְהוֹסִיף, − אוֹמֵר לְהוֹרִיד.'), tokens: [n(15), op('-'), n(3), op('='), n(12)] },
    { speaker: 'pet', text: 'וְלִפְעָמִים חָסֵר מִסְפָּר בָּאֶמְצַע: 3 וְעוֹד כַּמָּה זֶה 18? סוֹפְרִים מִ־3 עַד 18 — 15!', tokens: [n(3), op('+'), n(15), op('='), n(18)] },
    yourTurn,
  ],
  'numbers-1000': [
    welcome('לְטִירַת הַמִּסְפָּרִים', 'כָּאן נִבְנֶה מִסְפָּרִים גְּדוֹלִים.'),
    { speaker: 'pet', text: 'כׇּל מוֹט כָּחֹל הוּא עֲשָׂרָה. כׇּל קֻבִּיָּה וְרֻדָּה הִיא יְחִידָה.', visual: { kind: 'blocks', hundreds: 0, tens: 3, ones: 4 } },
    { speaker: 'hero', text: 'כָּאן יֵשׁ 3 עֲשָׂרוֹת וְ־4 יְחִידוֹת. זֶה 34. כּוֹתְבִים קֹדֶם אֶת הָעֲשָׂרוֹת, מִשְּׂמֹאל.', visual: { kind: 'blocks', hundreds: 0, tens: 3, ones: 4 }, tokens: [n(34)] },
    { speaker: 'pet', text: 'לוּחַ גָּדוֹל הוּא מֵאָה! 2 לוּחוֹת, 5 מוֹטוֹת וְ־3 קֻבִּיּוֹת הֵם 253.', visual: { kind: 'blocks', hundreds: 2, tens: 5, ones: 3 }, tokens: [n(253)] },
    { speaker: 'hero', text: 'מִסְפָּר זוּגִי אֶפְשָׁר לְסַדֵּר בְּזוּגוֹת. 7 אִי־זוּגִי — נִשְׁאָר אֶחָד לְבַד.', visual: { kind: 'items', icon: '🧦', count: 7, pairs: true } },
    { speaker: 'pet', text: 'וְגַם אוֹתִיּוֹת הֵן מִסְפָּרִים! א׳ הִיא 1, י׳ הִיא 10, וְט״ו הִיא 15.', tokens: [{ t: 'w', v: 'ט״ו' }, op('='), n(15)] },
    yourTurn,
  ],
  'add-sub-100': [
    welcome('לַאֲגַם הַמֵּאָה', 'כָּאן נְחַבֵּר וּנְחַסֵּר מִסְפָּרִים עַד 100.'),
    { speaker: 'pet', text: '23 וְעוֹד 4: מְחַבְּרִים יְחִידוֹת עִם יְחִידוֹת. 3 וְעוֹד 4 זֶה 7, אָז יוֹצֵא 27.', visual: { kind: 'blocks', hundreds: 0, tens: 2, ones: 7 }, tokens: [n(23), op('+'), n(4), op('='), n(27)] },
    { speaker: 'hero', text: '45 וְעוֹד 8: יֵשׁ 13 יְחִידוֹת! 10 יְחִידוֹת הוֹפְכוֹת לְעוֹד עֲשָׂרָה, אָז יוֹצֵא 53.', visual: { kind: 'blocks', hundreds: 0, tens: 4, ones: 13 }, tokens: [n(45), op('+'), n(8), op('='), n(53)] },
    { speaker: 'pet', text: '32 פָּחוֹת 5: אֵין מַסְפִּיק יְחִידוֹת. פּוֹרְטִים עֲשָׂרָה לְ־10 יְחִידוֹת, וְיֵשׁ 12 יְחִידוֹת. 12 פָּחוֹת 5 זֶה 7, אָז יוֹצֵא 27.', visual: { kind: 'blocks', hundreds: 0, tens: 2, ones: 12 }, tokens: [n(32), op('-'), n(5), op('='), n(27)] },
    { speaker: 'hero', text: 'בִּמְאוּנָךְ כּוֹתְבִים יְחִידוֹת מִתַּחַת לִיחִידוֹת, וַעֲשָׂרוֹת מִתַּחַת לַעֲשָׂרוֹת. מַתְחִילִים מִיָּמִין!', visual: { kind: 'column', a: 34, b: 25, op: '+' } },
    yourTurn,
  ],
  'word-problems': [
    welcome('לִכְפַר הַסִּפּוּרִים', 'כָּאן כׇּל תַּרְגִּיל הוּא סִפּוּר.'),
    { speaker: 'pet', text: 'עַל עֵץ יָשְׁבוּ 3 צִפּוֹרִים, וְהִגִּיעוּ עוֹד 5. שׁוֹאֲלִים עַל כֻּלָּן יַחַד — אָז מְחַבְּרִים: 3 וְעוֹד 5 זֶה 8.', visual: { kind: 'items', icon: '🐦', count: 8, added: 5 }, tokens: [n(3), op('+'), n(5), op('='), n(8)] },
    { speaker: 'hero', text: 'אִם שׁוֹאֲלִים עַל חֵלֶק — מְחַסְּרִים. גַּם אִם בַּסִּפּוּר כָּתוּב "עוֹד"!' },
    { speaker: 'pet', text: g('עֵצָה טוֹבָה: קִרְאִי אֶת הַשְּׁאֵלָה פַּעֲמַיִם, וְדַמְיְנִי אֶת הַסִּפּוּר.', 'עֵצָה טוֹבָה: קְרָא אֶת הַשְּׁאֵלָה פַּעֲמַיִם, וְדַמְיֵן אֶת הַסִּפּוּר.') },
    { speaker: 'hero', text: 'בַּחֲנוּת יֵשׁ מְחִירִים. תֹּף וְגַם כַּדּוּר עוֹלִים 8 וְעוֹד 5 — 13 שְׁקָלִים.', visual: { kind: 'prices', items: [{ icon: '🥁', name: 'תֹּף', price: 8 }, { icon: '⚽', name: 'כַּדּוּר', price: 5 }] } },
    yourTurn,
  ],
  'mult-div': [
    welcome('לְהַר הַכֶּפֶל', 'כָּאן נִלְמַד כֶּפֶל וְחִלּוּק.'),
    { speaker: 'pet', text: 'יֵשׁ 3 קְבוּצוֹת, וּבְכׇל קְבוּצָה 4 תּוּתִים.', visual: { kind: 'groups', groups: 3, each: 4, icon: '🍓' } },
    { speaker: 'hero', text: 'סוֹפְרִים בִּקְפִיצוֹת: 4, 8, 12. כּוֹתְבִים 3 כָּפוּל 4 שָׁוֶה 12.', visual: { kind: 'groups', groups: 3, each: 4, icon: '🍓' }, tokens: [n(3), op('×'), n(4), op('='), n(12)] },
    { speaker: 'pet', text: 'חִלּוּק הוּא חֲלֻקָּה שָׁוָה: 12 סֻכָּרִיּוֹת לְ־3 יְלָדִים — כׇּל יֶלֶד מְקַבֵּל 4.', visual: { kind: 'groups', groups: 3, each: 4, icon: '🍬' }, tokens: [n(12), op(':'), n(3), op('='), n(4)] },
    yourTurn,
  ],
  'line-fractions': [
    welcome('לְגֶשֶׁר הַקֶּשֶׁת', 'כָּאן נִפְגֹּשׁ אֶת יְשַׁר הַמִּסְפָּרִים, חֲצִי וְרֶבַע.'),
    { speaker: 'pet', text: 'בִּישַׁר הַמִּסְפָּרִים, הַמִּסְפָּרִים גְּדֵלִים יְמִינָה. הַחֵץ מַצְבִּיעַ עַל 7.', visual: { kind: 'numberline', min: 0, max: 10, step: 1, labelEvery: 5, arrowAt: 7 } },
    { speaker: 'hero', text: 'חֲצִי — מְחַלְּקִים לִשְׁנֵי חֲלָקִים שָׁוִים.', visual: { kind: 'fraction', shape: 'circle', parts: 2, shaded: 1 } },
    { speaker: 'pet', text: 'רֶבַע — מְחַלְּקִים לְאַרְבָּעָה חֲלָקִים שָׁוִים.', visual: { kind: 'fraction', shape: 'circle', parts: 4, shaded: 1 } },
    { speaker: 'hero', text: 'חֲצִי מִ־10 עוּגִיּוֹת הוּא 5 עוּגִיּוֹת.', visual: { kind: 'groups', groups: 2, each: 5, icon: '🍪' } },
    yourTurn,
  ],
  data: [
    welcome('לְגַן הַחַמָּנִיּוֹת', 'כָּאן נִקְרָא דִּיאַגְרָמוֹת.'),
    { speaker: 'pet', text: 'שָׁאַלְנוּ אֶת הַיְּלָדִים: אֵיזוֹ חַיָּה אַתֶּם הֲכִי אוֹהֲבִים?', visual: { kind: 'bars', labels: ['חָתוּל', 'כֶּלֶב', 'אַרְנָב', 'דָּג'], icons: ['🐱', '🐶', '🐰', '🐟'], values: [6, 4, 8, 2] } },
    { speaker: 'hero', text: g('כׇּל עַמּוּדָה הִיא חַיָּה. עִקְבִי בָּאֶצְבַּע מֵרֹאשׁ הָעַמּוּדָה אֶל הַמִּסְפָּר.', 'כׇּל עַמּוּדָה הִיא חַיָּה. עֲקֹב בָּאֶצְבַּע מֵרֹאשׁ הָעַמּוּדָה אֶל הַמִּסְפָּר.'), visual: { kind: 'bars', labels: ['חָתוּל', 'כֶּלֶב', 'אַרְנָב', 'דָּג'], icons: ['🐱', '🐶', '🐰', '🐟'], values: [6, 4, 8, 2] } },
    { speaker: 'pet', text: 'הָעַמּוּדָה הַגְּבוֹהָה בְּיוֹתֵר הִיא שֶׁל הָאַרְנָב — 8 יְלָדִים בָּחֲרוּ בּוֹ!' },
    yourTurn,
  ],
  measurement: [
    welcome('לְמִגְדַּל הַשָּׁעוֹן', 'כָּאן נִמְדֹּד אֹרֶךְ, שֶׁטַח, מִשְׁקָל וְזְמַן.'),
    { speaker: 'pet', text: 'מוֹדְדִים אֹרֶךְ בְּסַרְגֵּל. מַתְחִילִים מֵהָאֶפֶס! הָעִפָּרוֹן אָרֹךְ 6 סֶנְטִימֶטְרִים.', visual: { kind: 'ruler', length: 6, icon: '✏️' } },
    { speaker: 'hero', text: 'שֶׁטַח — כַּמָּה רִבּוּעִים מְכַסִּים. הֶקֵּף — כַּמָּה קַוִּים מִסָּבִיב.', visual: { kind: 'grid', w: 3, h: 2 } },
    { speaker: 'pet', text: 'בַּשָּׁעוֹן, הַמָּחוֹג הַקָּצָר מַרְאֶה שָׁעָה, וְהָאָרֹךְ מַרְאֶה דַּקּוֹת. עַכְשָׁו הַשָּׁעָה שָׁלוֹשׁ וָחֵצִי.', visual: { kind: 'clock', h: 3, m: 30 } },
    yourTurn,
  ],
  geometry: [
    welcome('לִמְעָרַת הַגְּבִישִׁים', 'כָּאן נַכִּיר גּוּפִים וְצוּרוֹת.'),
    { speaker: 'pet', text: 'זוֹ קֻבִּיָּה. יֵשׁ לָהּ 6 פֵּאוֹת, 8 קׇדְקוֹדִים וְ־12 צְלָעוֹת.', visual: { kind: 'solid', solid: 'cube' } },
    { speaker: 'hero', text: 'וְזֶה גָּלִיל — יֵשׁ לוֹ פֵּאוֹת עֲגֻלּוֹת, וְהוּא יָכוֹל לְהִתְגַּלְגֵּל!', visual: { kind: 'solid', solid: 'cylinder' } },
    { speaker: 'pet', text: 'צוּרָה סִימֶטְרִית: אִם מְקַפְּלִים אוֹתָהּ בָּאֶמְצַע, שְׁנֵי הַחֲלָקִים מִתְאִימִים.', visual: { kind: 'shape', points: [[20, 95], [20, 45], [50, 10], [80, 45], [80, 95]], color: '#db2777' } },
    { speaker: 'hero', text: 'בַּמַּרְאָה הַדֶּגֶל מִתְהַפֵּךְ. בַּהֲזָזָה הוּא רַק זָז.', visual: { kind: 'shape', points: [[20, 95], [20, 8], [80, 28], [28, 48], [28, 95]], color: '#f59e0b', axis: 'v' } },
    yourTurn,
  ],
}

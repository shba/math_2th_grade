# מַמְלֶכֶת הַחֶשְׁבּוֹן — Math Kingdom

A Hebrew grade-2 math game (PWA) for children. Live: https://shba.github.io/math_2th_grade/

- All child-facing text is vocalized (nikud) and read aloud with the browser's Hebrew voice (Web Speech, `he-IL`).
- Starts with a short placement test, then a kingdom map with 9 lands, one per grade-2 curriculum topic:
  addition/subtraction to 20, numbers to 1000, addition/subtraction to 100, word problems,
  multiplication/division, number line and fractions, data, measurement and time, geometry.
- A princess/prince and an animal friend teach a short lesson before each topic.
- Adaptive practice (3 in a row → harder, 2 misses → easier, with hints), and a level test (8 questions, 80%) before the next level. Each passed level earns a badge; finishing a land earns its crown.
- Answers can be handwritten (one box per digit, written left to right; a small CNN trained on MNIST and EMNIST digits reads them in the browser, offline, and notices mirrored digits) or typed on the in-app keypad.
- Every exercise, lesson, test and game screen fits one phone screen without scrolling.
- Mistakes are analysed (reversed digits, off by one, wrong operation, missed regrouping, place value, times-table neighbour, mirrored digit) and explained to the child in friendly language.
- Games: feed the animals, build a castle from tens and ones, carriage race (facts to 20, optional race against your own best time), hit the target.
- Several child profiles on one device; all data stays on the device (IndexedDB).
- Parent area behind a division question: mastery per topic, recurring mistakes, minutes per day, time-of-day heatmap, pace, settings (reduced motion, mute, voice, unlock all, reset), credits.

## Develop

```bash
npm ci
npm run dev      # http://localhost:5173
npm test         # engine, generators, digit recognizer, every exercise type answered by keypad and handwriting
npm run test:e2e # Playwright: no screen scrolls at 360×640, 390×844, 412×915 (CHROME_PATH=… to use a local Chrome)
npm run build    # BASE_PATH=/math_2th_grade/ npm run build for GitHub Pages
```

The digit model in `public/models/digits/` (17 outputs: digits 0–9 and mirrored 2 3 4 5 6 7 9, uint8, about 200 KB)
is built by the scripts in `scripts/handwriting/` (prepare-data → train-digits → quantize-model → evaluate-model).

Deployment: `.github/workflows/deploy.yml` tests, builds and publishes to GitHub Pages on every push to `main`
(repository Settings → Pages → Source must be "GitHub Actions").

Asset licenses: see `public/assets/CREDITS.md`.

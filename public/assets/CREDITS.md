# Credits and licenses

Every asset shipped with Math Kingdom (מַמְלֶכֶת הַחֶשְׁבּוֹן) is listed here. Only CC0, MIT, OFL or CC BY assets are allowed.

| Asset | Files | Author / source | License |
| --- | --- | --- | --- |
| Rubik font | `@fontsource/rubik` (bundled at build time) | Hubert & Fischer, Meir Sadan, Cyreal — https://fonts.google.com/specimen/Rubik | SIL Open Font License 1.1 |
| Fredoka font | `@fontsource-variable/fredoka` | Milena Brandão, Hafontia — https://fonts.google.com/specimen/Fredoka | SIL Open Font License 1.1 |
| Noto Sans Hebrew font | `@fontsource/noto-sans-hebrew` | Google — https://fonts.google.com/noto/specimen/Noto+Sans+Hebrew | SIL Open Font License 1.1 |
| Princess, prince, unicorn, bunny, fox and kitten characters | `src/components/Characters.tsx` (inline SVG) | Original artwork made for this app | MIT (same as the app code) |
| App icon and favicon | `public/favicon.svg`, `public/icons/icon-192.png`, `public/icons/icon-512.png` | Original artwork made for this app | MIT |
| Digit templates for handwriting recognition | `src/handwriting/digits.ts` | Original, hand-built stroke data | MIT |
| Handwritten digit classifier (CNN) | `public/models/digits/`, `src/handwriting/` | Trained for this app by `scripts/handwriting/train-digits.ts`; weights are our own work | MIT (this app) |
| MNIST training data | used to train the model (not shipped) | Yann LeCun, Corinna Cortes, Christopher J.C. Burges, http://yann.lecun.com/exdb/mnist/ | CC BY-SA 3.0 |
| EMNIST digits training data | used to train the model (not shipped) | Cohen, Afshar, Tapson & van Schaik (2017), derived from NIST Special Database 19, https://www.nist.gov/itl/products-and-services/emnist-dataset | NIST data, free to use with attribution |
| TensorFlow.js | `@tensorflow/tfjs-core`, `tfjs-layers`, `tfjs-backend-cpu` | Google, https://github.com/tensorflow/tfjs | Apache-2.0 |
| Emoji (animals, fruit, objects) | Not bundled; drawn by the device's system emoji font | Apple / Google / Microsoft / Samsung, depending on device | Rendered by the OS, not redistributed |

Curriculum content follows the Israeli Ministry of Education grade-2 mathematics curriculum. All exercise text was written for this app.

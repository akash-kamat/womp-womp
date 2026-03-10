# wompwomp

a simple quiz app because my girlfriend needed quizzes from her uni notes and NotebookLM is too restricted and limited for what we wanted.

so i built this instead. upload a JSON, take a quiz, get your score. that's it.

![React](https://img.shields.io/badge/React-19-blue) ![Vite](https://img.shields.io/badge/Vite-6-purple) ![License](https://img.shields.io/badge/License-MIT-green)

---

## what it does

- **upload quiz JSONs** — drag and drop or click to upload
- **pick your mode** — all questions, MCQ only, or true/false only
- **instant feedback** — see if you're right/wrong after each question with explanations
- **scoring & grades** — percentage, letter grade, correct/wrong breakdown
- **progress saved** — all quizzes and attempt history persist in localStorage
- **answer review** — go through every question after finishing to see what you got wrong
- **retry** — retake any quiz as many times as you want

---

## getting started

```bash
npm create vite@latest wompwomp -- --template react
cd wompwomp
npm install
```

replace the contents of `src/App.jsx` with the quiz app code, then delete `src/App.css` and `src/index.css`. also remove these lines if they exist:

```js
// delete these from main.jsx and App.jsx
import './index.css'
import './App.css'
```

then run:

```bash
npm run dev
```

open `localhost:5173` and you're good.

---

## deploying

```bash
npm run build
```

drag the `dist/` folder to [netlify drop](https://app.netlify.com/drop) for instant hosting. or push to github and connect to [vercel](https://vercel.com) for auto-deploys.

---

## quiz JSON format

the app expects a `.json` file with this structure:

```json
{
  "quiz_title": "Your Quiz Title Here",
  "total_questions": 60,
  "mcq": [
    {
      "id": 1,
      "question": "What is the powerhouse of the cell?",
      "options": [
        "A. Nucleus",
        "B. Mitochondria",
        "C. Ribosome",
        "D. Golgi apparatus"
      ],
      "answer": "B",
      "explanation": "Mitochondria generate most of the cell's ATP through oxidative phosphorylation."
    }
  ],
  "true_or_false": [
    {
      "id": 51,
      "statement": "DNA is a single-stranded molecule.",
      "answer": false,
      "explanation": "DNA is double-stranded, forming a double helix structure."
    }
  ]
}
```

### rules

- `mcq` array — each item needs `id`, `question`, `options` (A-D), `answer` (letter), `explanation`
- `true_or_false` array — each item needs `id`, `statement`, `answer` (true/false boolean), `explanation`
- `quiz_title` — shows up as the quiz name in the app
- `total_questions` — optional, just for reference
- you can have only MCQs, only true/false, or both — the app handles all cases

---

## how to generate quizzes with an LLM

this is the real move. take your notes, paste them into claude (or any LLM), and get a quiz JSON back in seconds.

### on claude

1. upload your notes file (docx, pdf, txt, whatever)
2. use this prompt:

```
make 50 MCQ quizzes and 10 true or false from this, give it in a structured JSON since this will be used in a quiz app
```

that's literally it. claude will output a JSON with the exact format the app expects. copy it, save as `.json`, upload to wompwomp.

### tips for better quizzes

- **be specific about count** — "50 MCQs and 10 true/false" works better than "make some quizzes"
- **mention it's for a quiz app** — this tells the LLM to output clean structured JSON instead of markdown
- **ask for explanations** — the app displays them after each answer, super helpful for studying
- **split large notes** — if your notes are huge, split by topic/chapter and generate separate quiz files. easier to study in chunks anyway
- **ask for difficulty levels** — you can add "make 20 easy, 20 medium, 10 hard MCQs" if you want variety

### if the LLM gives you markdown instead of raw JSON

just add this to your prompt:

```
output ONLY the raw JSON, no markdown code blocks, no explanation before or after
```

### for other LLMs (chatgpt, gemini, etc.)

same prompt works. just make sure the output matches the JSON format above. the key names (`mcq`, `true_or_false`, `question`, `options`, `answer`, `explanation`, `statement`) need to match exactly.

---

## stack

- react 19
- vite
- zero dependencies beyond that
- localStorage for persistence
- inline styles (no CSS files needed)

---

## license

MIT — do whatever you want with it.

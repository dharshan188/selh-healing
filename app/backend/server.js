const express = require("express");
const cors = require("cors");
const fs = require("fs");

const app = express();
const PORT = 3000;

const notes = [];

app.use(cors());
app.use(express.json());

// 🔥 LOG FUNCTION (CRITICAL)
function logError(err) {
  const message = `[${new Date().toISOString()}] ${err.stack || err}\n`;
  fs.appendFileSync("./error.log", message);
  console.error(message);
}

// GET /notes
app.get("/notes", (req, res) => {
  try {
    res.json(notes);
  } catch (error) {
    logError(error);
    res.status(500).json({ message: "Failed to fetch notes" });
  }
});

// POST /notes
app.post("/notes", (req, res) => {
  try {
    const { title, content } = req.body;

    const newNote = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title,
      content,
    };

    notes.push(newNote);

    // 💣 INTENTIONAL BUG (FOR TESTING AI FIX)
res.status(201).json({ note: newNote });

  } catch (error) {
    logError(error);
    res.status(500).json({ message: "Failed to add note" });
  }
});

// DELETE /notes/:id
app.delete("/notes/:id", (req, res) => {
  try {
    const { id } = req.params;
    const noteIndex = notes.findIndex((note) => note.id === id);

    if (noteIndex === -1) {
      return res.status(404).json({ message: "Note not found" });
    }

    const deletedNote = notes.splice(noteIndex, 1)[0];

    res.json({ message: "Note deleted", note: deletedNote });

  } catch (error) {
    logError(error);
    res.status(500).json({ message: "Failed to delete note" });
  }
});

// GLOBAL ERROR HANDLER (extra safety)
app.use((err, req, res, next) => {
  logError(err);
  res.status(500).json({ error: err.message });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
const API_URL = "http://localhost:3000/notes";

const titleInput = document.getElementById("titleInput");
const contentInput = document.getElementById("contentInput");
const addNoteBtn = document.getElementById("addNoteBtn");
const notesList = document.getElementById("notesList");

// Fetch all notes from backend and render in UI
async function loadNotes() {
  try {
    const response = await fetch(API_URL);

    if (!response.ok) {
      throw new Error("Failed to load notes");
    }

    const notes = await response.json();
    renderNotes(notes);
  } catch (error) {
    console.error("Error loading notes:", error);
    notesList.innerHTML = `<p class="empty-text">Could not load notes.</p>`;
  }
}

// Render notes list dynamically
function renderNotes(notes) {
  notesList.innerHTML = "";

  if (notes.length === 0) {
    notesList.innerHTML = `<p class="empty-text">No notes yet.</p>`;
    return;
  }

  notes.forEach((note) => {
    const noteElement = document.createElement("div");
    noteElement.className = "note-item";

    noteElement.innerHTML = `
      <h3>${note.title ?? ""}</h3>
      <p>${note.content ?? ""}</p>
      <button class="delete-btn" data-id="${note.id}">Delete</button>
    `;

    notesList.appendChild(noteElement);
  });
}

// Add a new note using backend API
async function addNote() {
  try {
    const payload = {
      title: titleInput.value,
      content: contentInput.value,
    };

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error("Failed to add note");
    }

    // Clear inputs and refresh list
    titleInput.value = "";
    contentInput.value = "";
    await loadNotes();
  } catch (error) {
    console.error("Error adding note:", error);
  }
}

// Delete a note by ID using backend API
async function deleteNote(noteId) {
  try {
    const response = await fetch(`${API_URL}/${noteId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error("Failed to delete note");
    }

    await loadNotes();
  } catch (error) {
    console.error("Error deleting note:", error);
  }
}

// Click handler for Add button
addNoteBtn.addEventListener("click", addNote);

// Event delegation for Delete buttons
notesList.addEventListener("click", (event) => {
  if (event.target.classList.contains("delete-btn")) {
    const noteId = event.target.getAttribute("data-id");
    deleteNote(noteId);
  }
});

// Load notes on page load
loadNotes();

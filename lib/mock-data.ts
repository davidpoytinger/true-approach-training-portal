export const mockPlayer = { id: 1, name: "Sample Player" };

export const mockSessions = [
  {
    id: 101,
    date: "August 27, 2026",
    title: "Hitting Session",
    coachNotes: "Focus on staying through the middle of the field.",
    videos: [
      { id: 1, title: "Front View", note: "Watch the front shoulder on the first few swings." },
      { id: 2, title: "Side View", note: "Better lower-half sequence here." },
      { id: 3, title: "Final Round", note: "This is the move we want to repeat." }
    ]
  },
  {
    id: 100,
    date: "August 20, 2026",
    title: "Previous Hitting Session",
    coachNotes: "Good progress.",
    videos: [{ id: 4, title: "Session Video", note: "Compare this with the newest session." }]
  }
];

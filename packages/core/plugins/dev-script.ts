/// <reference lib="dom" />

const conn = new WebSocket(`ws://${location?.host ?? "localhost:8000"}/__dev`);
conn.addEventListener("open", () => {
  console.log("Connected to dev server");
});
conn.addEventListener("message", (event) => {
  if (event.data === "reload") {
    location.reload();
  }
});

conn.addEventListener("close", () => {
  console.log("Disconnected from dev server");
});
conn.addEventListener("error", (event) => {
  console.log(event);
});

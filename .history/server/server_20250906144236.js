import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import  pool  from "./db.js";

// Load .env
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// ---------- MIDDLEWARE ----------
app.use(cors());
app.use(express.json());
// app.use(morgan("dev"));

// ---------- ROUTES ----------
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/users.routes.js";
import projectRoutes from "./routes/projects.routes.js";
import memberRoutes from "./routes/members.routes.js";
import taskRoutes from "./routes/tasks.routes.js";
import taskCommentsRoutes from "./routes/taskComments.routes.js";
import taskAssigneesRouter from "./routes/taskAssignees.routes.js";
import meRouter from "./routes/me.routes.js";
import threadRoutes from "./routes/threads.routes.js";
// import messageRoutes from "./routes/messages.routes.js";
// import notificationRoutes from "./routes/notifications.routes.js";
// import searchRoutes from "./routes/search.routes.js";



app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/projects", projectRoutes);
app.use("/projects", memberRoutes); 
app.use("/projects", taskRoutes);
app.use("/projects", taskCommentsRoutes);
app.use("/projects", taskAssigneesRouter);
app.use("/", meRouter);
app.use("/projects", threadRoutes);
// app.use("/messages", messageRoutes);
// app.use("/notifications", notificationRoutes);
// app.use("/search", searchRoutes);



pool.query("SELECT NOW()", (err, result) => {
  if (err) {
    console.error("Failed to connect to database", err);
    process.exit(1);
  } else {
    console.log("Database connected at", result.rows[0].now);
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
  }
});

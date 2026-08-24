import { createBrowserRouter } from "react-router-dom";
import { HomePage } from "../features/home/HomePage";
import { RoomPage } from "./RoomPage";

export const router = createBrowserRouter([
  { path: "/", element: <HomePage /> },
  { path: "/room/:roomId", element: <RoomPage /> },
]);

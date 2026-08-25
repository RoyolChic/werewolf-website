import { RouterProvider } from "react-router-dom";
import { AudioControl } from "../components/AudioControl";
import { AudioProvider } from "../lib/audio/audioContext";
import { router } from "./router";

export function App() {
  return (
    <AudioProvider>
      <AudioControl />
      <RouterProvider router={router} />
    </AudioProvider>
  );
}

import { Outlet } from "react-router-dom"
import Wave from "../components/wave.js"

export default function WavePagesLayout() {
  return (
    <div className="body">
      <Outlet />
      <Wave />
    </div>
  );
}
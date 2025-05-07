import { Outlet } from "react-router";
import Navbar from "./Navbar";

export default function AppLayout() {
  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <Navbar />
      <main className="flex-1 overflow-auto pt-24 p-6">
        <Outlet />
      </main>
    </div>
  );
}

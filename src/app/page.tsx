import { redirect } from "next/navigation";
import LoginButton from "@/components/LoginButton";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-teal-50 to-blue-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-lg p-10 w-full max-w-md text-center">
        <div className="mb-6">
          <div className="w-16 h-16 bg-teal-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl font-bold">KL</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Clínica Karina Lara</h1>
          <p className="text-gray-500 mt-2 text-sm">Nutrición Clínica Especializada</p>
          <p className="text-gray-400 text-xs mt-1">Neurodesarrollo y Salud Intestinal</p>
        </div>
        <LoginButton />
      </div>
    </main>
  );
}
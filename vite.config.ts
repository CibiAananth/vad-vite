import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: [
      "onnxruntime-web",
      "ort-wasm-simd-threaded",
      "ort-wasm-simd",
      "ort-wasm-threaded",
      "ort-wasm",
    ],
  },
});

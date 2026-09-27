import { GarageProvider } from "./state/GarageProvider";
import { Editor } from "./ui/Editor";

export default function App() {
  return (
    <GarageProvider>
      <Editor />
    </GarageProvider>
  );
}

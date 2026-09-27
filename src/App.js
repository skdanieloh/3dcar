import { jsx as _jsx } from "react/jsx-runtime";
import { GarageProvider } from "./state/GarageProvider";
import { Editor } from "./ui/Editor";
export default function App() {
    return (_jsx(GarageProvider, { children: _jsx(Editor, {}) }));
}

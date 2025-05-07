import { useState } from "react";
import httpClient from "../utils/httpClient";
import Swal from "sweetalert2";

const FloatingToolbar = ({ editor, position }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isTranslateDropdownOpen, setIsTranslateDropdownOpen] = useState(false);

  if (!editor || !position) return null;

  const languages = [
    "Indonesia",
    "Arabic",
    "Chinese",
    "English",
    "French",
    "German",
    "Greek",
    "Italian",
    "Japanese",
    "Korean",
    "Russian",
  ];

  const getTextForProcessing = () => {
    const { from, to } = editor.state.selection;
    return editor.state.doc.textBetween(from, to, " ");
  };

  const handleAIAction = async (action, customPrompt = null) => {
    try {
      const selectedText = getTextForProcessing();
      if (!selectedText) {
        Swal.fire({
          icon: "warning",
          title: "No Text Selected",
          text: "Please select some text or ensure the editor has content.",
        });
        return;
      }

      let prompt;
      switch (action) {
        case "simplify":
          prompt = `Simplify the following text to make it easier to understand. Return only plain text. Do not use markdown or bullet points: ${selectedText}`;
          break;
        case "fixSpellingGrammar":
          prompt = `Fix grammar and spelling in this sentence. Return only the corrected sentence in plain text without markdown or formatting: ${selectedText}`;
          break;
        case "makeShorter":
          prompt = `Shorten the following sentence to a single concise version with the same meaning. Return only the shortened sentence in plain text, without any formatting: ${selectedText}`;
          break;
        case "makeLonger":
          prompt = `Expand the following sentence into a longer and more detailed version, keeping its meaning. In plain text (no markdown, no bullet points): ${selectedText}`;
          break;
        case "completeSentence":
          prompt = `Complete the following sentence naturally. In plain text without formatting: ${selectedText}`;
          break;
        case "translate":
          prompt = customPrompt;
          break;
        default:
          prompt = selectedText;
      }

      const { data } = await httpClient.post("/ai/process", { prompt });
      if (data?.result) {
        const { from, to } = editor.state.selection;
        editor
          .chain()
          .focus()
          .deleteRange({ from, to })
          .insertContent(data.result)
          .run();
      }
    } catch (err) {
      console.error(`Failed to perform ${action}:`, err);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: `Failed to ${action}. Please try again.`,
      });
    }
  };

  const handleTranslate = (language) => {
    const selectedText = getTextForProcessing();
    if (!selectedText) {
      Swal.fire({
        icon: "warning",
        title: "No Text Selected",
        text: "Please select some text or ensure the editor has content.",
      });
      return;
    }
    const prompt = `Translate the following text into ${language}: ${selectedText} In plain text without formatting or bullet points`;
    handleAIAction("translate", prompt);
    setIsTranslateDropdownOpen(false);
    setIsDropdownOpen(false);
  };

  const handleLink = () => {
    const { from, to } = editor.state.selection;
    if (from === to) {
      Swal.fire({
        icon: "warning",
        title: "No Text Selected",
        text: "Pilih teks terlebih dahulu untuk menambahkan tautan.",
      });
      return;
    }

    const previousUrl = editor.getAttributes("link").href;
    const url = prompt(
      previousUrl ? "Edit URL (kosongkan untuk hapus):" : "Masukkan URL:",
      previousUrl || ""
    );
    if (url === null) return;

    if (url === "") {
      editor.chain().focus().unsetLink().run();
    } else {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  return (
    <div
      className="absolute bg-white border border-gray-200 rounded-lg shadow-lg p-2 flex space-x-2 z-10 transition-all duration-200"
      style={{ top: position.top, left: position.left }}
    >
      {/* AI Tools Dropdown */}
      <div className="relative" onMouseEnter={() => setIsDropdownOpen(true)}>
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="p-2 hover:bg-gray-200 flex items-center rounded-md"
        >
          <span className="material-icons">auto_awesome</span>
          <span className="ml-2 text-sm">Coba AI</span>
        </button>

        {isDropdownOpen && (
          <div className="absolute left-0 mt-6 w-80 bg-white border border-gray-200 rounded-lg shadow-xl z-20">
            {[
              { action: "simplify", icon: "lightbulb", label: "Sederhanakan" },
              {
                action: "fixSpellingGrammar",
                icon: "spellcheck",
                label: "Perbaiki Ejaan & Tata Bahasa",
              },
              { action: "makeShorter", icon: "remove", label: "Persingkat" },
              { action: "makeLonger", icon: "add", label: "Perpanjang" },
              {
                action: "completeSentence",
                icon: "auto_fix_high",
                label: "Lengkapi Kalimat",
              },
            ].map(({ action, icon, label }) => (
              <button
                key={action}
                onClick={() => {
                  handleAIAction(action);
                  setIsDropdownOpen(false);
                }}
                className="block w-full text-left px-4 py-3 hover:bg-neutral-50 flex items-center"
              >
                <span className="material-icons mr-3 text-neutral-900">
                  {icon}
                </span>
                <span className="text-neutral-900">{label}</span>
              </button>
            ))}

            <div
              className="relative"
              onMouseEnter={() => setIsTranslateDropdownOpen(true)}
              onMouseLeave={() => setIsTranslateDropdownOpen(false)}
            >
              <button
                onClick={() => setIsTranslateDropdownOpen((prev) => !prev)}
                className="block w-full text-left px-4 py-3 hover:bg-neutral-50 flex items-center justify-between"
              >
                <div className="flex items-center">
                  <span className="material-icons mr-3 text-neutral-900">
                    translate
                  </span>
                  <span className="text-neutral-900">Terjemahkan</span>
                </div>
                <span
                  className={`material-icons text-sm ${
                    isTranslateDropdownOpen ? "rotate-90" : ""
                  }`}
                >
                  chevron_right
                </span>
              </button>

              {isTranslateDropdownOpen && (
                <div className="absolute left-full top-0 w-48 bg-white border border-gray-200 rounded-lg shadow-xl z-20">
                  {languages.map((lang) => (
                    <button
                      key={lang}
                      onClick={() => handleTranslate(lang)}
                      className="block w-full text-left px-4 py-2 hover:bg-neutral-50 text-neutral-900"
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Separator */}
      <div className="border-l border-gray-200 mx-1"></div>

      {/* Formatting Buttons */}
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`p-2 hover:bg-gray-200 flex items-center rounded-md ${
          editor.isActive("bold") ? "bg-blue-100" : ""
        }`}
      >
        <span className="material-icons">format_bold</span>
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`p-2 hover:bg-gray-200 flex items-center rounded-md ${
          editor.isActive("italic") ? "bg-blue-100" : ""
        }`}
      >
        <span className="material-icons">format_italic</span>
      </button>
      <button
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={`p-2 hover:bg-gray-200 flex items-center rounded-md ${
          editor.isActive("underline") ? "bg-blue-100" : ""
        }`}
      >
        <span className="material-icons">format_underlined</span>
      </button>
      <button
        onClick={handleLink}
        className={`p-2 flex items-center rounded-md ${
          editor.isActive("link") ? "bg-blue-100" : "hover:bg-gray-200"
        }`}
      >
        <span className="material-icons">link</span>
      </button>
    </div>
  );
};

export default FloatingToolbar;

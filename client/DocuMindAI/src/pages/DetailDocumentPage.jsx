import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "react-router";
import io from "socket.io-client";
import debounce from "lodash/debounce";
import httpClient from "../utils/httpClient";
import Swal from "sweetalert2";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextStyle from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import ListItem from "@tiptap/extension-list-item";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";

import FloatingToolbar from "../components/FloatingToolbar";
import { useAuth } from "../context/AuthContext";

const socket = io(import.meta.env.VITE_API_URL || "http://localhost:3000", {
  withCredentials: true,
});

export default function DetailDocumentPage() {
  const { id } = useParams();
  const documentId = Number(id);
  const { user } = useAuth();

  const [document, setDocument] = useState(null);
  const [content, setContent] = useState("");
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [activeUsers, setActiveUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]); // State untuk pengguna yang sedang mengetik
  const [cursorPositions, setCursorPositions] = useState({}); // State untuk menyimpan posisi kursor
  const [selections, setSelections] = useState({}); // State untuk menyimpan seleksi pengguna lain
  const [summary, setSummary] = useState("");
  const [error, setError] = useState(null);
  const [charUsed, setCharUsed] = useState(0);
  const [wordCount, setWordCount] = useState(0);
  const [toolbarPosition, setToolbarPosition] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const editorRef = useRef(null);
  const isUpdatingFromSocket = useRef(false);
  const isUpdatingFromUser = useRef(false);
  const typingTimeoutRef = useRef(null); // Ref untuk mengelola timeout typing

  // Share document state
  const [hasAccess, setHasAccess] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareEmail, setShareEmail] = useState("");
  const [shareError, setShareError] = useState("");

  const debouncedUpdate = useCallback(
    debounce((newContent) => {
      if (isDataLoaded && newContent !== "<p></p>" && hasAccess) {
        socket.emit("updateDocument", {
          documentId,
          content: newContent,
          userId: user.id,
        });
      }
    }, 300),
    [documentId, user, isDataLoaded, hasAccess]
  );

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          bulletList: { keepMarks: true },
          orderedList: { keepMarks: true },
          history: false,
        }),
        Placeholder.configure({
          placeholder: hasAccess
            ? "Tulis sesuatu di sini..."
            : "Anda hanya dapat melihat dokumen ini.",
          emptyEditorClass: "is-editor-empty",
        }),
        Link.configure({
          autolink: false,
          linkOnPaste: true,
          HTMLAttributes: {
            target: "_blank",
            rel: "noopener noreferrer nofollow",
            class: "text-blue-600 font-bold underline",
          },
        }),
        Color.configure({ types: [TextStyle.name, ListItem.name] }),
        TextStyle.configure({ types: [ListItem.name] }),
        Underline,
      ],
      editorProps: {
        attributes: {
          class:
            "prose prose-sm sm:prose-base lg:prose-lg xl:prose-2xl focus:outline-none",
        },
        editable: () => hasAccess,
      },
      content: content,
      onUpdate: ({ editor }) => {
        const html = editor.getHTML();
        const text = editor.getText();
        const charCount = text.length;
        const wordCount =
          text
            .trim()
            .split(/\s+/)
            .filter((word) => word.length > 0).length || 0;

        if (!isUpdatingFromSocket.current) {
          isUpdatingFromUser.current = true;
          setContent(html);
        }
        setCharUsed(charCount);
        setWordCount(wordCount);
        if (isDataLoaded && hasAccess) {
          debouncedUpdate(html);

          // Emit event userTyping beserta posisi kursor dan seleksi
          const { from, to } = editor.state.selection;
          const coords = editor.view.coordsAtPos(from);
          const editorRect = editorRef.current.getBoundingClientRect();
          const cursorPos = {
            top: coords.top - editorRect.top,
            left: coords.left - editorRect.left,
          };

          socket.emit("userTyping", {
            documentId,
            userId: user.id,
            userName:
              user.username ||
              user.email?.split("@")[0] ||
              "Pengguna Tanpa Nama",
            cursorPos,
            selection: { from, to },
          });

          // Bersihkan timeout sebelumnya dan set timeout baru untuk stop typing
          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
          }
          typingTimeoutRef.current = setTimeout(() => {
            socket.emit("userStoppedTyping", { documentId, userId: user.id });
          }, 2000); // Hentikan typing setelah 2 detik tidak aktif
        }
      },
      onSelectionUpdate: ({ editor }) => {
        if (!hasAccess) {
          setToolbarPosition(null);
          return;
        }

        const { from, to } = editor.state.selection;
        // Hanya tampilkan toolbar jika ada teks yang dipilih (seleksi tidak kosong)
        if (!editor.state.selection.empty && from !== to && editorRef.current) {
          const { view } = editor;
          const coords = view.coordsAtPos(from);
          const endCoords = view.coordsAtPos(to);
          const editorRect = editorRef.current.getBoundingClientRect();

          const selectionWidth = endCoords.left - coords.left;
          const toolbarHeight = 70;
          const toolbarWidth = 150;

          // Posisikan toolbar di tengah di bawah seleksi
          const relativeLeft =
            coords.left -
            editorRect.left +
            selectionWidth / 2 -
            toolbarWidth / 2;
          const relativeTop = endCoords.bottom - editorRect.top + 16; // Di bawah seleksi
          const maxLeft = editorRect.width - toolbarWidth;
          const adjustedLeft = Math.min(Math.max(0, relativeLeft), maxLeft);

          // Cegah overflow vertikal
          const maxTop = editorRect.height - toolbarHeight;
          const adjustedTop = Math.min(Math.max(0, relativeTop), maxTop);

          setToolbarPosition({
            top: adjustedTop,
            left: adjustedLeft,
          });
        } else {
          // Sembunyikan toolbar jika tidak ada teks yang dipilih
          setToolbarPosition(null);
        }

        // Kirim posisi kursor terbaru dan seleksi jika pengguna sedang mengetik
        if (hasAccess && editorRef.current) {
          const coords = editor.view.coordsAtPos(from);
          const editorRect = editorRef.current.getBoundingClientRect();
          const cursorPos = {
            top: coords.top - editorRect.top,
            left: coords.left - editorRect.left,
          };
          socket.emit("userTyping", {
            documentId,
            userId: user.id,
            userName:
              user.username ||
              user.email?.split("@")[0] ||
              "Pengguna Tanpa Nama",
            cursorPos,
            selection: { from, to },
          });
        }
      },
    },
    [documentId, user, hasAccess]
  );

  // Periksa hak akses pengguna
  useEffect(() => {
    if (!user || !documentId) return;
    httpClient
      .get(`/documents/${documentId}/access`)
      .then(({ data }) => {
        setHasAccess(data.hasAccess && data.accessLevel === "edit");
      })
      .catch((err) => {
        console.error("Gagal memeriksa akses:", err);
        setError("Gagal memeriksa akses dokumen");
      });
  }, [documentId, user]);

  // Ambil data dokumen
  useEffect(() => {
    if (!documentId || isNaN(documentId)) {
      setError("ID dokumen tidak valid");
      return;
    }
    httpClient
      .get(`/documents/${documentId}`)
      .then(({ data }) => {
        setDocument(data);
        const newContent =
          data.content && data.content !== "<p></p>" ? data.content : "";
        setContent(newContent);
        setIsDataLoaded(true);
      })
      .catch((err) => {
        console.error("Gagal mengambil dokumen:", err);
        setError("Gagal mengambil dokumen");
        setIsDataLoaded(true);
      });
  }, [documentId]);

  // Perbarui editor saat konten berubah
  useEffect(() => {
    if (editor && isDataLoaded) {
      if (isUpdatingFromSocket.current || !isUpdatingFromUser.current) {
        editor.commands.setContent(content);
      }
      isUpdatingFromSocket.current = false;
      isUpdatingFromUser.current = false;
    }
  }, [editor, content, isDataLoaded]);

  // Perbarui judul halaman
  useEffect(() => {
    if (document?.title) {
      document.title = `${document.title}`;
    }
  }, [document]);

  // Socket untuk kolaborasi
  useEffect(() => {
    if (!user || !documentId) return;
    socket.emit("joinDocument", { documentId, userId: user.id });

    socket.on("documentContentUpdated", ({ content: newContent, userId }) => {
      if (userId !== user.id) {
        isUpdatingFromSocket.current = true;
        setContent(newContent);
      }
    });
    socket.on("aiSummary", ({ summary: sum, documentId: dId }) => {
      if (dId === documentId) setSummary(sum);
    });
    socket.on("activeUsers", ({ users, documentId: dId }) => {
      if (dId === documentId) setActiveUsers(users);
    });
    socket.on("error", ({ message }) => setError(message));

    return () => {
      socket.emit("leaveDocument", { documentId, userId: user.id });
      socket.off("documentContentUpdated");
      socket.off("aiSummary");
      socket.off("activeUsers");
      socket.off("error");
    };
  }, [documentId, user]);

  // Socket untuk indikator typing dan seleksi
  useEffect(() => {
    if (!user || !documentId || !editor) return;

    socket.on(
      "userTyping",
      ({ userId, documentId: dId, cursorPos, selection }) => {
        if (dId === documentId && userId !== user.id) {
          // Cari pengguna di activeUsers untuk mendapatkan warna
          const typingUser = activeUsers.find((u) => u.id === userId);
          if (typingUser) {
            setTypingUsers((prev) => {
              const existingUser = prev.find((u) => u.userId === userId);
              if (!existingUser) {
                return [
                  ...prev,
                  {
                    userId,
                    userName: typingUser.name,
                    color: typingUser.color,
                  },
                ];
              }
              return prev;
            });
            setCursorPositions((prev) => ({
              ...prev,
              [userId]: cursorPos,
            }));

            // Simpan informasi seleksi
            if (selection && selection.from !== selection.to) {
              const { view } = editor;
              let startCoords, endCoords;
              try {
                startCoords = view.coordsAtPos(selection.from);
                endCoords = view.coordsAtPos(selection.to);
              } catch (err) {
                console.error("Error getting coords for selection:", err);
                return;
              }
              const editorRect = editorRef.current.getBoundingClientRect();
              setSelections((prev) => ({
                ...prev,
                [userId]: {
                  from: {
                    top: startCoords.top - editorRect.top,
                    left: startCoords.left - editorRect.left,
                  },
                  to: {
                    top: endCoords.top - editorRect.top,
                    left: endCoords.left - editorRect.left,
                  },
                  color: typingUser.color,
                },
              }));
            } else {
              // Hapus seleksi jika tidak ada rentang seleksi
              setSelections((prev) => {
                const newSelections = { ...prev };
                delete newSelections[userId];
                return newSelections;
              });
            }
          }
        }
      }
    );

    socket.on("userStoppedTyping", ({ userId, documentId: dId }) => {
      if (dId === documentId) {
        console.log(`Pengguna ${userId} berhenti mengetik.`); // Debugging
        setTypingUsers((prev) => prev.filter((u) => u.userId !== userId));
        setCursorPositions((prev) => {
          const newPositions = { ...prev };
          delete newPositions[userId];
          return newPositions;
        });
        setSelections((prev) => {
          const newSelections = { ...prev };
          delete newSelections[userId];
          return newSelections;
        });
      }
    });

    return () => {
      socket.off("userTyping");
      socket.off("userStoppedTyping");
    };
  }, [documentId, user, activeUsers, editor]);

  // Fungsi untuk menghasilkan judul AI
  const generateAITitle = async () => {
    if (!content || !hasAccess) return;
    try {
      const prompt = `
      Generate a concise title (max 10 words) in the same language as the following content:
      ${content}`.trim();

      const { data } = await httpClient.post("/ai/generate-title", {
        prompt,
      });
      if (data?.title) {
        const updatedTitle = data.title.trim();
        setDocument((prev) => ({ ...prev, title: updatedTitle }));
        await httpClient.put(`/documents/${documentId}`, {
          title: updatedTitle,
          content,
          isPublic: document?.isPublic,
        });
      }
    } catch (err) {
      console.error("❌ Gagal generate judul AI:", err);
      setError("Gagal menghasilkan judul AI");
    }
  };

  // Fungsi untuk menghasilkan AI Summary dan menyimpan ke tabel Summaries
  const generateAISummary = async () => {
    if (!content || !hasAccess) return;
    try {
      const prompt = `
      Generate a concise summary in the same language as the provided content, in plain text without formatting or bullet points
      ${content}`.trim();

      const { data } = await httpClient.post("/ai/generate-title", {
        prompt,
      });
      if (data?.title) {
        const generatedSummary = data.title.trim();
        setSummary(generatedSummary);

        // Simpan ringkasan ke tabel Summaries melalui endpoint /ai/summaries
        await httpClient.post(`/ai/summaries`, {
          documentId,
          content: generatedSummary,
        });

        socket.emit("aiSummary", {
          documentId,
          summary: generatedSummary,
        });
      }
    } catch (err) {
      console.error("❌ Gagal generate ringkasan AI:", err);
      setError("Gagal menghasilkan ringkasan AI");
    }
  };

  // Fungsi untuk berbagi dokumen
  const handleShare = () => {
    setShowShareModal(true);
  };

  // Fungsi untuk submit share
  const handleShareSubmit = async () => {
    if (!shareEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(shareEmail)) {
      setShareError("Masukkan email yang valid");
      return;
    }
    try {
      await httpClient.post(`/documents/${documentId}/share`, {
        email: shareEmail,
        accessLevel: "edit",
      });
      setShowShareModal(false);
      setShareEmail("");
      setShareError("");
      Swal.fire({
        icon: "success",
        title: "Berhasil!",
        text: "Dokumen berhasil dibagikan.",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (err) {
      console.error("Gagal membagikan dokumen:", err);
      setShareError("Gagal membagikan dokumen. Coba lagi.");
    }
  };

  if (error) return <div className="ml-64 text-red-500">{error}</div>;
  if (!document || !editor) return <div className="ml-64 p-6">Memuat…</div>;

  return (
    <main className="bg-gray-100 min-h-screen relative">
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <div className="flex justify-between items-center mb-4 space-x-4">
          <div className="flex items-center space-x-2 w-full">
            <input
              type="text"
              value={document.title}
              onChange={(e) =>
                setDocument((prev) => ({ ...prev, title: e.target.value }))
              }
              onBlur={async () => {
                try {
                  if (!document || !hasAccess) return;
                  await httpClient.put(`/documents/${documentId}`, {
                    title: document.title,
                    content,
                    isPublic: document.isPublic,
                  });
                } catch (err) {
                  console.error("Gagal memperbarui judul:", err);
                  setError("Gagal memperbarui judul");
                }
              }}
              className="text-2xl font-bold w-full outline-none focus:border-blue-500 mr-4"
              placeholder="Masukkan judul dokumen di sini..."
              disabled={!hasAccess}
            />
            {hasAccess && (
              <button
                onClick={generateAITitle}
                className="flex items-center bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 px-3 py-2"
                title="Buat Judul Otomatis dengan AI"
              >
                <span className="material-icons text-xl">refresh</span>
              </button>
            )}
          </div>

          {/* Share button */}
          {hasAccess && (
            <button
              onClick={handleShare}
              className="flex items-center bg-blue-600 text-white rounded-md hover:bg-blue-700 px-4 py-2"
            >
              <span className="material-icons mr-2">share</span>
              Bagikan
            </button>
          )}
        </div>

        <div className="relative">
          <EditorContent
            ref={editorRef}
            editor={editor}
            className="tiptap w-full rounded-2xl focus:ring-blue-500 min-h-[300px]"
          />

          {/* Indikator Typing di Posisi Kursor */}
          {typingUsers.map((u) => {
            const position = cursorPositions[u.userId];
            if (!position) return null;
            return (
              <div
                key={u.userId}
                className="absolute z-10 flex items-center px-2 py-1 rounded text-white text-sm"
                style={{
                  top: position.top - 20, // Sedikit di atas kursor
                  left: position.left + 5, // Sedikit ke kanan kursor
                  backgroundColor: u.color || "#ccc",
                }}
              >
                <span>{u.userName || "Pengguna Tanpa Nama"}</span>
                <span className="ml-1 animate-pulse">...</span>
              </div>
            );
          })}

          {/* Highlight Seleksi Pengguna Lain */}
          {Object.entries(selections).map(([userId, sel]) => {
            const user = activeUsers.find((u) => u.id === userId);
            if (!user) return null;
            const width = sel.to.left - sel.from.left;
            const height = sel.to.top - sel.from.top;
            return (
              <div
                key={userId}
                className="absolute z-5 opacity-30"
                style={{
                  top: sel.from.top,
                  left: sel.from.left,
                  width: width > 0 ? width : 2, // Minimal lebar untuk visibilitas
                  height: height > 0 ? height : 20, // Minimal tinggi untuk visibilitas
                  backgroundColor: user.color || "#ccc",
                }}
              />
            );
          })}

          {/* Use the separate FloatingToolbar component */}
          {hasAccess && toolbarPosition && (
            <FloatingToolbar editor={editor} position={toolbarPosition} />
          )}
        </div>

        <div className="flex justify-between items-center mt-4">
          <span className="ml-2 text-sm text-gray-600">
            {charUsed} karakter · {wordCount} kata
          </span>
          <div className="flex items-center space-x-3 text-gray-600 mt-2 flex-wrap">
            <div
              className="relative flex items-center space-x-1"
              onMouseEnter={() => setIsDropdownOpen(true)}
              onMouseLeave={() => setIsDropdownOpen(false)}
            >
              <span className="material-icons">people</span>
              <span>{activeUsers.length > 2 ? "2+" : activeUsers.length}</span>
              {activeUsers.length > 2 && isDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                  <div className="p-2">
                    {activeUsers.map((u, index) => (
                      <div
                        key={u.id || u.name || index}
                        className="flex items-center gap-2 px-2 py-1 text-sm hover:bg-gray-100 rounded"
                      >
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: u.color || "gray" }}
                        ></span>
                        <span>{u.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Daftar nama pengguna dengan warna (hanya jika <= 2) */}
            {activeUsers.length <= 2 &&
              activeUsers.map((u, index) => (
                <div
                  key={u.id || u.name || index}
                  className="flex items-center gap-1 px-2 py-1 bg-gray-200 rounded text-sm"
                >
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: u.color || "gray" }}
                  ></span>
                  <span>{u.name}</span>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Bagian untuk AI Summary dengan tombol refresh */}
      <div className="">
        <div className="flex items-center space-x-2 mb-4 ">
          <h3 className="text-lg font-semibold text-green-700 mr-4">
            Ringkasan oleh AI
          </h3>
          {hasAccess && (
            <button
              onClick={generateAISummary}
              className="flex items-center bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 px-3 py-1"
              title="Buat Ringkasan Otomatis dengan AI"
            >
              <span className="material-icons text-xl">refresh</span>
            </button>
          )}
        </div>
        {summary ? (
          <section className="bg-green-50 p-4 rounded">
            <p>{summary}</p>
          </section>
        ) : (
          <section className="bg-green-50 p-4 rounded">
            <p className="text-gray-500 italic">
              Klik tombol untuk menghasilkan ringkasan...
            </p>
          </section>
        )}
      </div>

      {/* Modal untuk berbagi dokumen */}
      {showShareModal && (
        <div
          style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
          className="fixed inset-0 flex items-center justify-center z-50"
        >
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Bagikan Dokumen</h3>
            <input
              type="email"
              value={shareEmail}
              onChange={(e) => {
                setShareEmail(e.target.value);
                setShareError("");
              }}
              className="w-full p-2 border border-gray-300 rounded mb-4"
              placeholder="Masukkan email penerima"
            />
            {shareError && (
              <p className="text-red-500 text-sm mb-4">{shareError}</p>
            )}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowShareModal(false);
                  setShareEmail("");
                  setShareError("");
                }}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                Batal
              </button>
              <button
                onClick={handleShareSubmit}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Bagikan
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

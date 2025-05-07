// src/pages/ListDocumentPage.jsx
import { useEffect, useState } from "react";
import io from "socket.io-client";
import httpClient from "../utils/httpClient";
import { useNavigate } from "react-router";
import Swal from "sweetalert2";
import DocumentCard from "../components/DocumentCard";
import { useAuth } from "../context/AuthContext"; // Import useAuth

const socket = io(import.meta.env.VITE_API_URL || "http://localhost:3000");

export default function ListDocumentPage() {
  const [documents, setDocuments] = useState([]);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("mydocs");

  const [showShareModal, setShowShareModal] = useState(false);
  const [shareDocumentId, setShareDocumentId] = useState(null);
  const [shareEmail, setShareEmail] = useState("");
  const [shareError, setShareError] = useState("");

  const { user } = useAuth();
  const currentUserId = user?.id;
  const navigate = useNavigate();

  // Buat dokumen baru
  const handleNew = async () => {
    try {
      const { data } = await httpClient.post("/documents", {
        content: "",
        isPublic: false,
      });
      navigate(`/documents/${data.document.id}`);
    } catch (err) {
      console.error("Gagal membuat dokumen", err);
      setError("Gagal membuat dokumen");
    }
  };

  // Handler ganti judul
  const handleRename = async (id) => {
    const currentDoc = documents.find((d) => d.id === id);
    if (!currentDoc) return;

    const { value: newTitle } = await Swal.fire({
      title: "Ganti Judul",
      input: "text",
      inputLabel: "Judul baru",
      inputValue: currentDoc.title,
      showCancelButton: true,
      confirmButtonText: "Simpan",
      cancelButtonText: "Batal",
      inputValidator: (value) => {
        if (!value.trim()) return "Judul tidak boleh kosong!";
      },
    });

    if (!newTitle || newTitle === currentDoc.title) return;

    try {
      await httpClient.patch(`/documents/${id}`, {
        title: newTitle,
      });

      setDocuments((prev) =>
        prev.map((d) => (d.id === id ? { ...d, title: newTitle } : d))
      );

      Swal.fire({
        icon: "success",
        title: "Berhasil!",
        text: "Judul berhasil diperbarui.",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (err) {
      console.error("Gagal ganti judul", err);
      Swal.fire("Gagal", "Terjadi kesalahan saat menyimpan judul", "error");
    }
  };

  // Delete dokumen
  const handleDelete = async (id) => {
    const confirm = await Swal.fire({
      title: "Yakin ingin menghapus?",
      text: "Tindakan ini tidak bisa dibatalkan!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#aaa",
      confirmButtonText: "Hapus",
      cancelButtonText: "Batal",
    });

    if (!confirm.isConfirmed) return;

    try {
      await httpClient.delete(`/documents/${id}`);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      socket.emit("documentDeleted", { documentId: id });

      Swal.fire({
        icon: "success",
        title: "Terhapus!",
        text: "Dokumen berhasil dihapus.",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (err) {
      console.error("Gagal menghapus dokumen", err);
      Swal.fire("Gagal", "Terjadi kesalahan saat menghapus dokumen", "error");
    }
  };

  // Handler buka di tab baru
  const handleOpenNewTab = (id) => {
    window.open(`${window.location.origin}/documents/${id}`, "_blank");
  };

  const handleShare = (documentId) => {
    setShareDocumentId(documentId);
    setShowShareModal(true);
  };

  const handleShareSubmit = async () => {
    if (!shareEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(shareEmail)) {
      setShareError("Masukkan email yang valid");
      return;
    }
    try {
      await httpClient.post(`/documents/${shareDocumentId}/share`, {
        email: shareEmail,
        accessLevel: "edit",
      });
      setShowShareModal(false);
      setShareEmail("");
      setShareError("");
      setShareDocumentId(null);
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

  // Fetch saat tab berubah
  useEffect(() => {
    if (!currentUserId) return;

    const fetchDocs = async () => {
      try {
        const url = activeTab === "mydocs" ? "/documents" : "/documents/shared";
        const res = await httpClient.get(url);

        const raw = Array.isArray(res.data.documents)
          ? res.data.documents
          : Array.isArray(res.data)
          ? res.data
          : [];

        const docs =
          activeTab === "mydocs"
            ? raw
                .slice()
                .sort(
                  (a, b) =>
                    new Date(b.lastAccessedAt || b.createdAt) -
                    new Date(a.lastAccessedAt || a.createdAt)
                )
            : raw;

        setDocuments(docs);
      } catch (err) {
        console.error("Gagal mengambil dokumen:", err);
        setError("Gagal memuat dokumen");
      }
    };

    fetchDocs();
  }, [activeTab, currentUserId]);

  // Real-time update
  useEffect(() => {
    if (!currentUserId || !user) return; // Ensure currentUser is not null

    const onNew = (doc) => {
      const isMydocs = activeTab === "mydocs" && doc.userId === currentUserId;
      const isSharedWithMe =
        activeTab === "sharedWithMe" &&
        (doc.sharedWith?.includes(currentUserId) ||
          doc.sharedEmails?.includes(user.email));
      if (
        (isMydocs || isSharedWithMe) &&
        !documents.some((d) => d.id === doc.id)
      ) {
        setDocuments((prev) => [doc, ...prev]);
      }
    };
    const onUpdate = (doc) => {
      setDocuments((prev) =>
        prev.map((d) => (d.id === doc.documentId ? { ...d, ...doc } : d))
      );
    };
    const onDelete = ({ documentId }) => {
      setDocuments((prev) => prev.filter((d) => d.id !== documentId));
    };

    const onShared = ({ documentId, email }) => {
      if (activeTab === "sharedWithMe" && email === user.email) {
        httpClient.get(`/documents/${documentId}`).then(({ data }) => {
          setDocuments((prev) => [data, ...prev]);
        });
      }
    };

    socket.on("newDocument", onNew);
    socket.on("documentUpdated", onUpdate);
    socket.on("documentDeleted", onDelete);
    socket.on("documentShared", onShared);

    return () => {
      socket.off("newDocument", onNew);
      socket.off("documentUpdated", onUpdate);
      socket.off("documentDeleted", onDelete);
      socket.off("documentShared", onShared);
    };
  }, [activeTab, documents, currentUserId, user]);

  if (error) {
    return <div className="text-red-500 text-center">Error: {error}</div>;
  }

  const tabs = [
    { key: "mydocs", label: "Dokumen Saya" },
    { key: "sharedWithMe", label: "Dibagikan" },
  ];

  return (
    <div className="flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div className="flex space-x-6 overflow-x-auto">
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              className={`px-2 py-1 md:px-4 md:py-2 rounded-md whitespace-nowrap ${
                activeTab === key
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-700"
              }`}
              onClick={() => setActiveTab(key)}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          onClick={handleNew}
          className="flex items-center bg-blue-600 text-white rounded-md hover:bg-blue-700 px-2 py-1 md:px-4 md:py-2"
        >
          <span className="material-icons text-lg">add</span>
          <span className="hidden md:inline ml-2 font-medium">
            Dokumen Baru
          </span>
        </button>
      </div>

      {documents.length === 0 ? (
        <p className="text-gray-500 text-center">Tidak ada dokumen.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {documents.map((doc, i) => (
            <DocumentCard
              key={doc.id ?? i}
              doc={doc}
              handleRename={handleRename}
              handleDelete={handleDelete}
              handleOpenNewTab={handleOpenNewTab}
              navigate={navigate}
              handleShare={handleShare}
            />
          ))}
        </div>
      )}

      {/* Modal Berbagi */}
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
                  setShareDocumentId(null);
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
    </div>
  );
}

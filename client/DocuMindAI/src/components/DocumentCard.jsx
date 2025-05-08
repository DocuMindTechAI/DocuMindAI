import { useEffect, useState, useRef } from "react";
import { formatDistanceToNow } from "date-fns";
import { id, enUS, fr, es, de, ja, zhCN, arSA, ptBR } from "date-fns/locale";

export default function DocumentCard({
  doc,
  handleRename,
  handleDelete,
  handleOpenNewTab,
  navigate,
  handleShare, // Tambahkan prop handleShare
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Handle klik di luar untuk kartu ini
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const stripHtml = (html) => {
    if (!html) return "";
    const doc = new DOMParser().parseFromString(html, "text/html");
    return (
      html
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim(),
      doc.body.textContent || ""
    );
  };

  // Ambil 50 karakter pertama dari konten untuk pratinjau
  const previewText = doc?.content
    ? stripHtml(doc.content).length > 50
      ? `${stripHtml(doc.content).substring(0, 50)}...`
      : stripHtml(doc.content)
    : "Tidak ada konten";

  // Deteksi bahasa pengguna dari browser
  const userLanguage = navigator.language || navigator.languages[0] || "en-US";

  // Mapping kode bahasa ke locale date-fns
  const localeMap = {
    id: id, // Bahasa Indonesia
    en: enUS, // Bahasa Inggris (default)
    "en-US": enUS, // Bahasa Inggris (Amerika)
    fr: fr, // Bahasa Prancis
    es: es, // Bahasa Spanyol
    de: de, // Bahasa Jerman
    ja: ja, // Bahasa Jepang
    "zh-CN": zhCN, // Bahasa Mandarin (Sederhana)
    "ar-SA": arSA, // Bahasa Arab (Saudi Arabia)
    "pt-BR": ptBR, // Bahasa Portugis (Brasil)
    ar: arSA, // Bahasa Arab (default)
  };

  // Pilih locale berdasarkan bahasa pengguna, fallback ke enUS jika tidak ditemukan
  const selectedLocale =
    localeMap[userLanguage] || localeMap[userLanguage.split("-")[0]] || enUS;

  // Validasi dan format tanggal terakhir diedit secara relatif
  let updatedAt = "Tanggal tidak tersedia";
  if (doc?.updatedAt) {
    const date = new Date(doc.updatedAt);
    if (!isNaN(date.getTime())) {
      // Periksa apakah tanggal valid
      updatedAt = formatDistanceToNow(date, {
        addSuffix: true,
        locale: selectedLocale,
      });
    }
  }

  return (
    <div
      className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition cursor-pointer border border-gray-200"
      onClick={(e) => {
        if (!dropdownRef.current?.contains(e.target)) {
          navigate(`/documents/${doc.id}`);
        }
      }}
    >
      <div className="flex justify-between items-start gap-2">
        <div className="flex-1">
          {/* Judul dengan Ikon Dokumen */}
          <div className="flex items-center gap-2 mb-2">
            <span className="material-icons text-gray-500 text-lg">
              description
            </span>
            <h3
              className="text-base font-semibold text-gray-800 line-clamp-1"
              title={doc?.title}
            >
              {doc?.title?.trim() ? doc.title : "Dokumen tanpa judul"}
            </h3>
          </div>

          {/* Informasi Pembuat dan Terakhir Diedit */}
          <p className="text-gray-500 text-xs mb-1">
            {doc?.creator?.username ?? "—"} • Diubah {updatedAt}
          </p>

          {/* Pratinjau Konten */}
          <p className="text-gray-400 text-xs line-clamp-2">{previewText}</p>
        </div>

        {/* Dropdown tombol titik-3 */}
        <div
          className="relative z-10"
          ref={dropdownRef}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => setIsOpen((prev) => !prev)}
            className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500"
          >
            <span className="material-icons text-sm">more_vert</span>
          </button>

          {isOpen && (
            <div className="absolute right-0 mt-1 w-36 bg-white rounded-md shadow-lg border border-gray-100 z-40">
              <button
                onClick={() => {
                  handleRename(doc.id);
                  setIsOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Ganti Judul
              </button>
              <button
                onClick={() => {
                  handleShare(doc.id);
                  setIsOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Bagikan
              </button>
              <button
                onClick={() => {
                  handleDelete(doc.id);
                  setIsOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                Hapus
              </button>
              <button
                onClick={() => {
                  handleOpenNewTab(doc.id);
                  setIsOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Buka di Tab Baru
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

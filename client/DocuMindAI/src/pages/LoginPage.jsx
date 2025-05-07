import { useState, useEffect } from "react";
import GoogleLoginButton from "../components/GoogleLoginButton";
import defaultImage from "../assets/defaultImage.png";

const LoginPage = () => {
  const [bgImage, setBgImage] = useState(defaultImage);
  const [loadingImage, setLoadingImage] = useState(true);

  useEffect(() => {
    const fetchImageFromPixabay = async () => {
      try {
        const response = await fetch(
          `https://pixabay.com/api/?key=${
            import.meta.env.VITE_PIXABAY_API_KEY
          }&q=${import.meta.env.VITE_PIXABAY_QUERY}&image_type=photo&per_page=${
            import.meta.env.VITE_PIXABAY_PER_PAGE
          }`
        );
        const data = await response.json();
        const hits = data.hits;
        if (hits && hits.length > 0) {
          const randomImage = hits[Math.floor(Math.random() * hits.length)];
          setBgImage(randomImage.largeImageURL);
        }
      } catch (error) {
        console.error("Failed to fetch image from Pixabay:", error);
      } finally {
        setLoadingImage(false);
      }
    };
    fetchImageFromPixabay();
  }, []);

  return (
    <div
      className="relative flex items-center justify-center min-h-screen w-screen bg-gradient-to-br from-gray-900 to-blue-900"
      style={{
        backgroundImage: `url(${bgImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundBlendMode: "overlay",
      }}
    >
      {loadingImage && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70 transition-opacity duration-500">
          <div className="animate-spin rounded-full h-20 w-20 border-t-4 border-blue-400"></div>
        </div>
      )}
      <div className="relative bg-white bg-opacity-95 p-10 rounded-2xl shadow-2xl max-w-md w-full mx-4 z-10 transform transition-all duration-300 hover:scale-105">
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500 to-amber-500 opacity-20 blur-md"></div>
        <h1 className="text-4xl font-extrabold text-center mb-8 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
          Welcome to DocuMindAI
        </h1>
        <div className="flex justify-center">
          <GoogleLoginButton />
        </div>
        <p className="text-center text-sm text-gray-600 mt-6">
          Sign in to unlock intelligent document insights
        </p>
      </div>
    </div>
  );
};

export default LoginPage;

// src/components/GoogleLoginButton.jsx
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import httpClient from "../utils/httpClient";
import { useAuth } from "../context/AuthContext";

export default function GoogleLoginButton() {
  const { loginSuccess } = useAuth();
  const navigate = useNavigate();
  const buttonDiv = useRef();

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    document.body.appendChild(script);

    script.onload = () => {
      /* global google */
      google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
        federated: false,
      });
      google.accounts.id.renderButton(buttonDiv.current, {
        theme: "outline",
        size: "large",
        width: 280,
      });
    };

    async function handleCredentialResponse(response) {
      try {
        const { data } = await httpClient.post("/auth/google/callback", {
          idToken: response.credential,
        });
        console.log("ID Token: " + response.credential);
        loginSuccess({
          user: data.user,
          token: data.access_token,
        }); // Panggil loginSuccess dari AuthContext
        navigate("/documents", { replace: true });
      } catch (err) {
        console.error("Google login failed:", err);
      }
    }

    return () => document.body.removeChild(script);
  }, [loginSuccess, navigate]);

  return <div ref={buttonDiv} />;
}

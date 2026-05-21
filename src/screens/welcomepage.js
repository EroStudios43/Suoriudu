import { useRef } from "react";
import "./styles/welcome.css";

function WelcomePage() {
  const bottomRef = useRef(null);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="body">
        <div className="container">
            <h1>Kokelas</h1>
            <p>Tehtävä ja koe palvelu</p>

            <div className="buttons">
                <button className="btn btn-link text-white fs-4 text-decoration-none" onClick={scrollToBottom}>
                    Opettajat
                </button>

                <button className="btn btn-link text-white fs-4 text-decoration-none" onClick={scrollToBottom}>
                    Oppilaat
                </button>
            </div>

            <div>
                <svg
                className="waves"
                viewBox="0 24 150 28"
                preserveAspectRatio="none"
                shape-rendering="auto"
                >
                <defs>
                    <path
                    id="gentle-wave"
                    d="M-160 42c30 0 58-18 88-18s 58 18 88 18 58-18 88-18 58 18 88 18 v44h-352z"
                    />
                </defs>
                <g className="parallax">
                    <use href="#gentle-wave" x="48" y="0" fill="#20294A" />
                    <use href="#gentle-wave" x="48" y="3" fill="#2B385B" />
                    <use href="#gentle-wave" x="48" y="5" fill="#525D7D" />
                    <use href="#gentle-wave" x="48" y="7" fill="#979DAD" />
                </g>
                </svg>

            </div>
        </div>
    </div>
  );
}

export default WelcomePage;
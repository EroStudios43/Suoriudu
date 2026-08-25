import React, { useEffect, useRef, useState } from "react";
import { FaceLandmarker, FilesetResolver, DrawingUtils } from "@mediapipe/tasks-vision";
import axios from "axios";
import kissaKuva from "../pictures/KissaTärkee.png";
import { useUser } from "../context/useUser.js";


const url = process.env.REACT_APP_API_URL;

const GazeTracker = ({ idexercise }) => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const { user, updateToken } = useUser();
    
    const [alertText, setAlertText] = useState("Alustetaan...");
    const [isAlert, setIsAlert] = useState(false);
    const [metrics, setMetrics] = useState({ side: "-", up: "-", gaze: "-" });

    // Cool-down ajastin DB-lähetykselle
    const lastLogTimeRef = useRef(0);
    // Rajoitetaan React-staten päivitystiheyttä (max 5krt / sekunti)
    const lastStateUpdateRef = useRef(0);

    const sendViolationToDb = async (reason) => {

        if (!user || !user.access_token) {
            console.error("Käyttäjä ei ole kirjautunut sisään!");
            return;
        }
        const now = Date.now();
        const CoolDownMS = 10000;

        if (now - lastLogTimeRef.current < CoolDownMS) {
            return;
        }

        lastLogTimeRef.current = now;
        const formattedReason = JSON.stringify(reason);

        try {
            await axios.post(
                `${url}/ai/log-violation`,
                { idexercise, reason: formattedReason },
                { headers: { Authorization: `Bearer ${user.access_token}` } }
            );
            console.log("Virheilmoitus tallennettu tietokantaan:", formattedReason);
        } catch (err) {
            console.log("Error in saving the Ai logs:", err);
        }
    };

    useEffect(() => {
        let faceLandmarker = null;
        let animationFrameId = null;
        let lastVideoTime = -1;
        let awayFrameCount = 0;
        let streamInstance = null;
        let isMounted = true;

        const setupMediaPipe = async () => {
            try {
                const filesetResolver = await FilesetResolver.forVisionTasks(
                    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
                );
                
                if (!isMounted) return;

                faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
                    baseOptions: {
                        modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
                        delegate: "GPU"
                    },
                    runningMode: "VIDEO",
                    numFaces: 1
                });

                startCamera();
            } catch (err) {
                console.error("MediaPipe-alustusvirhe:", err);
                if (isMounted) setAlertText("Kamera-alustus epäonnistui");
            }
        };

        const startCamera = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { width: 320, height: 240 }
                });
                streamInstance = stream;
                if (videoRef.current && isMounted) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.onloadedmetadata = () => {
                        videoRef.current.play();
                        predictWebcam();
                    };
                }
            } catch (err) {
                console.error("Webcam-virhe:", err);
            }
        };

        const predictWebcam = () => {
            if (!isMounted) return;

            const video = videoRef.current;
            const canvas = canvasRef.current;

            if (
                !video || 
                !canvas || 
                !faceLandmarker || 
                video.readyState < 2 || 
                video.videoWidth === 0 || 
                video.videoHeight === 0
            ) {
                animationFrameId = requestAnimationFrame(predictWebcam);
                return;
            }

            const canvasCtx = canvas.getContext("2d");
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const drawingUtils = new DrawingUtils(canvasCtx);

            if (lastVideoTime !== video.currentTime) {
                lastVideoTime = video.currentTime;
                
                try {
                    const results = faceLandmarker.detectForVideo(video, performance.now());
                    canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

                    if (results.faceLandmarks && results.faceLandmarks.length > 0) {
                        const lm = results.faceLandmarks[0];

                        // Visualisoinnit
                        drawingUtils.drawConnectors(lm, FaceLandmarker.FACE_LANDMARKS_TESSELATION, { color: "#C0C0C030", lineWidth: 1 });
                        drawingUtils.drawConnectors(lm, FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE, { color: "#FF3030", lineWidth: 1 });
                        drawingUtils.drawConnectors(lm, FaceLandmarker.FACE_LANDMARKS_LEFT_EYE, { color: "#30FF30", lineWidth: 1 });
                        drawingUtils.drawConnectors(lm, FaceLandmarker.FACE_LANDMARKS_FACE_OVAL, { color: "#E0E0E0", lineWidth: 1 });

                        [1, 468, 473].forEach((index) => {
                            const pt = lm[index];
                            canvasCtx.beginPath();
                            canvasCtx.arc(pt.x * canvas.width, pt.y * canvas.height, 3, 0, 2 * Math.PI);
                            canvasCtx.fillStyle = "blue";
                            canvasCtx.fill();
                        });

                        // Laskelmat
                        const noseX = lm[1].x;
                        const leftEdge = lm[234].x;
                        const rightEdge = lm[454].x;
                        const headTurnRatio = (noseX - leftEdge) / (rightEdge - leftEdge);
                        const isHeadTurnedSide = headTurnRatio < 0.30 || headTurnRatio > 0.70;

                        const noseY = lm[1].y;
                        const foreheadY = lm[10].y;
                        const chinY = lm[152].y;
                        const headUpRatio = (noseY - foreheadY) / (chinY - foreheadY);
                        const isHeadTurnedUp = headUpRatio < 0.45;

                        const pupilX = lm[468].x;
                        const eyeLeftCorner = lm[33].x;
                        const eyeRightCorner = lm[133].x;
                        const eyeGazeRatio = (pupilX - eyeLeftCorner) / (eyeRightCorner - eyeLeftCorner);
                        const isLookingAway = eyeGazeRatio < 0.38 || eyeGazeRatio > 0.62;

                        // Rajoitetaan DOM-päivityksiä: päivitetään numeroita ruudulle vain max 200ms välein!
                        const now = Date.now();
                        if (now - lastStateUpdateRef.current > 200) {
                            lastStateUpdateRef.current = now;
                            setMetrics({
                                side: headTurnRatio.toFixed(2),
                                up: headUpRatio.toFixed(2),
                                gaze: eyeGazeRatio.toFixed(2)
                            });
                        }

                        const rawIsAway = isHeadTurnedSide || isHeadTurnedUp || isLookingAway;
                        if (rawIsAway) {
                            awayFrameCount++;
                        } else {
                            awayFrameCount = 0;
                        }

                        if (awayFrameCount > 3) {
                            // Sanakirja suomenkielisille syille
                            const causeTranslations = {
                                HEAD_SIDE: "Pää kääntynyt sivulle",
                                HEAD_UP: "Pää nostettu ylös",
                                LOOKING_AWAY: "Katse pois ruudusta"
                            };

                            const rawReasons = [];
                            if (isHeadTurnedSide) rawReasons.push("HEAD_SIDE");
                            if (isHeadTurnedUp) rawReasons.push("HEAD_UP");
                            if (isLookingAway) rawReasons.push("LOOKING_AWAY");

                            // Luodaan taulukko objekteista: [{timestamp: ..., cause: ...}]
                            const currentTimestamp = new Date().toISOString(); // tai Date.now() tarpeen mukaan
                            const violations = rawReasons.map(key => ({
                                timestamp: currentTimestamp,
                                cause: causeTranslations[key]
                            }));

                            // UI-viesti suomeksi
                            const userFriendlyMsg = violations.map(v => v.cause).join(", ");

                            setAlertText(`⚠️ ${userFriendlyMsg.toUpperCase()}!`);
                            setIsAlert(true);

                            if (idexercise) {
                                // Lähetetään tietokantaan uusi muotoiltu lista
                                sendViolationToDb(violations);
                            }
                        } else {
                            setAlertText("Katsot ruutuun (OK)");
                            setIsAlert(false);
                        }
                    }
                } catch (err) {
                    console.error("Tunnistusvirhe:", err);
                }
            }

            animationFrameId = requestAnimationFrame(predictWebcam);
        };

        setupMediaPipe();

        return () => {
            isMounted = false;
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
            if (streamInstance) {
                streamInstance.getTracks().forEach((track) => track.stop());
            }
            if (faceLandmarker) faceLandmarker.close();
        };
    }, [idexercise]);

    return (
        /* Renderöinti pysyy samana... */
        <>
            <div 
                style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    width: "100vw",
                    height: "100vh",
                    pointerEvents: "none",
                    zIndex: 2000,
                    boxShadow: isAlert ? "inset 0 0 100px 30px rgba(255, 0, 0, 0.7)" : "none",
                    backgroundColor: isAlert ? "rgba(255, 0, 0, 0.08)" : "transparent",
                    transition: "all 0.2s ease-in-out",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center"
                }}
            >
                {isAlert && (
                    <>
                        <img 
                            src={kissaKuva}
                            alt="Kissa" 
                            style={{
                                position: "absolute",
                                bottom: "10px",
                                left: "50%",
                                transform: "translateX(-50%)",
                                height: "130%",
                                width: "auto",
                                mixBlendMode: "multiply",
                                objectFit: "contain",
                                filter: "drop-shadow(0px 0px 15px rgba(255,0,0,0.6))",
                                zIndex: 1,
                            }}
                        />
                        <div 
                            style={{
                                position: "relative",
                                zIndex: 10,
                                color: "#ff3333",
                                fontSize: "5rem",
                                fontWeight: "900",
                                letterSpacing: "8px",
                                textTransform: "uppercase",
                                textShadow: "0 0 20px rgba(255,0,0,0.8), 0 0 40px rgba(0,0,0,0.9)",
                                animation: "pulse 1s infinite alternate"
                            }}
                        >
                            FOCUS!
                        </div>
                    </>
                )}
            </div>
            <div style={{ position: "fixed", bottom: "20px", right: "20px", zIndex: 2001 }}>
                <div className="gaze-tracker-card p-3 bg-dark text-white rounded-3 shadow-lg border border-secondary" style={{ width: "320px", fontSize: "0.85rem" }}>
                    <div className="position-relative rounded overflow-hidden" style={{ width: "100%", height: "210px", backgroundColor: "#000" }}>
                        <video ref={videoRef} autoPlay playsInline muted style={{ width: "100%", height: "100%", transform: "scaleX(-1)", objectFit: "cover" }} />
                        <canvas ref={canvasRef} className="position-absolute top-0 start-0" style={{ width: "100%", height: "100%", transform: "scaleX(-1)", objectFit: "cover" }} />
                    </div>
                    <div className="mt-2 text-start">
                        <div className="d-flex justify-content-between text-muted" style={{ fontSize: "0.75rem" }}>
                            <span>Sivu: <b>{metrics.side}</b></span>
                            <span>Ylös: <b>{metrics.up}</b></span>
                            <span>Katse: <b>{metrics.gaze}</b></span>
                        </div>
                        <div className={`fw-bold mt-2 text-center fs-6 ${isAlert ? "text-danger" : "text-info"}`}>
                            {alertText}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default GazeTracker;
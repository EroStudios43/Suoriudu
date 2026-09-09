import React, { useEffect, useRef, useState } from "react";
import Konva from "konva";

const DrawingReview = ({ json }) => {
  const containerRef = useRef(null);
  const stageRef = useRef(null);
  const [stageWidth, setStageWidth] = useState(600);

  // Kuunnellaan säiliön leveyttä
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setStageWidth(containerRef.current.offsetWidth);
      }
    };

    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  useEffect(() => {
    if (!json || !containerRef.current) return;

    if (stageRef.current) {
      stageRef.current.destroy();
      stageRef.current = null;
    }

    containerRef.current.innerHTML = "";

    try {
      const parsedJson = typeof json === "string" ? JSON.parse(json) : json;

      if (parsedJson.attrs) {
        parsedJson.attrs.width = stageWidth;
      }

      const newStage = Konva.Node.create(parsedJson, containerRef.current);
      stageRef.current = newStage;
    } catch (error) {
      console.error("Virhe ladattaessa piirrosta Konva-muodossa:", error);
    }

    return () => {
      if (stageRef.current) {
        stageRef.current.destroy();
        stageRef.current = null;
      }
    };
  }, [json, stageWidth]);

  return (
    <div>
      <div
        ref={containerRef}
        style={{
          width: "100%",
          height: 450,
          border: "2px solid #ccc",
          borderRadius: "8px",
          background: "white",
          pointerEvents: "none", // Estää turhat klikkaukset katselutilassa
        }}
      />
    </div>
  );
};

export default DrawingReview;

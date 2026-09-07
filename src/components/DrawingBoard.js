import React, { useRef, useState, useEffect } from "react";
import { Stage, Layer, Line } from "react-konva";

const DrawingBoard = ({ lines = [], setLines, onSave, onRegisterGetJson }) => {
  const containerRef = useRef(null);
  const stageRef = useRef(null);

  const [stageWidth, setStageWidth] = useState(700);
  const [isDrawing, setIsDrawing] = useState(false);

  const [color, setColor] = useState("black");
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [isEraser, setIsEraser] = useState(false);

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
    if (!onRegisterGetJson) return undefined;

    onRegisterGetJson(() => stageRef.current?.toJSON() || null);
    return () => onRegisterGetJson(null);
  }, [onRegisterGetJson]);

  

  const handleMouseDown = () => {
    setIsDrawing(true);
    const pos = stageRef.current.getPointerPosition();
    if (!pos) return;
    setLines([
      ...lines,
      {
        points: [pos.x, pos.y],
        color: isEraser ? "black" : color,
        strokeWidth: isEraser ? strokeWidth * 3 : strokeWidth, 
        isEraser
      }
    ]);
  };

  const handleMouseMove = () => {
    if (!isDrawing) return;

    const stage = stageRef.current;
    const point = stage.getPointerPosition();
    if (!point) return;

    setLines(prevLines => {
      if (!Array.isArray(prevLines) || prevLines.length === 0) return prevLines;
      
      const lastLine = { ...prevLines[prevLines.length - 1] };
      lastLine.points = [...lastLine.points, point.x, point.y];

      return [...prevLines.slice(0, prevLines.length - 1), lastLine];
    });
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  const handleSaveDrawing = () => {
    if (stageRef.current && onSave) {
      const json = stageRef.current.toJSON();
      onSave(json);
    }
  };

  return (
    <div ref={containerRef} style={{ width: "100%", position: "relative", zIndex: 1 }}>
      {/* Työkalut */}
      <div style={{ marginBottom: 10 }} className="d-flex gap-2 align-items-center flex-wrap">
        <button
          type="button"
          className="btn btn-sm btn-outline-dark"
          onClick={() => { setColor("black"); setIsEraser(false); }}>
        Musta
        </button>

        <button
          type="button"
          className="btn btn-sm btn-outline-danger"
          onClick={() => { setColor("red"); setIsEraser(false); }}>
        Punainen
        </button>

        <button
          type="button"
          className="btn btn-sm btn-outline-primary"
          onClick={() => { setColor("blue"); setIsEraser(false); }}>
        Sininen
        </button>

        <button
          type="button"
          className="btn btn-sm btn-outline-success"
          onClick={() => { setColor("green"); setIsEraser(false); }}>
        Vihreä
        </button>

        <button
          type="button"
          className={`btn btn-sm ${isEraser ? "btn-warning" : "btn-outline-warning"}`}
          onClick={() => setIsEraser(true)}>
        Pyyhekumi
        </button>


        <select
          value={strokeWidth}
          onChange={(e) => setStrokeWidth(Number(e.target.value))}
          className="form-select form-select-sm"
          style={{ width: "auto" }}
        >
          <option value={2}>Ohut</option>
          <option value={4}>Normaali</option>
          <option value={8}>Paksu</option>
        </select>
      </div>


      <Stage
        width={stageWidth}
        height={400}
        ref={stageRef}
        onMouseDown={handleMouseDown}
        onMousemove={handleMouseMove}
        onMouseup={handleMouseUp}
        style={{ border: "2px solid #ccc", background: "white" }}
      >
        <Layer>
          {Array.isArray(lines) && lines.map((line, i) => (
            <Line
              key={i}
              points={line.points}
              stroke={line.color}
              strokeWidth={line.strokeWidth}
              tension={0.5}
              lineCap="round"
              lineJoin="round"
              globalCompositeOperation={
                line.isEraser ? "destination-out" : "source-over"
              }
            />
          ))}
        </Layer>
      </Stage>

      <button type="button" onClick={handleSaveDrawing} style={{ marginTop: 10 }} className="btn btn-primary mt-2 rounded-5">
        Tallenna piirros
      </button>
    </div>
  );
};

export default DrawingBoard;

import { useEffect, useRef, useState } from "react";
import { ColorSwatch, Group } from "@mantine/core";
import { Button } from "@/components/ui/button";
import axios from "axios";
import Draggable from "react-draggable";

const SWATCHES = [
  "#000000",
  "#ffffff",
  "#ee3333",
  "#e64980",
  "#be4bdb",
  "#893200",
  "#228be6",
  "#3333ee",
  "#40c057",
  "#00aa00",
  "#fab005",
  "#fd7e14",
];

interface Response {
  expr: string;
  result: string;
  assign: boolean;
}

interface GeneratedResult {
  expression: string;
  answer: string;
}

export default function Home() {
  const canvaRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState("rgb(255,255,255)");
  const [reset, setReset] = useState(false);
  const [result, setResult] = useState<GeneratedResult>();
  const [dictOfVars, setDictOfVars] = useState({});
  const [latexExpression, setLatexExpression] = useState<Array<string>>([]);
  const [latexPosition, setLatexPosition] = useState({ x: 10, y: 200 });
  const [tool, setTool] = useState<"pen" | "eraser">("pen");
  const [eraserSize, setEraserSize] = useState(30);

  useEffect(() => {
    if (reset) {
      resetCanvas();
      setLatexExpression([]);
      setResult(undefined);
      setDictOfVars({});
      setReset(false);
    }
  }, [reset]);

  useEffect(() => {
    if (latexExpression.length > 0 && window.MathJax) {
      setTimeout(() => {
        window.MathJax.Hub.Queue(["Typeset", window.MathJax.Hub]);
      }, 0);
    }
  }, [latexExpression]);

  useEffect(() => {
    if (result) {
      renderLatexToCanvas(result.expression, result.answer);
    }
  }, [result]);

  useEffect(() => {
    const canvas = canvaRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight - canvas.offsetTop;
        ctx.lineCap = "round";
        ctx.lineWidth = 3;
      }
    }
    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.9/MathJax.js?config=TeX-MML-AM_CHTML";
    script.async = true;
    document.head.appendChild(script);
    script.onload = () => {
      window.MathJax.Hub.Config({
        tex2jax: {
          inlineMath: [
            ["$", "$"],
            ["\\(", "\\)"],
          ],
          processEscapes: true,
        },
        "HTML-CSS": { linebreaks: { automatic: true } },
      });
      window.MathJax.Hub.Queue(["Typeset", window.MathJax.Hub]);
    };
    return () => {
      document.head.removeChild(script);
    };
  }, []);

  const renderLatexToCanvas = (expression: string, answer: string) => {
    const spacedExpression = expression.replace(/([a-z])([A-Z])/g, "$1 $2");
    const latex = `\\(\\LARGE{\\text{${spacedExpression}} = ${answer}}\\)`;
    setLatexExpression([...latexExpression, latex]);
    const canvas = canvaRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const sendData = async () => {
    const canvas = canvaRef.current;
    if (canvas) {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/calculate`,
        {
          image: canvas.toDataURL("image/png"),
          dict_of_vars: dictOfVars,
        }
      );
      const resp = response.data;
      resp.data.forEach((data: Response) => {
        if (data.assign) {
          setDictOfVars({ ...dictOfVars, [data.expr]: data.result });
        }
      });
      const ctx = canvas.getContext("2d");
      const imageData = ctx!.getImageData(0, 0, canvas.width, canvas.height);
      let minX = canvas.width,
        minY = canvas.height,
        maxX = 0,
        maxY = 0;
      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          if (imageData.data[(y * canvas.width + x) * 4 + 3] > 0) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      setLatexPosition({ x: centerX, y: centerY });
      resp.data.forEach((data: Response) => {
        setTimeout(() => {
          setResult({ expression: data.expr, answer: data.result });
        });
      });
    }
  };

  const resetCanvas = () => {
    const canvas = canvaRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvaRef.current;
    if (canvas) {
      canvas.style.background = "black";
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.beginPath();
        ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
        setIsDrawing(true);
      }
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = canvaRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.globalCompositeOperation = "source-over";
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvaRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        if (tool === "pen") {
          ctx.globalCompositeOperation = "source-over";
          ctx.strokeStyle = color;
          ctx.lineWidth = 3;
        } else {
          ctx.globalCompositeOperation = "destination-out";
          ctx.strokeStyle = "rgba(0,0,0,1)";
          ctx.lineWidth = eraserSize;
        }
        ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
        ctx.stroke();
      }
    }
  };

  return (
    <>
      <div className="fixed top-0 left-0 w-full flex flex-wrap items-center justify-between p-2 bg-gradient-to-r from-purple-900 via-indigo-900 to-black text-white z-20">
        <span className="text-2xl font-mono font-semibold text-white">
          Mathan<span className="text-violet-400">GO</span>
        </span>

        <Button
          onClick={() => setReset(true)}
          className="text-xs sm:text-sm bg-blue-600 text-white px-4 py-1 rounded"
        >
          Reset
        </Button>

        <Group className="flex-nowrap overflow-x-auto max-w-full gap-1">
          {SWATCHES.map((swatchColor) => (
            <ColorSwatch
              key={swatchColor}
              color={swatchColor}
              onClick={() => setColor(swatchColor)}
              style={{ cursor: "pointer" }}
            />
          ))}
        </Group>

        <div className="px-2 flex items-center gap-2 text-xs sm:text-sm">
          <label htmlFor="eraserSize" className="text-black">
            Eraser
          </label>
          <input
            type="range"
            id="eraserSize"
            min={5}
            max={100}
            value={eraserSize}
            onChange={(e) => setEraserSize(Number(e.target.value))}
            className="w-24"
          />
          <span>{eraserSize}px</span>
        </div>

        <Button
          onClick={sendData}
          className="text-xs sm:text-sm bg-blue-700 text-white px-4 py-1 rounded"
        >
          Calculate
        </Button>

        <Button
          onClick={() => setTool(tool === "pen" ? "eraser" : "pen")}
          className={`text-xs sm:text-sm px-4 py-1 rounded ${
            tool === "eraser" ? "bg-red-500 text-white" : "bg-gray-300"
          }`}
        >
          {tool === "pen" ? "Use Eraser" : "Use Pen"}
        </Button>
      </div>

      <canvas
        ref={canvaRef}
        id="canvas"
        className="fixed inset-0 w-full h-full z-10"
        onMouseDown={startDrawing}
        onMouseOut={stopDrawing}
        onMouseUp={stopDrawing}
        onMouseMove={draw}
      />

      {latexExpression &&
        latexExpression.map((latex, index) => (
          <Draggable
            key={index}
            defaultPosition={latexPosition}
            onStop={(_, data) => setLatexPosition({ x: data.x, y: data.y })}
          >
            <div className="absolute text-white text-sm sm:text-base bg-black bg-opacity-60 p-2 rounded max-w-[90vw] break-words z-30">
              <div className="latex-content my-20">{latex}</div>
            </div>
          </Draggable>
        ))}
    </>
  );
}

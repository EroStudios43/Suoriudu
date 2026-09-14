import { useState } from "react";
import axios from "axios";
import closedAgent from "../pictures/MatoAgenttiClosed.png";
import wormAgent from "../pictures/Matomies.png";
import "./AiChat.css";

const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:3001";

const emptyTask = {
  instructions: "",
  type: "essay",
  choiceMode: "single",
  options: ["", ""],
  correctAnswers: [],
  answer: "",
  points: 1
};

function parseJsonContent(content) {
  const jsonText = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/)?.[1] || content;
  return JSON.parse(jsonText.trim());
}

function parseTaskContent(content) {
  const parsed = parseJsonContent(content);
  const rawTasks = Array.isArray(parsed) ? parsed : parsed.tasks;

  if (!Array.isArray(rawTasks) || rawTasks.length === 0) {
    throw new Error("AI did not return tasks");
  }

  return {
    name: parsed.name || parsed.title || "",
    description: parsed.description || "",
    tasks: rawTasks.map((task) => ({
      ...emptyTask,
      ...task,
      instructions: String(task.instructions || ""),
      type: ["choice", "essay", "coding", "drawing"].includes(task.type) ? task.type : "essay",
      options: Array.isArray(task.options) && task.options.length >= 2 ? task.options : ["", ""],
      correctAnswers: Array.isArray(task.correctAnswers) ? task.correctAnswers : [],
      starterCode: task.type === "coding" ? String(task.starterCode || "") : undefined,
      testCases: task.type === "coding" && Array.isArray(task.testCases)
        ? task.testCases
          .filter(testCase => testCase && typeof testCase === "object")
          .map(testCase => ({
            functionName: String(testCase.functionName || ""),
            input: Array.isArray(testCase.input) ? testCase.input : [],
            expectedOutput: testCase.expectedOutput
          }))
        : undefined,
      points: Number(task.points) > 0 ? Number(task.points) : 1
    }))
  };
}

function parseCourseContent(content) {
  const parsed = parseJsonContent(content);
  const rawWeeks = Array.isArray(parsed) ? parsed : parsed.weeks;

  if (!Array.isArray(rawWeeks) || rawWeeks.length === 0) {
    throw new Error("AI did not return course weeks");
  }

  return {
    name: String(parsed.name || parsed.title || ""),
    description: String(parsed.description || parsed.course_description || ""),
    weeks: rawWeeks.map((week, index) => ({
      id: Date.now() + index,
      title: String(week.title || `Viikko ${index + 1}`),
      expanded: index === 0,
      content: String(week.content || ""),
      exercises: []
    }))
  };
}

export default function AiChat({ onTasksGenerated, onCourseGenerated, mode = "tasks" }) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);

  const sendMessage = async () => {
    if (!message.trim()) return;

    const request = message.trim();
    setMessages((current) => [...current, { role: "user", text: request }]);
    setMessage("");
    setLoading(true);
    setError("");

    try {
      const prompt = mode === "course"
        ? `Luo opettajalle kurssin runko tämän pyynnön perusteella: ${request}

Palauta vain validi JSON tässä muodossa:
{
  "name": "kurssin nimi",
  "description": "kurssin lyhyt kuvaus",
  "weeks": [
    {
      "title": "Viikko 1: aihe",
      "content": "viikon tärkeimmät aiheet, tavoitteet ja materiaalin kuvaus"
    }
  ]
}
Luo pyydetty määrä viikkoja, jos määrä annetaan. Älä luo tehtäviä tai kokeita. Älä lisää markdownia tai selityksiä.`
        
: `Luo opettajalle tehtäväpaketti tämän pyynnön perusteella: ${request}

Palauta vain validi JSON tässä muodossa:
{
  "name": "lyhyt nimi",
  "description": "lyhyt kuvaus",
  "tasks": [
    {
      "instructions": "tehtävänanto",
      "type": "choice | essay | coding | drawing",
      "choiceMode": "single | multiple",
      "options": ["vaihtoehto 1", "vaihtoehto 2"],
      "correctAnswers": [0],
      "answer": "opettajan mahdolliset vastausohjeet",
      "starterCode": "function add(a, b) {\\n  // Write your code here\\n}",
      "testCases": [
        {
          "functionName": "add",
          "input": [2, 3],
          "expectedOutput": 5
        }
      ],
      "points": 1
    }
  ]
}
Tee useita tehtäviä, jos pyynnössä niitä pyydetään. Choice-tehtävissä anna vähintään kaksi vaihtoehtoa ja oikeat indeksit correctAnswers-kenttään. Jos tehtävä on coding, täytä aina starterCode ja testCases. starterCodeen kirjoitetaan JavaScript-funktion runko, jonka oppilas täydentää. Jokaisessa testCasessa pitää olla functionName, input-taulukko ja expectedOutput. Käytä samaa functionName-arvoa kuin starterCodeen määritellyllä funktiolla ja anna vähintään kolme mielekästä testiä, mukaan lukien tavallinen, reunatapaus ja negatiivinen tai tyhjä syöte kun ne sopivat tehtävään. Älä lisää markdownia tai selityksiä.`;

      const response = await axios.post(`${apiUrl}/ai`, {
        prompt
      });

      const aiMessage = response.data.choices[0].message.content;

      if (mode === "course") {
        const generated = parseCourseContent(aiMessage);
        onCourseGenerated(generated);
        setMessages((current) => [...current, {
          role: "assistant",
          text: `Valmis! Täytin lomakkeelle kurssin ja ${generated.weeks.length} viikkoa. Tarkista tiedot ja tallenna vasta, kun olet tyytyväinen.`
        }]);
      } else {
        const generated = parseTaskContent(aiMessage);
        onTasksGenerated(generated);
        setMessages((current) => [...current, {
          role: "assistant",
          text: `Valmis! Täytin lomakkeelle ${generated.tasks.length} tehtävää. Tarkista ne ja tallenna vasta, kun olet tyytyväinen.`
        }]);
      }

    } catch (err) {
      console.error(err);
      setError("AI ei vastannut. Tarkista backend.");
      setMessages((current) => [...current, { role: "assistant", text: "En saanut muodostettua tehtäviä. Kokeile tarkentaa pyyntöä." }]);
    }

    setLoading(false);
  };

  return <>
    {!isOpen && <button className="ai-chat-launcher" onClick={() => setIsOpen(true)} aria-label="Avaa Manu Matoagentti">
      <img src={closedAgent} alt="Avaa Manu Matoagentti" />
    </button>}
    {isOpen && <aside className="ai-chat-panel" aria-label="Manu Matoagentti">
      <div className="ai-chat-header"><strong>Manu Matoagentti</strong><button className="ai-chat-close" onClick={() => setIsOpen(false)} aria-label="Sulje chat">x</button></div>
      <div className="ai-chat-messages">
        {messages.length === 0 && <div className="ai-chat-welcome"><img src={wormAgent} alt="Manu Matoagentti" /><p>Hei! Olen Manu matoagentti ja autan mielelläni tehtävien luomisessa! Voinko auttaa jotenkin?</p></div>}
        {messages.map((item, index) => <div key={`${item.role}-${index}`} className={`ai-chat-bubble ${item.role}`}>{item.text}</div>)}
        {loading && <div className="ai-chat-loading"><span /> Manu rakentaa {mode === "course" ? "kurssia" : "tehtäviä"}...</div>}
      </div>
      <form className="ai-chat-form" onSubmit={(event) => { event.preventDefault(); sendMessage(); }}>
        <textarea value={message} onChange={(event) => setMessage(event.target.value)} disabled={loading} placeholder={mode === "course" ? "Esim. Luo 6 viikon kurssi aiheesta matematiikan perusteet" : "Esim. Luo viisi matematiikan tehtävää murtoluvuista"} rows="3" />
        <button type="submit" disabled={loading || !message.trim()}>{loading ? "Luodaan..." : "Lähetä"}</button>
        {error && <p className="ai-chat-error">{error}</p>}
      </form>
    </aside>}
    {loading && <div className="ai-chat-lock" aria-label="Tehtäviä luodaan" />}
  </>;
}
